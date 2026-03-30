import type { TrackWithPosition } from "../types/spotify.js";

export interface TimelineMonth {
  month: string; // "YYYY-MM"
  count: number;
  tracks: TrackWithPosition[];
}

export function groupByMonth(tracks: TrackWithPosition[]): TimelineMonth[] {
  const map = new Map<string, TrackWithPosition[]>();

  for (const track of tracks) {
    if (!track.added_at) continue;
    const month = track.added_at.slice(0, 7); // "YYYY-MM"
    const group = map.get(month);
    if (group) {
      group.push(track);
    } else {
      map.set(month, [track]);
    }
  }

  return [...map.entries()]
    .map(([month, tracks]) => ({ month, count: tracks.length, tracks }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
