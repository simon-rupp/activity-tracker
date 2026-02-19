import { MainNav } from "@/components/main-nav";
import { TimeZoneCookieSync } from "@/components/time-zone-cookie-sync";
import { requireCurrentUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireCurrentUser();

  return (
    <div className="min-h-screen">
      <MainNav userEmail={user.email} />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
      <TimeZoneCookieSync />
    </div>
  );
}
