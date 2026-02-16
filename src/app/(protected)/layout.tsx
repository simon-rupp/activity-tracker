import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MainNav } from "@/components/main-nav";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-session";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!isValidSessionToken(token)) {
    redirect("/unlock");
  }

  return (
    <div className="min-h-screen">
      <MainNav />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
