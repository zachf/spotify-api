import type { TrackWithPosition } from "../types/spotify.js";

export interface ArtistRuntime {
  artist: string;
  totalMs: number;
  count: number;
}

export function runtimeByArtist(tracks: TrackWithPosition[]): ArtistRuntime[] {
  const map = new Map<string, ArtistRuntime>();

  for (const track of tracks) {
    for (const artist of track.artists) {
      const entry = map.get(artist.name);
      if (entry) {
        entry.totalMs += track.duration_ms;
        entry.count++;
      } else {
        map.set(artist.name, { artist: artist.name, totalMs: track.duration_ms, count: 1 });
      }
    }
  }

  return [...map.values()].sort((a, b) => b.totalMs - a.totalMs);
}
