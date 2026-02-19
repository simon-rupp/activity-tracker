import Link from "next/link";
import { redirect } from "next/navigation";

import { clearSessionCookie } from "@/lib/auth";

const links = [
  { href: "/", label: "Calendar" },
  { href: "/summary", label: "Summary" },
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
  const userEmailLocalPart = userEmail.split("@")[0] ?? userEmail;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:justify-between">
        <div className="order-2 flex w-full flex-wrap items-center gap-2 sm:order-1 sm:w-auto">
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

        <div className="order-1 ml-auto flex items-center gap-2 sm:order-2 sm:ml-0">
          <p className="max-[359px]:hidden max-w-[12rem] truncate text-right text-sm text-slate-600">
            <span className="sm:hidden">{userEmailLocalPart}</span>
            <span className="hidden sm:inline">{userEmail}</span>
          </p>
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
