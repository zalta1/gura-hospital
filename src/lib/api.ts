/**
 * Browser client for the Gura Care Navigation API (FastAPI).
 * Tokens are sessionStorage-only in this MVP — TODO(HIPAA): httpOnly cookies + CSRF.
 */

const API_BASE = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "/api";

export type Role = "patient" | "physician" | "staff" | "admin" | "service_account";

export type AuthSession = {
  access_token: string;
  token_type: string;
  role: Role;
  user_id: string;
  organization_id: string;
  patient_id?: string | null;
  provider_id?: string | null;
};

const TOKEN_KEY = "gura_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function storeAuth(session: AuthSession) {
  sessionStorage.setItem(TOKEN_KEY, session.access_token);
  sessionStorage.setItem("gura_auth", JSON.stringify(session));
}

export function clearAuth() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem("gura_auth");
}

export function getStoredAuth(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("gura_auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") return body.detail;
    return JSON.stringify(body.detail ?? res.statusText);
  } catch {
    return res.statusText;
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function wsUrl(path: string): string {
  const token = getStoredToken();
  const configured = import.meta.env["VITE_WS_URL"] as string | undefined;
  let base: string;
  if (configured) {
    base = configured;
  } else if (API_BASE.startsWith("http")) {
    base = API_BASE.replace(/^http/, "ws");
  } else if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    base = `${proto}//${window.location.host}`;
  } else {
    base = "ws://127.0.0.1:8000";
  }
  const sep = path.includes("?") ? "&" : "?";
  return `${base}${path}${token ? `${sep}token=${encodeURIComponent(token)}` : ""}`;
}
