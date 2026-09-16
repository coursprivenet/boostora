/** PanelFollows exposes drip-feed limits as two entries (name: "runs" / "interval") inside
 * a provider service's fieldsSchema array — pull out just the max bounds we validate against. */
export function extractDripfeedLimits(fieldsSchema: unknown): { maxRuns: number | null; maxIntervalMinutes: number | null } {
  const fields = Array.isArray(fieldsSchema) ? fieldsSchema : [];
  const runs = fields.find((f) => f && typeof f === "object" && f.name === "runs");
  const interval = fields.find((f) => f && typeof f === "object" && f.name === "interval");
  return {
    maxRuns: typeof runs?.max === "number" ? runs.max : null,
    maxIntervalMinutes: typeof interval?.max === "number" ? interval.max : null,
  };
}
