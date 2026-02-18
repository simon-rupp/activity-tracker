"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { TIME_ZONE_COOKIE_NAME } from "@/lib/time-zone";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

function readCookie(name: string): string | undefined {
  const target = `${name}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(target));

  if (!cookie) {
    return undefined;
  }

  const value = cookie.slice(target.length);
  return value || undefined;
}

export function TimeZoneCookieSync() {
  const router = useRouter();

  useEffect(() => {
    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browserTimeZone) {
      return;
    }

    const existingTimeZone = readCookie(TIME_ZONE_COOKIE_NAME);
    if (existingTimeZone === browserTimeZone) {
      return;
    }

    document.cookie = `${TIME_ZONE_COOKIE_NAME}=${browserTimeZone}; Path=/; Max-Age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
    router.refresh();
  }, [router]);

  return null;
}
