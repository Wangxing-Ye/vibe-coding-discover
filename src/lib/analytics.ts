import { cookies } from "next/headers";
import { PostHog } from "posthog-node";
import { posthogHost, posthogKey } from "./analytics-public";

export { posthogHost, posthogKey };

function serverClient() {
  const key = posthogKey();
  if (!key) return null;
  return new PostHog(key, { host: posthogHost(), flushAt: 1, flushInterval: 0 });
}

export async function captureServerEvent(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  const client = serverClient();
  if (!client) return;
  const cookieStore = await cookies();
  const distinctId =
    cookieStore.get("ph_distinct_id")?.value ||
    cookieStore.get(`ph_${posthogKey()}_posthog`)?.value ||
    "anonymous";
  client.capture({ distinctId, event, properties });
  await client.shutdown();
}
