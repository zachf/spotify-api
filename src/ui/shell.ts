import readline from "readline";
import chalk from "chalk";
import { getUserPlaylists, getPlaylist, getCurrentUserId } from "../api/playlists.js";
import { getAllPlaylistTracks, getLikedTracks } from "../api/tracks.js";
import { findExactDuplicates } from "../analysis/exactMatcher.js";
import { findFuzzyDuplicates } from "../analysis/fuzzyMatcher.js";
import { countByArtist } from "../analysis/artistSummary.js";
import { countByDecade } from "../analysis/decades.js";
import { countByAlbum } from "../analysis/albumSummary.js";
import { groupByMonth } from "../analysis/timeline.js";
import { runtimeByArtist } from "../analysis/runtimeByArtist.js";
import { getRecentlyPlayed } from "../api/history.js";
import { printResults, printArtistSummary, printAlbumSummary, printDecades, printLongest, printShortest, printSearch, printCompare, printTimeline, printRuntime, printOldest, printNewest, printRecent, printHistory } from "./reporter.js";
import { selectPlaylist, LIKED_SONGS_ID } from "./prompt.js";
import type { SimplifiedPlaylist, TrackWithPosition } from "../types/spotify.js";

const PLAYLIST_URL_RE = /(?:playlist[/:])([\w]+)/;

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function parseLimit(arg: string, defaultN = 10): number {
  const n = parseInt(arg, 10);
  return isNaN(n) || n < 1 ? defaultN : n;
}

function parsePlaylistId(arg: string): string | null {
  const match = arg.match(PLAYLIST_URL_RE);
  if (match) return match[1];
  if (/^[\w]{22}$/.test(arg)) return arg;
  return null;
}

const HELP = `
${chalk.bold("Available commands:")}

  ${chalk.cyan("select")}              Pick a playlist interactively
  ${chalk.cyan("select")} ${chalk.dim("<url|id>")}     Load a playlist by URL or ID

  ${chalk.cyan("dupes")}               Check selected playlist for exact duplicates
  ${chalk.cyan("dupes fuzzy")}         Also check for near-duplicates (remasters, edits, etc.)

  ${chalk.cyan("artists")}             Show song count by artist, sorted by count
  ${chalk.cyan("albums")}              Show song count by album, sorted by count
  ${chalk.cyan("decades")}             Show song count by decade

  ${chalk.cyan("longest")} ${chalk.dim("[n]")}         Show the N longest tracks (default 10)
  ${chalk.cyan("shortest")} ${chalk.dim("[n]")}        Show the N shortest tracks (default 10)
  ${chalk.cyan("oldest")} ${chalk.dim("[n]")}          Show the N oldest tracks by release date (default 10)
  ${chalk.cyan("newest")} ${chalk.dim("[n]")}          Show the N newest tracks by release date (default 10)
  ${chalk.cyan("recent")} ${chalk.dim("[n]")}          Show the N most recently added tracks (default 10)

  ${chalk.cyan("runtime")}             Show total runtime broken down by artist
  ${chalk.cyan("timeline")}            Show tracks added per month

  ${chalk.cyan("history")} ${chalk.dim("[n]")}          Show your recently played tracks (default 50)

  ${chalk.cyan("search")} ${chalk.dim("<query>")}      Search for a track by name or artist
  ${chalk.cyan("compare")}             Compare selected playlist with another

  ${chalk.cyan("list")}                List all your playlists

  ${chalk.cyan("info")}                Show details about the currently loaded playlist

  ${chalk.cyan("help")}                Show this help screen
  ${chalk.cyan("exit")}                Quit
`;

function prompt(rl: readline.Interface): Promise<string | null> {
  return new Promise((resolve) => {
    const onClose = () => resolve(null);
    rl.question(chalk.cyan("› "), (answer) => {
      rl.removeListener("close", onClose);
      resolve(answer);
    });
    rl.once("close", onClose);
  });
}

export async function runShell(token: string): Promise<void> {
  let playlist: SimplifiedPlaylist | null = null;
  let tracks: TrackWithPosition[] | null = null;

  console.log(chalk.bold.green("\nSpotify Playlist Utility"));
  console.log(chalk.dim('Type "help" for available commands.\n'));

  const userId = await getCurrentUserId(token);

  const onClose = () => { console.log("\nGoodbye."); process.exit(0); };

  // Single persistent readline — only closed/recreated around inquirer calls
  let rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on("close", onClose);

  while (true) {
    const raw = await prompt(rl);
    if (raw === null) break;

    const line = raw.trim();
    if (!line) continue;

    const [cmd, ...rest] = line.split(/\s+/);
    const arg = rest.join(" ");

    try {
      switch (cmd.toLowerCase()) {
        case "help":
        case "?":
          console.log(HELP);
          break;

        case "select": {
          if (arg) {
            const id = parsePlaylistId(arg);
            if (!id) {
              console.log(chalk.red(`Could not parse a playlist ID from: ${arg}`));
              break;
            }
            process.stdout.write("Loading playlist...\r");
            playlist = await getPlaylist(id, token);
            tracks = null;
            process.stdout.write(" ".repeat(30) + "\r");
            console.log(chalk.green(`✓ Loaded: ${playlist.name} (${playlist.items?.total ?? "?"} tracks)`));
          } else {
            process.stdout.write("Fetching your playlists...\r");
            const playlists = await getUserPlaylists(token);
            process.stdout.write(" ".repeat(30) + "\r");

            // Close readline before handing stdin to inquirer, then recreate after
            rl.removeListener("close", onClose);
            rl.close();
            playlist = await selectPlaylist(playlists.filter(p => p.owner.id === userId));
            rl = readline.createInterface({ input: process.stdin, output: process.stdout });
            rl.on("close", onClose);

            tracks = null;
            console.log(chalk.green(`✓ Selected: ${playlist.name}`));
          }
          break;
        }

        case "dupes": {
          if (!playlist) {
            console.log(chalk.yellow('No playlist loaded. Run "select" first.'));
            break;
          }
          tracks = await ensureTracks(playlist, tracks, token);
          const fuzzy = arg === "fuzzy";
          const exactDupes = findExactDuplicates(tracks);
          const exactIds = new Set(exactDupes.flatMap((g) => (g.trackId ? [g.trackId] : [])));
          const fuzzyDupes = fuzzy ? findFuzzyDuplicates(tracks, exactIds) : [];
          const totalTracks = playlist.items?.total ?? tracks.length;
          const skipped = Math.max(0, totalTracks - tracks.length);
          printResults(playlist, exactDupes, fuzzyDupes, tracks.length, skipped);
          break;
        }

        case "artists": {
          if (!playlist) {
            console.log(chalk.yellow('No playlist loaded. Run "select" first.'));
            break;
          }
          tracks = await ensureTracks(playlist, tracks, token);
          printArtistSummary(playlist, countByArtist(tracks), tracks.length);
          break;
        }

        case "albums": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printAlbumSummary(playlist, countByAlbum(tracks), tracks.length);
          break;
        }

        case "decades": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printDecades(playlist, countByDecade(tracks), tracks.length);
          break;
        }

        case "longest": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printLongest(playlist, tracks, parseLimit(arg));
          break;
        }

        case "shortest": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printShortest(playlist, tracks, parseLimit(arg));
          break;
        }

        case "oldest": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printOldest(playlist, tracks, parseLimit(arg));
          break;
        }

        case "newest": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printNewest(playlist, tracks, parseLimit(arg));
          break;
        }

        case "recent": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printRecent(playlist, tracks, parseLimit(arg));
          break;
        }

        case "runtime": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printRuntime(playlist, runtimeByArtist(tracks), tracks.length);
          break;
        }

        case "timeline": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          printTimeline(playlist, groupByMonth(tracks));
          break;
        }

        case "history": {
          const limit = parseLimit(arg, 50);
          process.stdout.write("Fetching recently played...\r");
          const items = await getRecentlyPlayed(token, limit);
          process.stdout.write(" ".repeat(40) + "\r");
          printHistory(items);
          break;
        }

        case "search": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          if (!arg) { console.log(chalk.yellow('Usage: search <query>')); break; }
          tracks = await ensureTracks(playlist, tracks, token);
          const q = arg.toLowerCase();
          const results = tracks.filter((t) =>
            t.name.toLowerCase().includes(q) ||
            t.artists.some((a) => a.name.toLowerCase().includes(q))
          );
          printSearch(playlist, results, arg);
          break;
        }

        case "compare": {
          if (!playlist) { console.log(chalk.yellow('No playlist loaded. Run "select" first.')); break; }
          tracks = await ensureTracks(playlist, tracks, token);

          process.stdout.write("Fetching your playlists...\r");
          const comparePlaylists = await getUserPlaylists(token);
          process.stdout.write(" ".repeat(30) + "\r");

          rl.removeListener("close", onClose);
          rl.close();
          const otherPlaylist = await selectPlaylist(comparePlaylists.filter(p => p.id !== playlist!.id));
          rl = readline.createInterface({ input: process.stdin, output: process.stdout });
          rl.on("close", onClose);

          const otherTracks = await ensureTracks(otherPlaylist, null, token);
          const otherIds = new Set(otherTracks.map((t) => t.id));
          const common = tracks.filter((t) => t.id && otherIds.has(t.id));
          printCompare(playlist, otherPlaylist, common);
          break;
        }

        case "list": {
          process.stdout.write("Fetching your playlists...\r");
          const allPlaylists = await getUserPlaylists(token);
          process.stdout.write(" ".repeat(30) + "\r");
          console.log();
          console.log(chalk.bold(`Your playlists (${allPlaylists.length}):`));
          console.log();
          for (const p of allPlaylists) {
            const count = p.items?.total ?? "?";
            console.log(`  ${chalk.bold(p.name)} ${chalk.dim(`· ${count} tracks`)}`);
          }
          console.log();
          break;
        }

        case "info": {
          if (!playlist) {
            console.log(chalk.yellow('No playlist loaded. Run "select" first.'));
            break;
          }
          tracks = await ensureTracks(playlist, tracks, token);
          const totalMs = tracks.reduce((sum, t) => sum + t.duration_ms, 0);
          const uniqueAlbums = new Set(tracks.map((t) => t.album.id)).size;
          console.log();
          console.log(`${chalk.bold("Name:")}     ${playlist.name}`);
          console.log(`${chalk.bold("Owner:")}    ${playlist.owner.display_name}`);
          console.log(`${chalk.bold("Tracks:")}   ${tracks.length}`);
          console.log(`${chalk.bold("Albums:")}   ${uniqueAlbums}`);
          console.log(`${chalk.bold("Duration:")} ${formatDuration(totalMs)}`);
          if (playlist.description) {
            console.log(`${chalk.bold("Desc:")}     ${playlist.description}`);
          }
          console.log();
          break;
        }

        case "exit":
        case "quit":
        case "q":
          console.log("Goodbye.");
          process.exit(0);

        default:
          console.log(chalk.red(`Unknown command: "${cmd}". Type "help" for available commands.`));
      }
    } catch (err) {
      console.error(chalk.red(err instanceof Error ? err.message : String(err)));
    }
  }
}

async function ensureTracks(
  playlist: SimplifiedPlaylist,
  cached: TrackWithPosition[] | null,
  token: string
): Promise<TrackWithPosition[]> {
  if (cached) return cached;

  const isLiked = playlist.id === LIKED_SONGS_ID;
  const onProgress = (done: number, total: number) => {
    process.stdout.write(`Fetching tracks... ${done}/${total}\r`);
  };

  const result = await (isLiked
    ? getLikedTracks(token, onProgress)
    : getAllPlaylistTracks(playlist.id, token, onProgress));

  process.stdout.write(" ".repeat(40) + "\r");
  return result;
}
