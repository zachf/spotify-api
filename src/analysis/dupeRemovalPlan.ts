import type { TrackWithPosition, DuplicateGroup } from "../types/spotify.js";

export interface RemovalPlan {
  toKeep: TrackWithPosition[];
  toRemove: TrackWithPosition[];
  groups: DuplicateGroup[];
}

export function buildRemovalPlan(
  tracks: TrackWithPosition[],
  duplicates: DuplicateGroup[]
): RemovalPlan {
  const byPosition = new Map<number, TrackWithPosition>(
    tracks.map((t) => [t.position, t])
  );

  const toKeep: TrackWithPosition[] = [];
  const toRemove: TrackWithPosition[] = [];

  for (const group of duplicates) {
    const [keepPos, ...removePositions] = group.positions;
    const keeper = byPosition.get(keepPos);
    if (keeper) toKeep.push(keeper);
    for (const pos of removePositions) {
      const t = byPosition.get(pos);
      if (t && t.id !== null) toRemove.push(t);
    }
  }

  return { toKeep, toRemove, groups: duplicates };
}
