import { apiFetch } from "./client.js";
import { SpotifyApiError } from "../types/spotify.js";
import type { AudioFeatures } from "../types/spotify.js";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function getAudioFeatures(
  trackId: string,
  token: string
): Promise<AudioFeatures | null> {
  try {
    return await apiFetch<AudioFeatures>(`/audio-features/${trackId}`, token);
  } catch (err) {
    if (err instanceof SpotifyApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getAudioFeaturesForTracks(
  trackIds: string[],
  token: string,
  onProgress?: (done: number, total: number) => void
): Promise<AudioFeatures[]> {
  const results: AudioFeatures[] = [];

  for (let i = 0; i < trackIds.length; i++) {
    const features = await getAudioFeatures(trackIds[i], token);
    if (features) results.push(features);
    onProgress?.(i + 1, trackIds.length);
    if (i < trackIds.length - 1) await sleep(100);
  }

  return results;
}
