export interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  expires_at: number; // ms timestamp, set locally after token exchange
}

export interface SimplifiedArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SimplifiedAlbum {
  id: string;
  name: string;
  release_date: string;
  release_date_precision: "year" | "month" | "day";
}

export interface TrackObject {
  id: string | null;
  name: string;
  uri: string;
  duration_ms: number;
  artists: SimplifiedArtist[];
  album: SimplifiedAlbum;
}

export interface PlaylistItemObject {
  item: TrackObject | null;
  added_at: string;
  is_local: boolean;
}

export interface PagingObject<T> {
  items: T[];
  next: string | null;
  previous: string | null;
  total: number;
  limit: number;
  offset: number;
  href: string;
}

export interface SimplifiedPlaylist {
  id: string;
  name: string;
  description: string | null;
  uri: string;
  items: { total: number };
  owner: { display_name: string; id: string };
  public: boolean | null;
  collaborative: boolean;
}

export interface TrackWithPosition extends TrackObject {
  position: number; // 1-based index in the playlist
}

export interface DuplicateGroup {
  trackId: string | null;
  trackName: string;
  artists: string[];
  positions: number[];
}

export class SpotifyApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(`Spotify API error ${status}: ${message}`);
    this.name = "SpotifyApiError";
  }
}
