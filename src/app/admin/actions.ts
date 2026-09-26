"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Category, ProjectStatus, SubmissionStatus } from "@prisma/client";
import { clearAdminSession, isAdminAuthenticated, setAdminSession, verifyAdminPassword } from "@/lib/admin-auth";
import { verifyLoginCaptcha } from "@/lib/admin-captcha";
import { prisma } from "@/lib/db";
import { ingestGithubProject, isTrustedAnalysis, processSubmission } from "@/lib/pipeline";
import { clearProjectUseCases, syncProjectUseCases } from "@/lib/use-cases";
import { upsertTodayRecommendation } from "@/lib/today-recommendation";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  const captcha = String(formData.get("captcha") || "");
  const captchaToken = String(formData.get("captchaToken") || "");

  if (!verifyLoginCaptcha(captchaToken, captcha)) {
    redirect("/admin/login?error=captcha");
  }
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=password");
  }
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

function noticeRedirect(projectId: string, notice: string): never {
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/use-cases");
  revalidatePath("/admin");
  revalidatePath(`/admin/projects/${projectId}`);
  redirect(`/admin/projects/${projectId}?notice=${notice}`);
}

export async function publishProject(projectId: string) {
  await requireAdmin();
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.published },
  });
  await prisma.submission.updateMany({
    where: { projectId },
    data: { status: SubmissionStatus.published, reviewedAt: new Date() },
  });
  await syncProjectUseCases(projectId);
  await upsertTodayRecommendation({
    projectId: project.id,
    projectName: `${project.owner}/${project.repoName}`,
    stars: project.stars,
    source: "admin",
    status: ProjectStatus.published,
    newlyPublished: true,
  });
  const linked = await prisma.submission.findMany({
    where: { projectId, status: SubmissionStatus.published },
    select: { id: true },
  });
  const { maybeGrantSubmissionReward } = await import("@/lib/submission-reward");
  for (const row of linked) {
    await maybeGrantSubmissionReward(row.id);
  }
  noticeRedirect(projectId, "published");
}

export async function rejectProject(projectId: string) {
  await requireAdmin();
  await prisma.project.update({
    where: { id: projectId },
    data: { status: ProjectStatus.rejected },
  });
  await prisma.submission.updateMany({
    where: { projectId },
    data: { status: SubmissionStatus.rejected, reviewedAt: new Date() },
  });
  await clearProjectUseCases(projectId);
  noticeRedirect(projectId, "rejected");
}

export async function saveProjectProfile(projectId: string, formData: FormData) {
  await requireAdmin();
  const category = String(formData.get("category")) as Category;
  const aiSummary = String(formData.get("aiSummary") || "");
  const tags = String(formData.get("tags") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const useCases = String(formData.get("useCases") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const frameworks = String(formData.get("frameworks") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  await prisma.projectAnalysis.update({
    where: { projectId },
    data: { category, aiSummary, tags, useCases, frameworks },
  });
  await syncProjectUseCases(projectId);
  noticeRedirect(projectId, "saved");
}

export async function reanalyzeProject(projectId: string) {
  await requireAdmin();
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  const result = await ingestGithubProject({ githubUrl: project.githubUrl, preferLive: true });
  noticeRedirect(projectId, isTrustedAnalysis(result.analysisSource) ? "reanalyzed" : "ai_failed");
}

export async function setProjectLicense(projectId: string, formData: FormData) {
  await requireAdmin();
  const license = String(formData.get("license") || "").trim();
  if (!license) {
    noticeRedirect(projectId, "license_required");
  }
  await prisma.project.update({
    where: { id: projectId },
    data: { license },
  });
  noticeRedirect(projectId, "license_saved");
}

export async function deleteProject(projectId: string) {
  await requireAdmin();
  await prisma.submission.updateMany({
    where: { projectId },
    data: { projectId: null },
  });
  await clearProjectUseCases(projectId);
  await prisma.project.delete({ where: { id: projectId } });
  revalidatePath("/");
  revalidatePath("/explore");
  revalidatePath("/use-cases");
  revalidatePath("/admin");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?notice=deleted");
}

export async function retrySubmission(submissionId: string) {
  await requireAdmin();
  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: SubmissionStatus.pending, notes: null },
  });
  await processSubmission(submissionId);
  revalidatePath("/admin");
}

function revalidateWatchlist() {
  revalidatePath("/admin");
  revalidatePath("/admin/watchlist");
}

export async function addWatchAccount(formData: FormData) {
  await requireAdmin();
  const { normalizeXUsername } = await import("@/lib/x-watchlist");
  const username = normalizeXUsername(String(formData.get("username") || ""));
  if (!username) {
    redirect("/admin/watchlist?error=invalid");
  }
  const notes = String(formData.get("notes") || "").trim() || null;
  await prisma.xWatchAccount.upsert({
    where: { username },
    create: { username, notes, enabled: true },
    update: { notes: notes ?? undefined, enabled: true },
  });
  revalidateWatchlist();
  redirect("/admin/watchlist?notice=added");
}

export async function deleteWatchAccount(id: string) {
  await requireAdmin();
  await prisma.xWatchAccount.delete({ where: { id } });
  revalidateWatchlist();
  redirect("/admin/watchlist?notice=deleted");
}

export async function setWatchAccountEnabled(id: string, enabled: boolean) {
  await requireAdmin();
  await prisma.xWatchAccount.update({
    where: { id },
    data: { enabled },
  });
  revalidateWatchlist();
  redirect(`/admin/watchlist?notice=${enabled ? "enabled" : "disabled"}`);
}

export async function importWatchAccountsFromSubmissions() {
  await requireAdmin();
  const { normalizeXUsername } = await import("@/lib/x-watchlist");
  const rows = await prisma.submission.findMany({
    where: { sourceType: "x" },
    select: { sourceUrl: true },
  });

  const usernames = new Set<string>();
  for (const row of rows) {
    const username = normalizeXUsername(row.sourceUrl);
    if (username) usernames.add(username);
  }

  const existing = await prisma.xWatchAccount.findMany({
    where: { username: { in: [...usernames] } },
    select: { username: true },
  });
  const existingSet = new Set(existing.map((row) => row.username));
  const toCreate = [...usernames].filter((username) => !existingSet.has(username));

  if (toCreate.length) {
    await prisma.xWatchAccount.createMany({
      data: toCreate.map((username) => ({
        username,
        notes: "imported from submissions",
        enabled: true,
      })),
    });
  }

  revalidateWatchlist();
  redirect(`/admin/watchlist?notice=imported&count=${usernames.size}`);
}
