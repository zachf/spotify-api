import type { TrackWithPosition, DuplicateGroup } from "../types/spotify.js";

export function findExactDuplicates(tracks: TrackWithPosition[]): DuplicateGroup[] {
  const seen = new Map<string, DuplicateGroup>();

  for (const track of tracks) {
    if (!track.id) continue;

    const existing = seen.get(track.id);
    if (existing) {
      existing.positions.push(track.position);
    } else {
      seen.set(track.id, {
        trackId: track.id,
        trackName: track.name,
        artists: track.artists.map((a) => a.name),
        positions: [track.position],
      });
    }
  }

  return [...seen.values()]
    .filter((g) => g.positions.length > 1)
    .sort((a, b) => a.positions[0] - b.positions[0]);
}
