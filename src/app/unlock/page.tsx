import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  createSessionToken,
  isAuthConfigured,
  isValidSessionToken,
  SESSION_COOKIE_NAME,
  verifyPasscode,
} from "@/lib/auth-session";

type UnlockPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function unlockAction(formData: FormData) {
  "use server";

  if (!isAuthConfigured()) {
    redirect("/unlock?error=config");
  }

  const passcode = formData.get("passcode");

  if (typeof passcode !== "string" || !(await verifyPasscode(passcode))) {
    redirect("/unlock?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: createSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/");
}

export default async function UnlockPage({ searchParams }: UnlockPageProps) {
  const isConfigured = isAuthConfigured();
  const cookieStore = await cookies();
  const activeToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (isConfigured && isValidSessionToken(activeToken)) {
    redirect("/");
  }

  const params = await searchParams;
  const error =
    params.error === "config"
      ? "Set APP_PASSCODE_HASH and APP_SESSION_SECRET in .env."
      : params.error
        ? "Invalid passcode."
        : null;
  const setupMessage = !isConfigured
    ? "Set APP_PASSCODE_HASH and APP_SESSION_SECRET in .env to enable unlock."
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Unlock Tracker</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your passcode to access lifts and runs.
        </p>

        <form action={unlockAction} className="mt-5 space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Passcode</span>
            <input
              type="password"
              name="passcode"
              required
              autoFocus
              disabled={!isConfigured}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {setupMessage ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {setupMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isConfigured}
            className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Unlock
          </button>
        </form>
      </section>
    </main>
  );
}
