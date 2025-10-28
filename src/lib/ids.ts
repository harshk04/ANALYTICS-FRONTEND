export function extractTranscriptId(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  const candidate =
    (obj["transcript_id"] as string | undefined) ??
    (obj["_id"] as string | undefined) ??
    (obj["id"] as string | undefined) ??
    null;
  return candidate ? String(candidate) : null;
}


