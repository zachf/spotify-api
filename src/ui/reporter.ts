import chalk from "chalk";
import type { DuplicateGroup, SimplifiedPlaylist, TrackWithPosition, TopArtistObject, TrackObject, TimeRange, PlaylistMoodSummary } from "../types/spotify.js";
import type { ArtistCount } from "../analysis/artistSummary.js";
import type { AlbumCount } from "../analysis/albumSummary.js";
import type { DecadeCount } from "../analysis/decades.js";
import type { TimelineMonth } from "../analysis/timeline.js";
import type { ArtistRuntime } from "../analysis/runtimeByArtist.js";
import type { RemovalPlan } from "../analysis/dupeRemovalPlan.js";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  short_term: "last 4 weeks",
  medium_term: "last 6 months",
  long_term: "all time",
};

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
  return `${m}m ${s % 60}s`;
}

function bar(count: number, max: number, width = 20): string {
  const filled = Math.round((count / max) * width);
  return "█".repeat(filled) + chalk.dim("░".repeat(width - filled));
}

function formatGroup(group: DuplicateGroup): string {
  const artists = group.artists.join(", ");
  const positions = group.positions.join(", ");
  return `  ${chalk.bold(group.trackName)} — ${artists}\n  ${chalk.dim(`positions: ${positions}`)}`;
}

export function printResults(
  playlist: SimplifiedPlaylist,
  exactDupes: DuplicateGroup[],
  fuzzyDupes: DuplicateGroup[],
  totalTracks: number,
  skippedLocalFiles: number
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`${totalTracks} tracks · owner: ${playlist.owner.display_name}`));
  if (skippedLocalFiles > 0) {
    console.log(chalk.dim(`(${skippedLocalFiles} local file(s) skipped)`));
  }
  console.log();

  if (exactDupes.length === 0 && fuzzyDupes.length === 0) {
    console.log(chalk.green("✓ No duplicates found."));
    return;
  }

  if (exactDupes.length > 0) {
    console.log(chalk.red.bold(`Exact duplicates (${exactDupes.length})`));
    console.log(chalk.dim("Same track added more than once:"));
    console.log();
    for (const group of exactDupes) {
      console.log(formatGroup(group));
      console.log();
    }
  }

  if (fuzzyDupes.length > 0) {
    console.log(chalk.yellow.bold(`Near-duplicates (${fuzzyDupes.length})`));
    console.log(chalk.dim("Different versions of the same song (remasters, edits, etc.):"));
    console.log();
    for (const group of fuzzyDupes) {
      console.log(formatGroup(group));
      console.log();
    }
  }

  const total = exactDupes.length + fuzzyDupes.length;
  console.log(chalk.dim(`─`.repeat(40)));
  console.log(`${chalk.bold(total)} duplicate group(s) found.`);
}

export function printArtistSummary(
  playlist: SimplifiedPlaylist,
  artists: ArtistCount[],
  totalTracks: number
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`${totalTracks} tracks`));
  console.log();
  console.log(chalk.bold("Songs by artist:"));
  console.log();

  const maxCount = artists[0]?.count ?? 0;
  const barWidth = 20;

  for (const { artist, count } of artists) {
    const filled = Math.round((count / maxCount) * barWidth);
    const bar = "█".repeat(filled) + chalk.dim("░".repeat(barWidth - filled));
    const countStr = String(count).padStart(4);
    console.log(`${chalk.dim(countStr)}  ${bar}  ${artist}`);
  }

  console.log();
  console.log(chalk.dim(`${artists.length} artist(s) total.`));
}

export function printAlbumSummary(
  playlist: SimplifiedPlaylist,
  albums: AlbumCount[],
  totalTracks: number
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`${totalTracks} tracks`));
  console.log();
  console.log(chalk.bold("Songs by album:"));
  console.log();

  const maxCount = albums[0]?.count ?? 0;

  for (const { album, artist, count } of albums) {
    const countStr = String(count).padStart(4);
    console.log(`${chalk.dim(countStr)}  ${bar(count, maxCount)}  ${chalk.bold(album)} ${chalk.dim(`— ${artist}`)}`);
  }

  console.log();
  console.log(chalk.dim(`${albums.length} album(s) total.`));
}

export function printDecades(
  playlist: SimplifiedPlaylist,
  decades: DecadeCount[],
  totalTracks: number
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`${totalTracks} tracks`));
  console.log();
  console.log(chalk.bold("Songs by decade:"));
  console.log();

  const maxCount = Math.max(...decades.map((d) => d.count));

  for (const { decade, count } of decades) {
    const pct = Math.round((count / totalTracks) * 100);
    const countStr = String(count).padStart(4);
    console.log(`${chalk.dim(countStr)}  ${bar(count, maxCount)}  ${decade} ${chalk.dim(`(${pct}%)`)}`);
  }

  console.log();
}

export function printLongest(
  playlist: SimplifiedPlaylist,
  tracks: TrackWithPosition[],
  n: number
): void {
  const sorted = [...tracks].sort((a, b) => b.duration_ms - a.duration_ms).slice(0, n);
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold(`Top ${n} longest tracks:`));
  console.log();
  for (const t of sorted) {
    console.log(`  ${formatMs(t.duration_ms).padEnd(10)}  ${chalk.bold(t.name)} ${chalk.dim("— " + t.artists.map(a => a.name).join(", "))}`);
  }
  console.log();
}

export function printShortest(
  playlist: SimplifiedPlaylist,
  tracks: TrackWithPosition[],
  n: number
): void {
  const sorted = [...tracks].sort((a, b) => a.duration_ms - b.duration_ms).slice(0, n);
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold(`Top ${n} shortest tracks:`));
  console.log();
  for (const t of sorted) {
    console.log(`  ${formatMs(t.duration_ms).padEnd(10)}  ${chalk.bold(t.name)} ${chalk.dim("— " + t.artists.map(a => a.name).join(", "))}`);
  }
  console.log();
}

export function printSearch(
  playlist: SimplifiedPlaylist,
  results: TrackWithPosition[],
  query: string
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`Search: "${query}"`));
  console.log();
  if (results.length === 0) {
    console.log(chalk.yellow("No matches found."));
    console.log();
    return;
  }
  for (const t of results) {
    const artists = t.artists.map(a => a.name).join(", ");
    console.log(`  #${String(t.position).padEnd(5)} ${chalk.bold(t.name)} ${chalk.dim("— " + artists)}`);
  }
  console.log();
  console.log(chalk.dim(`${results.length} result(s).`));
  console.log();
}

export function printTimeline(
  playlist: SimplifiedPlaylist,
  months: TimelineMonth[]
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold("Tracks added by month:"));
  console.log();

  const maxCount = Math.max(...months.map((m) => m.count));

  for (const { month, count } of months) {
    const [year, mon] = month.split("-");
    const label = `${year}-${mon}`;
    const countStr = String(count).padStart(4);
    console.log(`${chalk.dim(countStr)}  ${bar(count, maxCount)}  ${label}`);
  }

  console.log();
}

export function printRuntime(
  playlist: SimplifiedPlaylist,
  artists: ArtistRuntime[],
  totalTracks: number
): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`${totalTracks} tracks`));
  console.log();
  console.log(chalk.bold("Runtime by artist:"));
  console.log();

  const maxMs = artists[0]?.totalMs ?? 0;

  for (const { artist, totalMs, count } of artists) {
    const duration = formatMs(totalMs).padEnd(12);
    console.log(`${chalk.dim(duration)}  ${bar(totalMs, maxMs)}  ${artist} ${chalk.dim(`(${count} track${count !== 1 ? "s" : ""})`)}`);
  }

  console.log();
}

export function printOldest(
  playlist: SimplifiedPlaylist,
  tracks: TrackWithPosition[],
  n: number
): void {
  const sorted = [...tracks]
    .filter((t) => t.album.release_date)
    .sort((a, b) => a.album.release_date.localeCompare(b.album.release_date))
    .slice(0, n);

  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold(`${n} oldest tracks by release date:`));
  console.log();
  for (const t of sorted) {
    const artists = t.artists.map((a) => a.name).join(", ");
    console.log(`  ${chalk.dim(t.album.release_date.slice(0, 4).padEnd(6))}  ${chalk.bold(t.name)} ${chalk.dim("— " + artists)}`);
  }
  console.log();
}

export function printNewest(
  playlist: SimplifiedPlaylist,
  tracks: TrackWithPosition[],
  n: number
): void {
  const sorted = [...tracks]
    .filter((t) => t.album.release_date)
    .sort((a, b) => b.album.release_date.localeCompare(a.album.release_date))
    .slice(0, n);

  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold(`${n} newest tracks by release date:`));
  console.log();
  for (const t of sorted) {
    const artists = t.artists.map((a) => a.name).join(", ");
    console.log(`  ${chalk.dim(t.album.release_date.slice(0, 4).padEnd(6))}  ${chalk.bold(t.name)} ${chalk.dim("— " + artists)}`);
  }
  console.log();
}

export function printRecent(
  playlist: SimplifiedPlaylist,
  tracks: TrackWithPosition[],
  n: number
): void {
  const sorted = [...tracks]
    .filter((t) => t.added_at)
    .sort((a, b) => b.added_at!.localeCompare(a.added_at!))
    .slice(0, n);

  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold(`${n} most recently added tracks:`));
  console.log();
  for (const t of sorted) {
    const artists = t.artists.map((a) => a.name).join(", ");
    const date = t.added_at!.slice(0, 10);
    console.log(`  ${chalk.dim(date)}  ${chalk.bold(t.name)} ${chalk.dim("— " + artists)}`);
  }
  console.log();
}

export function printHistory(items: import("../api/history.js").PlayHistoryObject[]): void {
  console.log();
  console.log(chalk.bold("Recently played:"));
  console.log();
  for (const { track, played_at } of items) {
    const artists = track.artists.map((a) => a.name).join(", ");
    const d = new Date(played_at);
    const local = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    console.log(`  ${chalk.dim(local)}  ${chalk.bold(track.name)} ${chalk.dim("— " + artists)}`);
  }
  console.log();
  console.log(chalk.dim(`${items.length} track(s).`));
  console.log();
}

export function printCompare(
  playlistA: SimplifiedPlaylist,
  playlistB: SimplifiedPlaylist,
  common: TrackWithPosition[]
): void {
  console.log();
  console.log(`${chalk.bold.underline(playlistA.name)} ${chalk.dim("vs")} ${chalk.bold.underline(playlistB.name)}`);
  console.log();
  if (common.length === 0) {
    console.log(chalk.green("No tracks in common."));
    console.log();
    return;
  }
  console.log(chalk.bold(`${common.length} track(s) in common:`));
  console.log();
  for (const t of common) {
    const artists = t.artists.map(a => a.name).join(", ");
    console.log(`  ${chalk.bold(t.name)} ${chalk.dim("— " + artists)}`);
  }
  console.log();
}

export function printTopTracks(tracks: TrackObject[], timeRange: TimeRange): void {
  console.log();
  console.log(chalk.bold(`Your top ${tracks.length} tracks — ${TIME_RANGE_LABELS[timeRange]}:`));
  console.log();
  tracks.forEach((t, i) => {
    const artists = t.artists.map((a) => a.name).join(", ");
    const num = String(i + 1).padStart(2);
    console.log(`  ${chalk.dim(num + ".")}  ${chalk.bold(t.name)} ${chalk.dim("— " + artists)}`);
  });
  console.log();
}

export function printTopArtists(artists: TopArtistObject[], timeRange: TimeRange): void {
  console.log();
  console.log(chalk.bold(`Your top ${artists.length} artists — ${TIME_RANGE_LABELS[timeRange]}:`));
  console.log();
  artists.forEach((a, i) => {
    const num = String(i + 1).padStart(2);
    const genres = (a.genres ?? []).slice(0, 3).join(", ");
    console.log(`  ${chalk.dim(num + ".")}  ${chalk.bold(a.name)}${genres ? chalk.dim("  · " + genres) : ""}`);
  });
  console.log();
}

export function printMoodSummary(playlist: SimplifiedPlaylist, summary: PlaylistMoodSummary): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.dim(`Mood analysis — ${summary.trackCount} track(s)`));
  console.log();

  const label = (s: string) => s.padEnd(14);
  const norm = (v: number) => Math.max(0, Math.min(1, v));
  const loudnessNorm = norm((summary.avgLoudness + 60) / 60);

  const rows: [string, number, string][] = [
    ["Energy",       norm(summary.avgEnergy),       summary.avgEnergy.toFixed(2)],
    ["Danceability", norm(summary.avgDanceability),  summary.avgDanceability.toFixed(2)],
    ["Valence",      norm(summary.avgValence),       summary.avgValence.toFixed(2) + " (mood)"],
    ["Acousticness", norm(summary.avgAcousticness),  summary.avgAcousticness.toFixed(2)],
    ["Speechiness",  norm(summary.avgSpeechiness),   summary.avgSpeechiness.toFixed(2)],
    ["Loudness",     loudnessNorm,                   summary.avgLoudness.toFixed(1) + " dB"],
  ];

  for (const [name, value, display] of rows) {
    console.log(`  ${chalk.dim(label(name))}  ${bar(value, 1)}  ${display}`);
  }

  console.log(`  ${chalk.dim(label("Tempo"))}  ${"─".repeat(20)}  ${Math.round(summary.avgTempo)} BPM`);
  console.log();
}

export function printRemovalPlan(playlist: SimplifiedPlaylist, plan: RemovalPlan): void {
  console.log();
  console.log(chalk.bold.underline(playlist.name));
  console.log(chalk.bold(`Found ${plan.groups.length} duplicate group(s). The following will be removed:`));
  console.log();

  for (const group of plan.groups) {
    const artists = group.artists.join(", ");
    console.log(`  ${chalk.bold(group.trackName)} ${chalk.dim("— " + artists)}`);
    const [keepPos, ...removePosns] = group.positions;
    console.log(`    ${chalk.green("KEEP  ")} #${keepPos}`);
    for (const pos of removePosns) {
      console.log(`    ${chalk.red("REMOVE")} #${pos}`);
    }
    console.log();
  }

  console.log(chalk.dim(`Total: ${plan.toRemove.length} track(s) will be removed.`));
  console.log();
}
