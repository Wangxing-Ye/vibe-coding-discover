"use client";

import { useRef, useState, useTransition } from "react";
import { setProjectLicense } from "@/app/admin/actions";

const SUGGESTIONS = [
  "Custom",
  "MIT",
  "Apache-2.0",
  "GPL-3.0",
  "AGPL-3.0",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "MPL-2.0",
  "ISC",
];

export function SetLicenseButton({ projectId }: { projectId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [license, setLicense] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setLicense("");
    setError(null);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const value = license.trim();
    if (!value) {
      setError("Enter a license (e.g. MIT).");
      return;
    }
    const data = new FormData();
    data.set("license", value);
    startTransition(async () => {
      await setProjectLicense(projectId, data);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="h-11 cursor-pointer rounded-full border border-border px-5 text-sm hover:border-foreground"
      >
        License
      </button>

      <dialog
        ref={dialogRef}
        className="fixed left-1/2 top-1/2 m-0 w-[min(100%-2rem,24rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-background p-0 text-foreground shadow-lg backdrop:bg-black/40"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <form onSubmit={onSubmit} className="p-5">
          <h3 className="text-lg font-semibold tracking-tight">Set license</h3>
          <p className="mt-2 text-sm text-secondary">
            Enter an SPDX id, or choose Custom for non-standard licenses.
          </p>
          <input
            autoFocus
            value={license}
            onChange={(event) => {
              setLicense(event.target.value);
              setError(null);
            }}
            list="admin-license-suggestions"
            placeholder="e.g. MIT or Custom"
            className="mt-4 h-11 w-full rounded-xl border border-border px-3 text-sm outline-none focus:border-accent"
          />
          <datalist id="admin-license-suggestions">
            {SUGGESTIONS.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="h-10 cursor-pointer rounded-full border border-border px-4 text-sm hover:border-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-10 cursor-pointer rounded-full bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
