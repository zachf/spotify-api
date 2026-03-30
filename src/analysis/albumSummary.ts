import type { TrackWithPosition } from "../types/spotify.js";

export interface AlbumCount {
  album: string;
  artist: string;
  count: number;
}

export function countByAlbum(tracks: TrackWithPosition[]): AlbumCount[] {
  const counts = new Map<string, AlbumCount>();

  for (const track of tracks) {
    const key = track.album.id;
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, {
        album: track.album.name,
        artist: track.artists[0]?.name ?? "",
        count: 1,
      });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.album.localeCompare(b.album));
}
