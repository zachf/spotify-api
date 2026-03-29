import { apiFetch } from "./client.js";
import type { PagingObject, SimplifiedPlaylist } from "../types/spotify.js";

export async function getUserPlaylists(token: string): Promise<SimplifiedPlaylist[]> {
  const playlists: SimplifiedPlaylist[] = [];
  let url: string | null = "/me/playlists?limit=50";

  while (url) {
    const page: PagingObject<SimplifiedPlaylist> = await apiFetch<PagingObject<SimplifiedPlaylist>>(url, token);
    playlists.push(...page.items);
    url = page.next;
  }

  return playlists;
}

export async function getPlaylist(
  id: string,
  token: string
): Promise<SimplifiedPlaylist> {
  return apiFetch<SimplifiedPlaylist>(`/playlists/${id}`, token);
}
