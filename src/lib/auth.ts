import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  getAuthConfigError,
  getUserIdFromSessionToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth-session";
import { prisma } from "@/lib/prisma";

export type AuthUser = {
  id: number;
  email: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (getAuthConfigError()) {
    return null;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const userId = getUserIdFromSessionToken(token);
  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (!user || !user.emailVerifiedAt) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
  };
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function setSessionCookie(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(userId),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
