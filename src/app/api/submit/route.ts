import { NextRequest, NextResponse } from "next/server";
import { clientIp } from "@/lib/client-ip";
import { createSubmission, processSubmission } from "@/lib/pipeline";

export const maxDuration = 300;

const recent = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const stamps = (recent.get(ip) || []).filter((time) => now - time < windowMs);
  if (stamps.length >= 100) {
    recent.set(ip, stamps);
    return true;
  }
  stamps.push(now);
  recent.set(ip, stamps);
  return false;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  }

  let body: { sourceType?: string; sourceUrl?: string; submitterEmail?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.sourceType !== "github" && body.sourceType !== "x" && body.sourceType !== "youtube") {
    return NextResponse.json({ error: "sourceType must be github, x, or youtube" }, { status: 400 });
  }
  if (!body.sourceUrl || typeof body.sourceUrl !== "string") {
    return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 });
  }

  try {
    const result = await createSubmission({
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl,
      submitterEmail: body.submitterEmail,
      submitterIp: ip,
    });
    if (result.alreadyPublished) {
      return NextResponse.json({
        message: "This project is already published.",
        slug: result.slug,
        slugs: result.slug ? [result.slug] : [],
        alreadyPublishedSlugs: result.slug ? [result.slug] : [],
        newlyPublishedSlugs: [],
        published: true,
        publishedCount: 1,
        newlyPublishedCount: 0,
        alreadyPublishedCount: 1,
        reviewCount: 0,
      });
    }
    const processed = await processSubmission(result.submissionId);
    return NextResponse.json({
      message: processed.message,
      slug: processed.slug,
      slugs: processed.slugs ?? (processed.slug ? [processed.slug] : []),
      newlyPublishedSlugs: processed.newlyPublishedSlugs ?? [],
      alreadyPublishedSlugs: processed.alreadyPublishedSlugs ?? [],
      published: processed.published,
      found: processed.found,
      publishedCount: processed.publishedCount,
      newlyPublishedCount: processed.newlyPublishedCount,
      alreadyPublishedCount: processed.alreadyPublishedCount,
      reviewCount: processed.reviewCount,
      submissionId: result.submissionId,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Submission failed" },
      { status: 400 },
    );
  }
}
