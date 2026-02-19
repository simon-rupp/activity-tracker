import Link from "next/link";

import { verifyEmailFromToken } from "@/lib/auth-email";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token.trim() : "";

  const status = token ? await verifyEmailFromToken(token) : "invalid";
  const message =
    status === "success"
      ? "Your email has been verified. You can now log in."
      : status === "already-verified"
        ? "This email is already verified."
        : status === "expired"
          ? "This verification link has expired."
          : "Invalid verification link.";

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Email Verification</h1>
        <p className="mt-3 text-sm text-slate-700">{message}</p>
        <p className="mt-4 text-sm text-slate-600">
          Continue to{" "}
          <Link href="/login" className="font-medium text-slate-900 underline">
            Log in
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
