import { search, input } from "@inquirer/prompts";
import type { SimplifiedPlaylist } from "../types/spotify.js";

export const LIKED_SONGS_ID = "__liked__";

const LIKED_SONGS_ENTRY: SimplifiedPlaylist = {
  id: LIKED_SONGS_ID,
  name: "Liked Songs",
  description: null,
  uri: "",
  tracks: { total: 0 },
  owner: { display_name: "", id: "" },
  public: false,
  collaborative: false,
};

export async function selectPlaylist(
  playlists: SimplifiedPlaylist[]
): Promise<SimplifiedPlaylist> {
  if (playlists.length === 0) {
    console.log("No playlists found on your account. Enter a playlist ID manually.");
    const id = await input({ message: "Playlist ID:" });
    return { id, name: id, description: null, uri: "", tracks: { total: 0 }, owner: { display_name: "", id: "" }, public: null, collaborative: false };
  }

  const allOptions = [LIKED_SONGS_ENTRY, ...playlists];

  const id = await search<string>({
    message: "Select a playlist (type to filter):",
    source: (term) => {
      const filtered = term
        ? allOptions.filter((p) =>
            p.name.toLowerCase().includes(term.toLowerCase())
          )
        : allOptions;

      return filtered.map((p) => ({
        name: p.id === LIKED_SONGS_ID
          ? "Liked Songs"
          : `${p.name} (${p.tracks?.total ?? "?"} tracks)`,
        value: p.id,
        description: p.id === LIKED_SONGS_ID ? "Your saved tracks" : p.owner.display_name,
      }));
    },
  });

  return allOptions.find((p) => p.id === id)!;
}
