import { NextResponse } from "next/server";

import {
  createGoogleAuthorizationUrl,
  createGoogleOAuthState,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/google-oauth";

function buildLoginErrorUrl(request: Request, error: string): URL {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  return loginUrl;
}

export async function GET(request: Request) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.redirect(buildLoginErrorUrl(request, "google-config"));
  }

  const state = createGoogleOAuthState();
  const redirectUri = new URL("/auth/google/callback", request.url).toString();
  const authorizationUrl = createGoogleAuthorizationUrl(config, redirectUri, state);

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set({
    name: GOOGLE_OAUTH_STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/google/callback",
    maxAge: 60 * 10,
  });

  return response;
}
