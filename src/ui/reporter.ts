import chalk from "chalk";
import type { DuplicateGroup, SimplifiedPlaylist } from "../types/spotify.js";
import type { ArtistCount } from "../analysis/artistSummary.js";

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
