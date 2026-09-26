import { createHmac, randomInt, timingSafeEqual } from "crypto";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const CODE_LENGTH = 5;
const WIDTH = 180;
const HEIGHT = 56;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function randomCode(length = CODE_LENGTH) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CHARSET[randomInt(0, CHARSET.length)];
  }
  return out;
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Distorted SVG text captcha (no native image deps). */
function renderCaptchaSvg(code: string) {
  const noiseLines = Array.from({ length: 6 }, () => {
    const x1 = randomInt(0, WIDTH);
    const y1 = randomInt(0, HEIGHT);
    const x2 = randomInt(0, WIDTH);
    const y2 = randomInt(0, HEIGHT);
    const opacity = (20 + randomInt(0, 40)) / 100;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#64748b" stroke-width="1" opacity="${opacity}" />`;
  }).join("");

  const dots = Array.from({ length: 28 }, () => {
    const cx = randomInt(0, WIDTH);
    const cy = randomInt(0, HEIGHT);
    const r = randomInt(1, 3);
    const opacity = (15 + randomInt(0, 35)) / 100;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#94a3b8" opacity="${opacity}" />`;
  }).join("");

  const chars = code
    .split("")
    .map((ch, index) => {
      const x = 22 + index * 32 + randomInt(-3, 4);
      const y = 34 + randomInt(-6, 7);
      const rotate = randomInt(-28, 29);
      const size = 26 + randomInt(0, 6);
      const fill = ["#0f172a", "#1e293b", "#334155", "#1d4ed8"][randomInt(0, 4)];
      return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-weight="700" transform="rotate(${rotate} ${x} ${y})">${escapeXml(ch)}</text>`;
    })
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="Verification code">
  <rect width="100%" height="100%" fill="#f1f5f9"/>
  <rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" fill="none" stroke="#cbd5e1" rx="8"/>
  ${noiseLines}
  ${dots}
  ${chars}
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export type LoginCaptchaChallenge = {
  imageDataUrl: string;
  token: string;
};

/** Image text captcha; answer is never embedded in the token. */
export function createLoginCaptcha(): LoginCaptchaChallenge {
  const answer = randomCode();
  const exp = Date.now() + 10 * 60 * 1000;
  const nonce = randomInt(1e8, 1e9).toString(36);
  const sig = sign(`${answer}|${nonce}|${exp}`);
  return {
    imageDataUrl: renderCaptchaSvg(answer),
    token: `${nonce}.${exp}.${sig}`,
  };
}

export function verifyLoginCaptcha(token: string, answerRaw: string) {
  const answer = answerRaw.trim().toUpperCase().replace(/\s+/g, "");
  if (!token || !answer) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [nonce, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!nonce || !sig || !Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = sign(`${answer}|${nonce}|${expStr}`);
  return safeEqual(expected, sig);
}
