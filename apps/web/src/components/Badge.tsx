import { orderStatusLabel, orderStatusTone } from "@/lib/format";

const TONE_CLASSES: Record<string, string> = {
  neutral: "bg-ink-100 text-ink-600",
  warning: "bg-amber-100 text-amber-700",
  success: "bg-emerald-100 text-emerald-700",
  danger: "bg-rose-100 text-rose-700",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = orderStatusTone(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {orderStatusLabel(status)}
    </span>
  );
}
