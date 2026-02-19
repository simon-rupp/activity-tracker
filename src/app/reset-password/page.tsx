import bcrypt from "bcryptjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  isPasswordResetTokenValid,
  resetPasswordFromToken,
} from "@/lib/auth-email";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
};

async function resetPasswordAction(formData: FormData) {
  "use server";

  const tokenValue = formData.get("token");
  const passwordValue = formData.get("password");
  const confirmPasswordValue = formData.get("confirmPassword");

  if (
    typeof tokenValue !== "string" ||
    typeof passwordValue !== "string" ||
    typeof confirmPasswordValue !== "string"
  ) {
    redirect("/reset-password?error=invalid");
  }

  const token = tokenValue.trim();
  const password = passwordValue;
  const confirmPassword = confirmPasswordValue;

  if (!token || password.length < 8 || password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=invalid`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await resetPasswordFromToken(token, passwordHash);

  if (result !== "success") {
    redirect(`/reset-password?error=${result}`);
  }

  redirect("/login?reset=success");
}

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const hasToken = Boolean(token);
  const isValidToken = hasToken ? await isPasswordResetTokenValid(token) : false;

  const errorMessage =
    params.error === "expired"
      ? "This password reset link has expired. Request a new one."
      : params.error
        ? "Invalid password reset request."
        : null;

  if (!hasToken || !isValidToken) {
    const invalidMessage = errorMessage ?? "This password reset link is invalid or expired.";
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm text-slate-600">{invalidMessage}</p>
          <p className="mt-4 text-sm text-slate-600">
            Request a new link on{" "}
            <Link href="/forgot-password" className="font-medium text-slate-900 underline">
              Forgot Password
            </Link>
            .
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Set New Password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose a new password with at least 8 characters.
        </p>

        <form action={resetPasswordAction} className="mt-5 space-y-4">
          <input type="hidden" name="token" value={token} />

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">New Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoFocus
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
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {errorMessage ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Update Password
          </button>
        </form>
      </section>
    </main>
  );
}
