"use client";

import { useEffect, useRef, useState } from "react";
import {
  buildProjectsCsv,
  buildProjectsTxt,
  exportDownloadFilename,
  type ExportProjectRow,
} from "@/lib/export-projects-csv";

function ExportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 11l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function downloadFile(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ExportProjectsButton({ rows, txtIntro }: { rows: ExportProjectRow[]; txtIntro?: string }) {
  const disabled = rows.length === 0;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (menuRef.current && target && !menuRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function exportAs(kind: "csv" | "txt") {
    if (disabled) return;
    const origin = window.location.origin;
    if (kind === "csv") {
      downloadFile(exportDownloadFilename("csv"), buildProjectsCsv(rows, origin), "text/csv;charset=utf-8");
    } else {
      downloadFile(exportDownloadFilename("txt"), buildProjectsTxt(rows, origin, txtIntro), "text/plain;charset=utf-8");
    }
    setOpen(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          setOpen((value) => !value);
        }}
        disabled={disabled}
        title="Export current page"
        aria-label="Export current page"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-secondary transition-colors hover:bg-[#f4f4f5] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ExportIcon />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[7rem] rounded-lg border border-border bg-background py-1 shadow-sm"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => exportAs("csv")}
            className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm text-foreground hover:bg-[#f4f4f5]"
          >
            CSV
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => exportAs("txt")}
            className="block w-full cursor-pointer px-3 py-1.5 text-left text-sm text-foreground hover:bg-[#f4f4f5]"
          >
            Text
          </button>
        </div>
      ) : null}
    </div>
  );
}
