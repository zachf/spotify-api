import type { TrackWithPosition } from "../types/spotify.js";

export interface ArtistCount {
  artist: string;
  count: number;
}

export function countByArtist(tracks: TrackWithPosition[]): ArtistCount[] {
  const counts = new Map<string, number>();

  for (const track of tracks) {
    for (const artist of track.artists) {
      counts.set(artist.name, (counts.get(artist.name) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([artist, count]) => ({ artist, count }))
    .sort((a, b) => b.count - a.count || a.artist.localeCompare(b.artist));
}
