"use client";

import { useEffect } from "react";

// The access token cookie is set with a 30-minute lifetime (see
// app/api/auth/[...path]/route.ts), so refresh comfortably before that to
// avoid a mid-session forced logout. A logged-out visitor just gets a
// harmless 401 from /api/auth/refresh, which is ignored.
const REFRESH_INTERVAL_MS = 20 * 60 * 1000;

export default function SessionRefresher() {
  useEffect(() => {
    const refresh = () => {
      fetch("/api/auth/refresh", { method: "POST" }).catch(() => {
        // Network hiccup or no active session — next interval tick will retry.
      });
    };

    const intervalId = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  return null;
}
