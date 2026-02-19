import "server-only";

import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getAppBaseUrl, sendEmail } from "@/lib/email";

const EMAIL_VERIFICATION_TOKEN_TTL_MS = 1000 * 60 * 60 * 24;
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60;

function createRawToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function buildUrl(pathname: string, token: string): string {
  const baseUrl = getAppBaseUrl();
  const params = new URLSearchParams({ token });
  return `${baseUrl}${pathname}?${params.toString()}`;
}

export async function sendEmailVerificationEmail(
  userId: number,
  email: string,
): Promise<void> {
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.deleteMany({
      where: { userId },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  const verifyUrl = buildUrl("/verify-email", rawToken);
  await sendEmail({
    to: email,
    subject: "Verify your Activity Tracker account",
    html: `
      <p>Welcome to Activity Tracker.</p>
      <p>Please verify your email by clicking the link below:</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export type VerifyEmailTokenResult = "success" | "invalid" | "expired" | "already-verified";

export async function verifyEmailFromToken(rawToken: string): Promise<VerifyEmailTokenResult> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!token) {
    return "invalid";
  }

  if (token.expiresAt <= new Date()) {
    await prisma.emailVerificationToken.delete({
      where: { id: token.id },
    });
    return "expired";
  }

  if (token.user.emailVerifiedAt) {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: token.userId },
    });
    return "already-verified";
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: token.userId },
      data: {
        emailVerifiedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.deleteMany({
      where: { userId: token.userId },
    });
  });

  return "success";
}

export async function sendPasswordResetEmail(userId: number, email: string): Promise<void> {
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: { userId },
    });

    await tx.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  const resetUrl = buildUrl("/reset-password", rawToken);
  await sendEmail({
    to: email,
    subject: "Reset your Activity Tracker password",
    html: `
      <p>We received a request to reset your password.</p>
      <p>Use the link below to set a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link expires in 1 hour.</p>
    `,
  });
}

export async function isPasswordResetTokenValid(rawToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
    },
  });

  return Boolean(token && token.expiresAt > new Date());
}

export type ResetPasswordWithTokenResult = "success" | "invalid" | "expired";

export async function resetPasswordFromToken(
  rawToken: string,
  passwordHash: string,
): Promise<ResetPasswordWithTokenResult> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
    },
  });

  if (!token) {
    return "invalid";
  }

  if (token.expiresAt <= new Date()) {
    await prisma.passwordResetToken.delete({
      where: { id: token.id },
    });
    return "expired";
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: token.userId },
      data: {
        passwordHash,
      },
    });

    await tx.passwordResetToken.deleteMany({
      where: { userId: token.userId },
    });
  });

  return "success";
}
