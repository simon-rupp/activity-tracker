import Link from "next/link";
import { redirect } from "next/navigation";

import { clearSessionCookie } from "@/lib/auth";

const links = [
  { href: "/", label: "Calendar" },
];

async function logoutAction() {
  "use server";

  await clearSessionCookie();
  redirect("/login");
}

type MainNavProps = {
  userEmail: string;
};

export function MainNav({ userEmail }: MainNavProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <p className="text-sm text-slate-600">{userEmail}</p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Log Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
