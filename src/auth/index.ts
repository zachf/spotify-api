import open from "open";
import { generateCodeVerifier, generateCodeChallenge } from "./pkce.js";
import { waitForAuthCode } from "./server.js";
import { saveTokens, loadTokens, isAccessTokenExpired } from "./tokenStore.js";
import type { SpotifyToken } from "../types/spotify.js";
import { SpotifyApiError } from "../types/spotify.js";

const SCOPES = "playlist-read-private playlist-read-collaborative user-library-read";
const PORT = 8888;

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

async function exchangeCodeForTokens(
  code: string,
  verifier: string,
  clientId: string,
  redirectUri: string
): Promise<SpotifyToken> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new SpotifyApiError(res.status, body);
  }

  const data = await res.json() as Omit<SpotifyToken, "expires_at">;
  return { ...data, expires_at: Date.now() + data.expires_in * 1000 };
}

async function refreshAccessToken(
  refreshToken: string,
  clientId: string
): Promise<SpotifyToken> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new SpotifyApiError(res.status, body);
  }

  const data = await res.json() as Omit<SpotifyToken, "expires_at">;
  return {
    ...data,
    // Spotify may not return a new refresh_token — keep the old one if absent
    refresh_token: data.refresh_token ?? refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
  };
}

export async function getAccessToken(): Promise<string> {
  const clientId = getEnv("SPOTIFY_CLIENT_ID");
  const redirectUri = getEnv("SPOTIFY_REDIRECT_URI");

  // 1. Try cached tokens
  let tokens = loadTokens();

  if (tokens && !isAccessTokenExpired(tokens)) {
    return tokens.access_token;
  }

  // 2. Try refreshing
  if (tokens?.refresh_token) {
    try {
      tokens = await refreshAccessToken(tokens.refresh_token, clientId);
      saveTokens(tokens);
      return tokens.access_token;
    } catch {
      // Refresh failed — fall through to full auth flow
    }
  }

  // 3. Full PKCE browser flow
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const authUrl = new URL("https://accounts.spotify.com/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("code_challenge", challenge);

  console.log("Opening Spotify login in your browser...");
  await open(authUrl.toString());

  const code = await waitForAuthCode(PORT);
  tokens = await exchangeCodeForTokens(code, verifier, clientId, redirectUri);
  saveTokens(tokens);

  return tokens.access_token;
}
