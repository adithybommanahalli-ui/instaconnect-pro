// Centralised API client for the MongoDB/Express backend.
// Set VITE_API_URL in your local .env to override (defaults to http://localhost:5000).

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://localhost:5000";

const TOKEN_KEY = "gminsta_token";
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

interface ApiOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** When true, send body as FormData (do not stringify, do not set content-type). */
  form?: boolean;
}

export async function api<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  const token = tokenStore.get();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (opts.form && opts.body instanceof FormData) {
    body = opts.body;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    headers,
    body,
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try { data = JSON.parse(text); } catch { data = text; }
  }
  if (!res.ok) {
    const msg = (data && data.message) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export const fileUrl = (p?: string | null) => {
  if (!p) return undefined;
  if (/^https?:\/\//i.test(p)) return p;
  return `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};
