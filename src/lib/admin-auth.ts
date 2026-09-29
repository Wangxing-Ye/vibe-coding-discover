import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "vcd_admin";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return value;
}

function sign() {
  return createHmac("sha256", secret()).update("admin-ok").digest("hex");
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || !password) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function cookieSecure() {
  if (process.env.COOKIE_SECURE === "true" || process.env.COOKIE_SECURE === "1") return true;
  if (process.env.COOKIE_SECURE === "false" || process.env.COOKIE_SECURE === "0") return false;
  return (process.env.NEXT_PUBLIC_SITE_URL || "").startsWith("https://");
}

export async function setAdminSession() {
  const store = await cookies();
  store.set(COOKIE, sign(), {
    httpOnly: true,
    sameSite: "lax",
    // NODE_ENV=production alone is not enough: Secure cookies are not sent on http://IP:3000.
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function isAdminAuthenticated() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return false;
    const expected = sign();
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
