import crypto from "node:crypto";

export const SESSION_COOKIE_NAME = "activity_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function readEnv(name: "APP_SESSION_SECRET"): string | null {
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

export function getAuthConfigError(): string | null {
  const secret = readEnv("APP_SESSION_SECRET");
  if (!secret) {
    return "APP_SESSION_SECRET is missing.";
  }

  return null;
}

export function createSessionToken(userId: number): string {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user ID.");
  }

  const payload = JSON.stringify({
    userId,
    exp: Date.now() + SESSION_DURATION_SECONDS * 1000,
  });
  const encodedPayload = Buffer.from(payload, "utf8").toString("base64url");
  const signature = signPayload(encodedPayload);
  if (!signature) {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }

  return `${encodedPayload}.${signature}`;
}

export function getUserIdFromSessionToken(token: string | undefined): number | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!expectedSignature) {
    return null;
  }

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as {
      userId?: number;
      exp?: number;
    };

    if (typeof payload.exp !== "number" || payload.exp <= Date.now()) {
      return null;
    }

    if (!Number.isInteger(payload.userId) || payload.userId <= 0) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}
