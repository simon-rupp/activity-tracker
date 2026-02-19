import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { sendEmailVerificationEmail } from "@/lib/auth-email";
import { getCurrentUser } from "@/lib/auth";
import { getAuthConfigError } from "@/lib/auth-session";
import { getEmailConfigError } from "@/lib/email";
import { getGoogleOAuthConfigError } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function signUpAction(formData: FormData) {
  "use server";

  if (getAuthConfigError()) {
    redirect("/signup?error=config");
  }
  if (getEmailConfigError()) {
    redirect("/signup?error=email-config");
  }

  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const confirmPasswordValue = formData.get("confirmPassword");

  if (
    typeof emailValue !== "string" ||
    typeof passwordValue !== "string" ||
    typeof confirmPasswordValue !== "string"
  ) {
    redirect("/signup?error=invalid");
  }

  const email = normalizeEmail(emailValue);
  const password = passwordValue;
  const confirmPassword = confirmPasswordValue;

  if (!isValidEmail(email) || password.length < 8 || password !== confirmPassword) {
    redirect("/signup?error=invalid");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  let userId: number;
  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
      select: {
        id: true,
      },
    });
    userId = user.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/signup?error=exists");
    }

    throw error;
  }

  try {
    await sendEmailVerificationEmail(userId, email);
  } catch {
    redirect("/signup?error=email-send");
  }

  redirect("/login?verification=sent");
}

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const authConfigError = getAuthConfigError();
  const emailConfigError = getEmailConfigError();
  const googleConfigError = getGoogleOAuthConfigError();
  const canUseGoogleOAuth = !googleConfigError;

  const errorMessage =
    params.error === "config"
      ? authConfigError ?? "APP_SESSION_SECRET is missing."
      : params.error === "email-config"
        ? emailConfigError ?? "Email delivery is not configured."
      : params.error === "email-send"
        ? "Could not send verification email. Try again."
        : params.error === "exists"
        ? "An account with that email already exists."
        : params.error
          ? "Use a valid email and a password with at least 8 characters."
          : null;
  const setupMessage =
    params.error
      ? null
      : authConfigError
        ? authConfigError
        : emailConfigError
          ? emailConfigError
          : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Create Account</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign up to start tracking your lifts and runs.
        </p>

        {canUseGoogleOAuth ? (
          <>
            <Link
              href="/auth/google"
              className="mt-5 flex w-full items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              Continue with Google
            </Link>
            <div className="mt-4 flex items-center gap-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </>
        ) : null}

        <form action={signUpAction} className={`${canUseGoogleOAuth ? "mt-4" : "mt-5"} space-y-4`}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              required
              autoFocus
              disabled={Boolean(authConfigError || emailConfigError)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              disabled={Boolean(authConfigError || emailConfigError)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Confirm Password</span>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              disabled={Boolean(authConfigError || emailConfigError)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {setupMessage ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {setupMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={Boolean(authConfigError || emailConfigError)}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Sign Up
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-slate-900 underline">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
