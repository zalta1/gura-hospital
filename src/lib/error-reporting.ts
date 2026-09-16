/** Local error reporting — no third-party editor telemetry. */

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : String(error);
  console.error("[gura]", message, context);
}
