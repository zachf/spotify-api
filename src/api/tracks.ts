import { apiFetch } from "./client.js";
import type { PagingObject, PlaylistItemObject, TrackWithPosition } from "../types/spotify.js";

interface SavedTrackObject {
  added_at: string;
  track: import("../types/spotify.js").TrackObject;
}

export async function getLikedTracks(
  token: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<TrackWithPosition[]> {
  const tracks: TrackWithPosition[] = [];
  let url: string | null = "/me/tracks?limit=50";
  let position = 1;

  while (url) {
    const page = await apiFetch<PagingObject<SavedTrackObject>>(url, token);

    for (const item of page.items) {
      if (!item.track || item.track.id === null) {
        position++;
        continue;
      }
      tracks.push({ ...item.track, position: position++ });
    }

    onProgress?.(tracks.length, page.total);
    url = page.next;
  }

  return tracks;
}

export async function getAllPlaylistTracks(
  playlistId: string,
  token: string,
  onProgress?: (fetched: number, total: number) => void
): Promise<TrackWithPosition[]> {
  const tracks: TrackWithPosition[] = [];
  let url: string | null = `/playlists/${playlistId}/tracks?limit=50`;
  let position = 1;

  while (url) {
    const page = await apiFetch<PagingObject<PlaylistItemObject>>(url, token);

    for (const item of page.items) {
      if (!item.item || item.item.id === null) {
        position++;
        continue;
      }
      tracks.push({ ...item.item, position: position++ });
    }

    onProgress?.(tracks.length, page.total);
    url = page.next;
  }

  return tracks;
}
