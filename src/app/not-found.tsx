import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Project not found</h1>
      <p className="mt-3 text-sm text-secondary">It may still be in review, or the URL is incorrect.</p>
      <Link href="/explore" className="mt-6 inline-flex text-sm text-accent hover:underline">
        Back to explore
      </Link>
    </div>
  );
}
