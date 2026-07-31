"use client";

/** Thin fetch wrapper that unwraps the JSON error envelope from src/lib/api.ts. */
export async function api<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const isJson = res.headers
    .get("content-type")
    ?.includes("application/json");

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (isJson) {
      const body = await res.json().catch(() => null);
      if (body?.error) message = body.error;
    }
    throw new Error(message);
  }

  if (!isJson) return res as unknown as T;
  return res.json();
}

export function jsonBody(data: unknown): RequestInit {
  return { method: "POST", body: JSON.stringify(data) };
}

export function putBody(data: unknown): RequestInit {
  return { method: "PUT", body: JSON.stringify(data) };
}
