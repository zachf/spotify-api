import { apiFetch } from "./client.js";
import type { PagingObject, TrackObject, TopArtistObject, TimeRange } from "../types/spotify.js";

export async function getTopTracks(
  token: string,
  timeRange: TimeRange = "medium_term",
  limit = 50
): Promise<TrackObject[]> {
  const params = new URLSearchParams({ time_range: timeRange, limit: String(limit) });
  const res = await apiFetch<PagingObject<TrackObject>>(`/me/top/tracks?${params}`, token);
  return res.items;
}

export async function getTopArtists(
  token: string,
  timeRange: TimeRange = "medium_term",
  limit = 50
): Promise<TopArtistObject[]> {
  const params = new URLSearchParams({ time_range: timeRange, limit: String(limit) });
  const res = await apiFetch<PagingObject<TopArtistObject>>(`/me/top/artists?${params}`, token);
  return res.items;
}
