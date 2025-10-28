export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("access_token", token);
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
}


