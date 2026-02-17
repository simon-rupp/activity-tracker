import bcrypt from "bcryptjs";
import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "activity_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function isBcryptHash(value: string): boolean {
  try {
    return Number.isInteger(bcrypt.getRounds(value));
  } catch {
    return false;
  }
}

function readEnv(name: "APP_SESSION_SECRET" | "APP_PASSCODE_HASH"): string | null {
  const value = process.env[name];
  return value ? value : null;
}

function signPayload(payload: string): string | null {
  const secret = readEnv("APP_SESSION_SECRET");
  if (!secret) {
    return null;
  }

  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function isAuthConfigured(): boolean {
  return getAuthConfigError() === null;
}

export function getAuthConfigError(): string | null {
  const secret = readEnv("APP_SESSION_SECRET");
  const hash = readEnv("APP_PASSCODE_HASH");

  if (!secret) {
    return "APP_SESSION_SECRET is missing.";
  }

  if (!hash) {
    return "APP_PASSCODE_HASH is missing.";
  }

  if (!isBcryptHash(hash)) {
    return "APP_PASSCODE_HASH is malformed. In .env, escape each $ as \\$.";
  }

  return null;
}

export function createSessionToken(): string {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
  });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  if (!signature) {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }

  return `${encodedPayload}.${signature}`;
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!expectedSignature) {
    return false;
  }

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as {
      exp?: number;
    };

    return typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export async function verifyPasscode(passcode: string): Promise<boolean> {
  const hash = readEnv("APP_PASSCODE_HASH");
  if (!hash) {
    return false;
  }

  if (!isBcryptHash(hash)) {
    return false;
  }

  return bcrypt.compare(passcode, hash);
}
