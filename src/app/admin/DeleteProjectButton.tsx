"use client";

import { AdminActionButton } from "@/app/admin/ActionButton";
import { deleteProject } from "@/app/admin/actions";

export function DeleteProjectButton({ projectId, label }: { projectId: string; label: string }) {
  return (
    <form
      action={deleteProject.bind(null, projectId)}
      onSubmit={(event) => {
        if (!window.confirm(`Delete ${label}?\n\nThis permanently removes the project from the catalog.`)) {
          event.preventDefault();
        }
      }}
    >
      <AdminActionButton
        pendingLabel="Deleting…"
        className="h-11 cursor-pointer rounded-full border border-red-200 px-5 text-sm text-red-700 hover:border-red-400"
      >
        Delete
      </AdminActionButton>
    </form>
  );
}
