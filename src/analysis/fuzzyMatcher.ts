import type { TrackWithPosition, DuplicateGroup } from "../types/spotify.js";

// Strips remaster notes, featured artists, years, punctuation, and normalizes whitespace
function normalizeTrackKey(track: TrackWithPosition): string {
  const name = track.name
    .toLowerCase()
    .replace(/\(.*?(remaster|remix|edit|version|feat\.?|ft\.?|\d{4}).*?\)/gi, "")
    .replace(/[-–—]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const artists = track.artists
    .map((a) => a.name.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .sort()
    .join(",");

  return `${name}::${artists}`;
}

export function findFuzzyDuplicates(
  tracks: TrackWithPosition[],
  exactDuplicateIds: Set<string>
): DuplicateGroup[] {
  // key -> list of tracks sharing that normalized key
  const keyMap = new Map<string, TrackWithPosition[]>();

  for (const track of tracks) {
    const key = normalizeTrackKey(track);
    const group = keyMap.get(key);
    if (group) {
      group.push(track);
    } else {
      keyMap.set(key, [track]);
    }
  }

  const results: DuplicateGroup[] = [];

  for (const group of keyMap.values()) {
    // Only fuzzy dupes: multiple distinct track IDs sharing a normalized key
    const uniqueIds = new Set(group.map((t) => t.id));
    if (uniqueIds.size <= 1) continue;

    // Skip groups that are already fully covered by exact duplicate detection
    if ([...uniqueIds].every((id) => id && exactDuplicateIds.has(id))) continue;

    results.push({
      trackId: null,
      trackName: group[0].name,
      artists: group[0].artists.map((a) => a.name),
      positions: group.map((t) => t.position).sort((a, b) => a - b),
    });
  }

  return results.sort((a, b) => a.positions[0] - b.positions[0]);
}
