import { SpotifyApiError } from "../types/spotify.js";

const BASE_URL = "https://api.spotify.com/v1";

export async function apiFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "1", 10);
    await sleep(retryAfter * 1000);
    return apiFetch<T>(path, token, options);
  }

  if (!res.ok) {
    const body = await res.text();
    throw new SpotifyApiError(res.status, body);
  }

  return res.json() as Promise<T>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
