# Spotify Playlist Utility

An interactive CLI for analyzing your Spotify playlists. Find duplicates, explore stats, browse your listening history, and more.

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Register a Spotify app**

Go to [developer.spotify.com](https://developer.spotify.com), create an app, and add `http://localhost:8888/callback` as a redirect URI.

**3. Configure environment**
```bash
cp .env.example .env
```

Edit `.env` and set:
```
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_REDIRECT_URI=http://localhost:8888/callback
```

**4. Run**
```bash
npm start
```

On first run a browser window opens for Spotify login. Tokens are cached to `~/.spotify-dupes/tokens.json` and refreshed automatically.

## Commands

### Playlist selection
| Command | Description |
|---|---|
| `select` | Pick a playlist interactively (type to filter) |
| `select <url\|id>` | Load a playlist directly by URL or ID |

Includes a **Liked Songs** option at the top of the picker.

### Duplicate detection
| Command | Description |
|---|---|
| `dupes` | Find exact duplicates (same track ID added more than once) |
| `dupes fuzzy` | Also find near-duplicates (remasters, edits, different versions) |
| `remove dupes` | Remove exact duplicates, keeping the first occurrence (confirms before deleting) |

### Playlist analysis
| Command | Description |
|---|---|
| `artists` | Track count by artist, sorted descending with bar chart |
| `albums` | Track count by album, sorted descending with bar chart |
| `decades` | Track count by decade of release |
| `runtime` | Total runtime broken down by artist |
| `timeline` | Tracks added per month |
| `info` | Name, owner, track count, album count, total duration |

### Track browsing
| Command | Description |
|---|---|
| `longest [n]` | Top N longest tracks (default 10) |
| `shortest [n]` | Top N shortest tracks (default 10) |
| `oldest [n]` | N tracks with earliest release dates (default 10) |
| `newest [n]` | N tracks with most recent release dates (default 10) |
| `recent [n]` | N most recently added tracks (default 10) |
| `search <query>` | Search by track name or artist |

### Your listening data
| Command | Description |
|---|---|
| `history [n]` | Recently played tracks with local timestamps (default 50) |
| `top [tracks\|artists] [short_term\|medium_term\|long_term]` | Your top tracks or artists for a time range |

### Cross-playlist
| Command | Description |
|---|---|
| `compare` | Compare the loaded playlist against another — shows tracks in common |
| `list` | List all your playlists with track counts |

### Other
| Command | Description |
|---|---|
| `help` | Show command reference |
| `exit` | Quit |

## Architecture

```
src/
├── index.ts              # Entry point — auth then shell
├── auth/
│   ├── index.ts          # PKCE OAuth flow orchestration
│   ├── pkce.ts           # Code verifier / challenge generation
│   ├── server.ts         # Temporary Express server for OAuth redirect
│   └── tokenStore.ts     # Token persistence (~/.spotify-dupes/tokens.json)
├── api/
│   ├── client.ts         # Base fetch wrapper (Bearer token, 429 retry)
│   ├── playlists.ts      # Playlist listing and metadata
│   ├── tracks.ts         # Paginated track fetching (playlists + Liked Songs)
│   ├── top.ts            # Top tracks / artists
│   ├── history.ts        # Recently played
│   └── playlistMutations.ts  # Track removal
├── analysis/
│   ├── exactMatcher.ts   # Dedupe by track ID
│   ├── fuzzyMatcher.ts   # Dedupe by normalized name + artists
│   ├── artistSummary.ts  # Count tracks per artist
│   ├── albumSummary.ts   # Count tracks per album
│   ├── decades.ts        # Count tracks per decade
│   ├── timeline.ts       # Group tracks by added month
│   ├── runtimeByArtist.ts
│   └── dupeRemovalPlan.ts
├── ui/
│   ├── shell.ts          # REPL loop
│   ├── reporter.ts       # All console output (chalk formatting, bar charts)
│   └── prompt.ts         # Interactive playlist picker (@inquirer/prompts)
└── types/
    └── spotify.ts        # Shared TypeScript interfaces
```

## Notes

- Requires **Spotify Premium** on the app owner's account in dev mode.
- The `select` command only shows playlists you own.
- Track data is cached in memory for the session — re-running a command on the same playlist doesn't refetch.
- The `/audio-features` and `/recommendations` endpoints are blocked in Spotify dev mode and are not used.
