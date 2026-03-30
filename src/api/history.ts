import { apiFetch } from "./client.js";
import type { TrackObject } from "../types/spotify.js";

export interface PlayHistoryObject {
  track: TrackObject;
  played_at: string; // ISO 8601
}

interface RecentlyPlayedResponse {
  items: PlayHistoryObject[];
  next: string | null;
}

export async function getRecentlyPlayed(
  token: string,
  limit = 50
): Promise<PlayHistoryObject[]> {
  const res = await apiFetch<RecentlyPlayedResponse>(
    `/me/player/recently-played?limit=${Math.min(limit, 50)}`,
    token
  );
  return res.items;
}
