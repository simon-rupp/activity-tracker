import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
} from "@/lib/auth-session";
import {
  exchangeGoogleCodeForUser,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_STATE_COOKIE_NAME,
} from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

function buildLoginErrorUrl(request: Request, error: string): URL {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("error", error);
  return loginUrl;
}

function buildErrorResponse(request: Request, error: string): NextResponse {
  const response = NextResponse.redirect(buildLoginErrorUrl(request, error));
  response.cookies.delete({
    name: GOOGLE_OAUTH_STATE_COOKIE_NAME,
    path: "/auth/google/callback",
  });
  return response;
}

async function resolveUserIdFromGoogleProfile(subject: string, email: string): Promise<number> {
  const userByGoogleSubject = await prisma.user.findUnique({
    where: { googleSubject: subject },
    select: {
      id: true,
      emailVerifiedAt: true,
    },
  });

  if (userByGoogleSubject) {
    if (!userByGoogleSubject.emailVerifiedAt) {
      await prisma.user.update({
        where: { id: userByGoogleSubject.id },
        data: {
          emailVerifiedAt: new Date(),
        },
      });
    }

    return userByGoogleSubject.id;
  }

  const userByEmail = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      googleSubject: true,
      emailVerifiedAt: true,
    },
  });

  if (userByEmail) {
    if (userByEmail.googleSubject && userByEmail.googleSubject !== subject) {
      throw new Error("Email is already linked to a different Google account.");
    }

    await prisma.user.update({
      where: { id: userByEmail.id },
      data: {
        googleSubject: subject,
        emailVerifiedAt: userByEmail.emailVerifiedAt ?? new Date(),
      },
    });

    return userByEmail.id;
  }

  const generatedPasswordHash = await bcrypt.hash(
    crypto.randomBytes(32).toString("base64url"),
    12,
  );
  const createdUser = await prisma.user.create({
    data: {
      email,
      googleSubject: subject,
      emailVerifiedAt: new Date(),
      passwordHash: generatedPasswordHash,
    },
    select: {
      id: true,
    },
  });

  return createdUser.id;
}

export async function GET(request: Request) {
  const config = getGoogleOAuthConfig();
  if (!config) {
    return buildErrorResponse(request, "google-config");
  }

  const requestUrl = new URL(request.url);
  const oauthError = requestUrl.searchParams.get("error");
  if (oauthError) {
    return buildErrorResponse(request, "google-denied");
  }

  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  if (!code || !state) {
    return buildErrorResponse(request, "google-auth");
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE_NAME)?.value;
  if (!stateCookie || stateCookie !== state) {
    return buildErrorResponse(request, "google-state");
  }

  let userId: number;
  try {
    const redirectUri = new URL("/auth/google/callback", request.url).toString();
    const profile = await exchangeGoogleCodeForUser(config, redirectUri, code);
    if (!profile.emailVerified) {
      return buildErrorResponse(request, "google-unverified");
    }

    userId = await resolveUserIdFromGoogleProfile(profile.subject, profile.email);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Email is already linked to a different Google account."
    ) {
      return buildErrorResponse(request, "google-link");
    }

    return buildErrorResponse(request, "google-auth");
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.delete({
    name: GOOGLE_OAUTH_STATE_COOKIE_NAME,
    path: "/auth/google/callback",
  });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(userId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });

  return response;
}
