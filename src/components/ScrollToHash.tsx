"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ScrollToHash() {
  const pathname = usePathname();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const scroll = () => document.getElementById(id)?.scrollIntoView();
    scroll();
    const frame = window.requestAnimationFrame(scroll);
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
