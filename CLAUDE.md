# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Run the interactive shell (entry point)
npm run build      # Compile TypeScript to dist/
```

No test suite exists yet.

## Environment Setup

Copy `.env.example` to `.env` and set `SPOTIFY_CLIENT_ID`. Register your app at developer.spotify.com with redirect URI `http://localhost:8888/callback`. Tokens are cached to `~/.spotify-dupes/tokens.json` after first auth.

## Architecture

The app is an interactive CLI shell that authenticates via Spotify PKCE OAuth, then lets the user run analysis commands against a selected playlist.

**Entry point:** `src/index.ts` — authenticates and hands off to `src/ui/shell.ts`, which runs the REPL loop.

**Auth flow** (`src/auth/`): `index.ts` orchestrates the full PKCE flow — loads cached tokens, refreshes if expired, or opens a browser for full auth. `server.ts` spins up a temporary Express server on port 8888 to capture the OAuth redirect code. Tokens are persisted to disk via `tokenStore.ts`.

**API layer** (`src/api/`): All requests go through `client.ts` which handles 429 retries and attaches the Bearer token. Key endpoints:
- `playlists.ts` — fetch user's playlists and individual playlist metadata
- `tracks.ts` — paginate `/playlists/{id}/items` (post-Feb 2026 endpoint) or `/me/tracks` for Liked Songs

**Analysis** (`src/analysis/`): Pure functions that operate on `TrackWithPosition[]`:
- `exactMatcher.ts` — dedupes by `track.id`
- `fuzzyMatcher.ts` — dedupes by normalized name+artists key
- `artistSummary.ts` — counts tracks per artist

**UI** (`src/ui/`): `shell.ts` manages the readline REPL — one persistent `readline.Interface` that is closed/recreated only around `selectPlaylist()` calls (which need to take over stdin via `@inquirer/prompts`). `reporter.ts` handles all console output with chalk formatting. `prompt.ts` wraps inquirer for the interactive playlist picker and injects a "Liked Songs" synthetic entry at the top.

## Spotify API Notes (February 2026 Dev Mode)

- Playlist tracks endpoint changed from `/playlists/{id}/tracks` → `/playlists/{id}/items`
- Response field renamed: `item.track` → `item.item`
- Playlist object field renamed: `playlist.tracks` → `playlist.items`
- `/recommendations` endpoint returns 404 for dev mode apps (silently removed)
- Track details only available for playlists the user owns or collaborates on
- Dev mode requires Spotify Premium on the app owner's account
