"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      return;
    }

    async function registerServiceWorker() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        registration.update().catch(() => {
          // Ignore update errors; they are non-fatal.
        });
      } catch {
        // Ignore registration errors; app should keep working without offline support.
      }
    }

    void registerServiceWorker();
  }, []);

  return null;
}
