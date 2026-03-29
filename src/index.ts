import "dotenv/config";
import { getAccessToken } from "./auth/index.js";
import { getUserPlaylists, getPlaylist } from "./api/playlists.js";
import { getAllPlaylistTracks, getLikedTracks } from "./api/tracks.js";
import { findExactDuplicates } from "./analysis/exactMatcher.js";
import { findFuzzyDuplicates } from "./analysis/fuzzyMatcher.js";
import { countByArtist } from "./analysis/artistSummary.js";
import { selectPlaylist, LIKED_SONGS_ID } from "./ui/prompt.js";
import { printResults, printArtistSummary } from "./ui/reporter.js";

const PLAYLIST_URL_RE = /(?:playlist[/:])([\w]+)/;

function parsePlaylistArg(arg: string): string | null {
  const match = arg.match(PLAYLIST_URL_RE);
  if (match) return match[1];
  // Bare ID: 22 alphanumeric chars
  if (/^[\w]{22}$/.test(arg)) return arg;
  return null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fuzzy = args.includes("--fuzzy");
  const artistMode = args.includes("--artists");
  const playlistArg = args.find((a) => !a.startsWith("--"));

  const token = await getAccessToken();

  let playlist: Awaited<ReturnType<typeof getPlaylist>>;

  if (playlistArg) {
    const parsed = parsePlaylistArg(playlistArg);
    if (!parsed) {
      console.error(`Could not parse playlist ID from: ${playlistArg}`);
      process.exit(1);
    }
    playlist = await getPlaylist(parsed, token);
  } else {
    process.stdout.write("Fetching your playlists...\r");
    const playlists = await getUserPlaylists(token);
    process.stdout.write(" ".repeat(30) + "\r");
    playlist = await selectPlaylist(playlists);
  }

  const totalTracks = playlist.tracks?.total ?? 0;

  if (totalTracks > 500) {
    console.log(
      `Warning: this playlist has ${totalTracks} tracks — fetching may take a while.`
    );
  }

  const isLikedSongs = playlist.id === LIKED_SONGS_ID;
  const tracks = await (isLikedSongs
    ? getLikedTracks(token, (done, total) => {
        process.stdout.write(`Fetching tracks... ${done}/${total}\r`);
      })
    : getAllPlaylistTracks(playlist.id, token, (done, total) => {
        process.stdout.write(`Fetching tracks... ${done}/${total}\r`);
      }));
  process.stdout.write(" ".repeat(40) + "\r");

  const localFilesSkipped = Math.max(0, totalTracks - tracks.length);

  if (artistMode) {
    printArtistSummary(playlist, countByArtist(tracks), tracks.length);
    return;
  }

  const exactDupes = findExactDuplicates(tracks);
  const exactIds = new Set(exactDupes.flatMap((g) => (g.trackId ? [g.trackId] : [])));
  const fuzzyDupes = fuzzy ? findFuzzyDuplicates(tracks, exactIds) : [];

  printResults(playlist, exactDupes, fuzzyDupes, tracks.length, localFilesSkipped);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
