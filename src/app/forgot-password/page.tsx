import Link from "next/link";
import { redirect } from "next/navigation";

import { sendPasswordResetEmail } from "@/lib/auth-email";
import { getCurrentUser } from "@/lib/auth";
import { getEmailConfigError } from "@/lib/email";
import { prisma } from "@/lib/prisma";

type ForgotPasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    sent?: string;
  }>;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function sendResetEmailAction(formData: FormData) {
  "use server";

  if (getEmailConfigError()) {
    redirect("/forgot-password?error=config");
  }

  const emailValue = formData.get("email");
  if (typeof emailValue !== "string") {
    redirect("/forgot-password?sent=1");
  }

  const email = normalizeEmail(emailValue);
  if (!isValidEmail(email)) {
    redirect("/forgot-password?sent=1");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      emailVerifiedAt: true,
    },
  });

  if (user && user.emailVerifiedAt) {
    try {
      await sendPasswordResetEmail(user.id, user.email);
    } catch {
      redirect("/forgot-password?error=send");
    }
  }

  redirect("/forgot-password?sent=1");
}

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const params = await searchParams;
  const emailConfigError = getEmailConfigError();
  const errorMessage =
    params.error === "config"
      ? emailConfigError ?? "Email delivery is not configured."
      : params.error === "send"
        ? "Could not send reset email. Try again."
      : null;
  const statusMessage =
    params.sent === "1"
      ? "If an account exists for that email, a reset link has been sent."
      : null;
  const setupMessage = !params.error && emailConfigError ? emailConfigError : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your email and we&apos;ll send you a reset link.
        </p>

        <form action={sendResetEmailAction} className="mt-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              required
              autoFocus
              disabled={Boolean(emailConfigError)}
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
            disabled={Boolean(emailConfigError)}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            Send Reset Link
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-600">
          Back to{" "}
          <Link href="/login" className="font-medium text-slate-900 underline">
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}
