import { getBackendUrl } from "./backend-url";

type ApiOptions = RequestInit & {
  auth?: boolean;
};

export function apiUrl(path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${getBackendUrl()}${normalized}`;
}

export async function apiFetch(path: string, options: ApiOptions = {}) {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(apiUrl(path), {
    ...options,
    credentials: "include",
    headers,
  });
}

export async function apiJson<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message ?? `API request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

