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
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <p className="hidden max-w-[8rem] truncate text-right text-sm text-slate-600 sm:block lg:max-w-[12rem]">
            <span className="hidden lg:inline">{userEmail}</span>
            <span className="lg:hidden">{userEmailLocalPart}</span>
          </p>
          <form action={logoutAction}>
            <button
              type="submit"
              className="whitespace-nowrap rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            >
              Log Out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
