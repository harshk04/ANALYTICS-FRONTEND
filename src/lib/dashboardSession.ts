const KEY = "dashboard_transcript_id";

export function getDashboardTranscriptId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setDashboardTranscriptId(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, id);
}

export function clearDashboardTranscriptId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}




