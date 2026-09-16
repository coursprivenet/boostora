export type FeatureIconName = "spread" | "slider" | "progress" | "support";

const PATHS: Record<FeatureIconName, React.ReactNode> = {
  spread: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="7" r="2" />
      <circle cx="19" cy="12" r="2" />
      <path d="M5 14v3M12 9v3M19 14v3" />
      <path d="M3 20h18" />
    </>
  ),
  slider: (
    <>
      <path d="M4 8h16M4 16h16" />
      <circle cx="9" cy="8" r="2" fill="currentColor" />
      <circle cx="15" cy="16" r="2" fill="currentColor" />
    </>
  ),
  progress: (
    <>
      <rect x="3" y="10" width="18" height="4" rx="2" />
      <rect x="3" y="10" width="11" height="4" rx="2" fill="currentColor" />
    </>
  ),
  support: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
      <path d="M8 10h8M8 13h5" />
    </>
  ),
};

export function FeatureIcon({ name, className }: { name: FeatureIconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}
