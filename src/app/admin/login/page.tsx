import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { createLoginCaptcha } from "@/lib/admin-captcha";
import { loginAction } from "../actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }
  const { error } = await searchParams;
  const captcha = createLoginCaptcha();

  const errorMessage =
    error === "captcha"
      ? "Incorrect verification code. Try again."
      : error === "password" || error === "1"
        ? "Incorrect password."
        : null;

  return (
    <div className="mx-auto max-w-sm px-4 py-24">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-2 text-sm text-secondary">Review queue for VibeCodingDiscover.</p>
      <form action={loginAction} className="mt-8 space-y-4">
        <div>
          <label htmlFor="password" className="text-sm text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="captcha" className="text-sm text-secondary">
            Verification
          </label>
          <div className="mt-2 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={captcha.imageDataUrl}
              alt="Verification code"
              width={180}
              height={56}
              className="h-14 w-[180px] rounded-lg border border-border bg-[#f1f5f9]"
            />
            <Link
              href="/admin/login"
              className="text-sm text-accent hover:underline"
              prefetch={false}
            >
              Refresh
            </Link>
          </div>
          <input type="hidden" name="captchaToken" value={captcha.token} />
          <input
            id="captcha"
            name="captcha"
            type="text"
            required
            autoComplete="off"
            spellCheck={false}
            maxLength={8}
            placeholder="Enter the characters in the image"
            className="mt-2 h-11 w-full rounded-xl border border-border px-3 text-sm uppercase tracking-widest outline-none focus:border-accent"
          />
        </div>
        {errorMessage ? <p className="text-sm text-error">{errorMessage}</p> : null}
        <button
          type="submit"
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-full bg-foreground text-sm font-medium text-background"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
