import "server-only";

import crypto from "node:crypto";

const GOOGLE_AUTHORIZATION_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USER_INFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_SCOPES = ["openid", "email", "profile"] as const;

export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "google_oauth_state";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
};

export type GoogleOAuthUser = {
  subject: string;
  email: string;
  emailVerified: boolean;
};

function readEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET"): string | null {
  const value = process.env[name];
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = readEnv("GOOGLE_CLIENT_ID");
  const clientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return null;
  }

  return { clientId, clientSecret };
}

export function getGoogleOAuthConfigError(): string | null {
  const missing: string[] = [];

  if (!readEnv("GOOGLE_CLIENT_ID")) {
    missing.push("GOOGLE_CLIENT_ID");
  }
  if (!readEnv("GOOGLE_CLIENT_SECRET")) {
    missing.push("GOOGLE_CLIENT_SECRET");
  }

  if (missing.length === 0) {
    return null;
  }

  const verb = missing.length === 1 ? "is" : "are";
  return `${missing.join(" and ")} ${verb} missing.`;
}

export function createGoogleOAuthState(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function createGoogleAuthorizationUrl(
  config: GoogleOAuthConfig,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    state,
    prompt: "select_account",
  });

  return `${GOOGLE_AUTHORIZATION_URL}?${params.toString()}`;
}

type GoogleTokenResponse = {
  access_token?: string;
};

type GoogleUserInfoResponse = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
};

export async function exchangeGoogleCodeForUser(
  config: GoogleOAuthConfig,
  redirectUri: string,
  code: string,
): Promise<GoogleOAuthUser> {
  const tokenParams = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: tokenParams,
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    throw new Error("Failed to exchange Google authorization code.");
  }

  let tokenPayload: GoogleTokenResponse;
  try {
    tokenPayload = (await tokenResponse.json()) as GoogleTokenResponse;
  } catch {
    throw new Error("Invalid token response from Google.");
  }

  if (!tokenPayload.access_token) {
    throw new Error("Google token response did not include an access token.");
  }

  const userInfoResponse = await fetch(GOOGLE_USER_INFO_URL, {
    headers: {
      Authorization: `Bearer ${tokenPayload.access_token}`,
    },
    cache: "no-store",
  });

  if (!userInfoResponse.ok) {
    throw new Error("Failed to fetch Google user profile.");
  }

  let userInfo: GoogleUserInfoResponse;
  try {
    userInfo = (await userInfoResponse.json()) as GoogleUserInfoResponse;
  } catch {
    throw new Error("Invalid Google user profile response.");
  }

  const subject = typeof userInfo.sub === "string" ? userInfo.sub : null;
  const email =
    typeof userInfo.email === "string" ? userInfo.email.trim().toLowerCase() : null;

  if (!subject || !email) {
    throw new Error("Google user profile was missing required fields.");
  }

  return {
    subject,
    email,
    emailVerified: userInfo.email_verified === true,
  };
}
