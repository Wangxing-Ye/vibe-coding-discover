import { NextRequest, NextResponse } from "next/server";
import { setAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { verifyLoginCaptcha } from "@/lib/admin-captcha";

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let password = "";
  let captcha = "";
  let captchaToken = "";

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as {
      password?: string;
      captcha?: string;
      captchaToken?: string;
    };
    password = body.password || "";
    captcha = body.captcha || "";
    captchaToken = body.captchaToken || "";
  } else {
    const form = await request.formData();
    password = String(form.get("password") || "");
    captcha = String(form.get("captcha") || "");
    captchaToken = String(form.get("captchaToken") || "");
  }

  if (!verifyLoginCaptcha(captchaToken, captcha)) {
    return NextResponse.json({ error: "Incorrect verification" }, { status: 401 });
  }
  if (!verifyAdminPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }
  await setAdminSession();
  return NextResponse.json({ ok: true });
}
