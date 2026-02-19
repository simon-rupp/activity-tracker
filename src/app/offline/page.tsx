import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">You are offline</h1>
        <p className="mt-3 text-sm text-slate-600">
          Activity Tracker cannot load this page without an internet connection.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Reconnect and try again.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Retry
        </Link>
      </section>
    </main>
  );
}
