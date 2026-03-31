import { apiFetch } from "./client.js";

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export async function removeTracksFromPlaylist(
  playlistId: string,
  trackUris: string[],
  token: string
): Promise<void> {
  for (const batch of chunk(trackUris, 100)) {
    await apiFetch(`/playlists/${playlistId}/items`, token, {
      method: "DELETE",
      body: JSON.stringify({ tracks: batch.map((uri) => ({ uri })) }),
    });
  }
}
