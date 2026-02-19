import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { sendEmailVerificationEmail } from "@/lib/auth-email";
import { getCurrentUser, setSessionCookie } from "@/lib/auth";
import { getAuthConfigError } from "@/lib/auth-session";
import { getEmailConfigError } from "@/lib/email";
import { getGoogleOAuthConfigError } from "@/lib/google-oauth";
import { prisma } from "@/lib/prisma";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    email?: string;
    verification?: string;
    reset?: string;
  }>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loginAction(formData: FormData) {
  "use server";

  if (getAuthConfigError()) {
    redirect("/login?error=config");
  }

  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  if (typeof emailValue !== "string" || typeof passwordValue !== "string") {
    redirect("/login?error=invalid");
  }

  const email = normalizeEmail(emailValue);
  const password = passwordValue;
  if (!isValidEmail(email) || password.length === 0) {
    redirect("/login?error=invalid");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
      passwordHash: true,
    },
  });

  if (!user) {
    redirect("/login?error=invalid");
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    redirect("/login?error=invalid");
  }

  if (!user.emailVerifiedAt) {
    redirect(`/login?error=unverified&email=${encodeURIComponent(user.email)}`);
  }

  await setSessionCookie(user.id);
  redirect("/");
}

async function resendVerificationAction(formData: FormData) {
  "use server";

  if (getEmailConfigError()) {
    redirect("/login?error=email-config");
  }

  const emailValue = formData.get("email");
  if (typeof emailValue !== "string") {
    redirect("/login?verification=resent");
  }

  const email = normalizeEmail(emailValue);
  if (!isValidEmail(email)) {
    redirect("/login?verification=resent");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (user && !user.emailVerifiedAt) {
    try {
      await sendEmailVerificationEmail(user.id, user.email);
    } catch {
      redirect("/login?error=email-send");
    }
  }

  redirect("/login?verification=resent");
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const authConfigError = getAuthConfigError();
  const emailConfigError = getEmailConfigError();
  const googleConfigError = getGoogleOAuthConfigError();
  const canUseGoogleOAuth = !googleConfigError;
  const emailForResend =
    typeof params.email === "string" && isValidEmail(params.email)
      ? normalizeEmail(params.email)
      : null;
  const errorMessage =
    params.error === "config"
      ? authConfigError ?? "APP_SESSION_SECRET is missing."
      : params.error === "google-config"
        ? googleConfigError ?? "Google sign-in is not configured."
      : params.error === "google-state"
        ? "Google sign-in session expired. Try again."
      : params.error === "google-denied"
        ? "Google sign-in was canceled."
      : params.error === "google-unverified"
        ? "Your Google account email is not verified."
      : params.error === "google-link"
        ? "This email is already linked to a different Google account."
      : params.error === "google-auth"
        ? "Google sign-in failed. Try again."
      : params.error === "email-config"
        ? emailConfigError ?? "Email delivery is not configured."
      : params.error === "email-send"
        ? "Could not send verification email. Try again."
        : params.error === "unverified"
          ? "Email not verified yet."
      : params.error
        ? "Invalid email or password."
        : null;
  const setupMessage = authConfigError && !params.error ? authConfigError : null;
  const statusMessage =
    params.verification === "sent"
      ? "Check your inbox to verify your email before logging in."
      : params.verification === "resent"
        ? "If an unverified account exists for that email, a new verification link was sent."
        : params.reset === "success"
          ? "Password updated. You can log in now."
          : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Log In</h1>
        <p className="mt-2 text-sm text-slate-600">Sign in to your activity tracker account.</p>

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

        <form action={loginAction} className={`${canUseGoogleOAuth ? "mt-4" : "mt-5"} space-y-4`}>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              required
              autoFocus
              disabled={Boolean(authConfigError)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              name="password"
              required
              disabled={Boolean(authConfigError)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          {statusMessage ? (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {statusMessage}
            </p>
          ) : null}

          {setupMessage ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {setupMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={Boolean(authConfigError)}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Log In
          </button>
        </form>

        {params.error === "unverified" && emailForResend ? (
          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <p className="mb-2">Need a new verification link?</p>
            <form action={resendVerificationAction}>
              <input type="hidden" name="email" value={emailForResend} />
              <button
                type="submit"
                disabled={Boolean(emailConfigError)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Resend Verification Email
              </button>
            </form>
          </div>
        ) : null}

        <p className="mt-3 text-sm text-slate-600">
          Forgot your password?{" "}
          <Link href="/forgot-password" className="font-medium text-slate-900 underline">
            Reset it
          </Link>
        </p>

        <p className="mt-4 text-sm text-slate-600">
          Need an account?{" "}
          <Link href="/signup" className="font-medium text-slate-900 underline">
            Sign up
          </Link>
        </p>
      </section>
    </main>
  );
}
