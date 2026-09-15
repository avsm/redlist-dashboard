"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

if (
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_POSTHOG_KEY
) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    // First-party reverse proxy (see next.config.ts rewrites) so ad/tracking
    // blockers can't drop events. ui_host keeps "View in PostHog" links pointing
    // at the real EU dashboard.
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    // In-memory persistence: the distinct_id lives only in JS for the page
    // session — no cookie or localStorage, so no consent banner is needed. We
    // avoid cookieless server-hash mode because it derives identity from the
    // client IP, which our server-side /ingest proxy hides from PostHog.
    //
    // This holds for everyone, signed in or not. Nothing switches it at runtime:
    // the opt-in that used to (#524) was removed in #537, so the anonymous,
    // cookieless mode described in /privacy is the only mode there is.
    persistence: "memory",
    // Session replay is off outright and has no opt-in. It is the one thing
    // here that would have stored an identifier on the device and tied a
    // screen recording to an account; we decided the product questions it
    // answered were not worth asking people for that. Turning it back on is a
    // consent question again, not a one-line config change — see #537.
    disable_session_recording: true,
  });
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
