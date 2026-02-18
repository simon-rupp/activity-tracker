import "server-only";

import { cookies, headers } from "next/headers";

import { TIME_ZONE_COOKIE_NAME } from "@/lib/time-zone";

const HEADER_CANDIDATES = ["x-time-zone", "x-vercel-ip-timezone"];

function isValidTimeZone(value: string | undefined | null): value is string {
  if (!value) {
    return false;
  }

  try {
    // Intl throws on invalid IANA zone IDs.
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function resolveRequestTimeZone(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(TIME_ZONE_COOKIE_NAME)?.value;
  if (isValidTimeZone(fromCookie)) {
    return fromCookie;
  }

  const requestHeaders = await headers();
  for (const headerName of HEADER_CANDIDATES) {
    const headerValue = requestHeaders.get(headerName);
    if (isValidTimeZone(headerValue)) {
      return headerValue;
    }
  }

  return undefined;
}
