import type { TrackWithPosition } from "../types/spotify.js";

export interface DecadeCount {
  decade: string;
  count: number;
}

export function countByDecade(tracks: TrackWithPosition[]): DecadeCount[] {
  const counts = new Map<string, number>();

  for (const track of tracks) {
    const year = parseInt(track.album.release_date.slice(0, 4), 10);
    if (isNaN(year)) continue;
    const decade = `${Math.floor(year / 10) * 10}s`;
    counts.set(decade, (counts.get(decade) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([decade, count]) => ({ decade, count }))
    .sort((a, b) => a.decade.localeCompare(b.decade));
}
