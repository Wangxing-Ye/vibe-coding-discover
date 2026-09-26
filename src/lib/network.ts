export function isTransientNetworkError(error: unknown): boolean {
  const text = serializeError(error).toLowerCase();
  return (
    text.includes("enotfound") ||
    text.includes("eai_again") ||
    text.includes("econnreset") ||
    text.includes("econnrefused") ||
    text.includes("etimedout") ||
    text.includes("und_err_connect_timeout") ||
    text.includes("network") ||
    text.includes("fetch failed") ||
    text.includes("socket") ||
    text.includes("connect tunnel failed")
  );
}

export function serializeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const parts = [error.message];
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    parts.push(cause.message);
    const nested = cause as Error & { code?: string; hostname?: string };
    if (nested.code) parts.push(nested.code);
    if (nested.hostname) parts.push(nested.hostname);
  } else if (cause && typeof cause === "object") {
    const nested = cause as { code?: string; hostname?: string; message?: string };
    if (nested.message) parts.push(nested.message);
    if (nested.code) parts.push(nested.code);
    if (nested.hostname) parts.push(nested.hostname);
  }
  return parts.filter(Boolean).join(" | ");
}

export function formatNetworkError(error: unknown, host: string): string {
  const detail = serializeError(error);
  if (/enotfound|getaddrinfo/i.test(detail)) {
    return `DNS lookup failed for ${host} (${detail}). Check network/DNS/VPN/proxy, then retry.`;
  }
  if (/connect tunnel failed|403/i.test(detail)) {
    return `Proxy blocked HTTPS to ${host} (${detail}). Check HTTP(S)_PROXY settings.`;
  }
  return `Network error reaching ${host}: ${detail}`;
}

export async function withRetries<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { attempts?: number; delayMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 3;
  const delayMs = options?.delayMs ?? 800;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientNetworkError(error) || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${label} failed: ${String(lastError)}`);
}
