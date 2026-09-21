"use client";

import { ReactNode, useState, useRef, useEffect } from "react";

/** Info bubble triggered by hover on desktop or tap/click on mobile, without overflow. */
export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  return (
    <span ref={ref} className="group relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="inline-flex items-center focus:outline-none"
        aria-label="Information complémentaire"
      >
        {children ?? (
          <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full bg-ink-200 text-[10px] font-semibold leading-none text-ink-600 transition hover:bg-brand-500 hover:text-ink-900">
            ?
          </span>
        )}
      </button>
      <span
        className={`pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-56 max-w-[85vw] -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs leading-snug text-white shadow-xl transition-opacity duration-150 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        {text}
        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-ink-900" />
      </span>
    </span>
  );
}
