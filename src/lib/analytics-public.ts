export function posthogKey() {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || "";
}

export function posthogHost() {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
}
