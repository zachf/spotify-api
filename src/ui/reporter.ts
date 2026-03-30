import chalk from "chalk";
import type { DuplicateGroup, SimplifiedPlaylist, TrackWithPosition } from "../types/spotify.js";
import type { ArtistCount } from "../analysis/artistSummary.js";
import type { AlbumCount } from "../analysis/albumSummary.js";
import type { DecadeCount } from "../analysis/decades.js";

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
