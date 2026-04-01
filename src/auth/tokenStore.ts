import fs from "fs";
import path from "path";
import os from "os";
import type { SpotifyToken } from "../types/spotify.js";

const TOKEN_DIR = path.join(os.homedir(), ".spotify-dupes");
const TOKEN_FILE = path.join(TOKEN_DIR, "tokens.json");
const EXPIRY_BUFFER_MS = 60_000;

export function saveTokens(tokens: SpotifyToken): void {
  if (!fs.existsSync(TOKEN_DIR)) {
    fs.mkdirSync(TOKEN_DIR, { recursive: true });
  }
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2), { mode: 0o600 });
}

export function loadTokens(): SpotifyToken | null {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8")) as SpotifyToken;
  } catch {
    return null;
  }
}

export function isAccessTokenExpired(tokens: SpotifyToken): boolean {
  return tokens.expires_at < Date.now() + EXPIRY_BUFFER_MS;
}
