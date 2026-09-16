import { ReactNode } from "react";

/** Hover/focus-triggered info bubble — pure CSS, no JS, for explaining jargon inline. */
export function Tooltip({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <span className="group relative inline-flex items-center">
      {children ?? (
        <span className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full bg-ink-200 text-[10px] font-semibold leading-none text-ink-600">
          ?
        </span>
      )}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {text}
        <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-ink-900" />
      </span>
    </span>
  );
}
