// In dev, Vite proxies /api to the backend (see vite.config.ts).
export const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const api = {
  // Feed
  getFeed: () => request<FeedSection[]>('/feed'),
  refreshFeed: () => request('/feed/refresh', { method: 'POST' }),

  // Stats
  getStats: () => request<Stats>('/stats'),

  // Search (Deezer)
  search: (q: string) => request<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  suggest: (q: string) => request<Suggestions>(`/search/suggest?q=${encodeURIComponent(q)}`),
  searchYouTube: (q: string) => request<YTResult[]>(`/tracks/search?q=${encodeURIComponent(q)}`),

  // Library
  getTracks: () => request<Track[]>('/tracks'),
  addYouTubeTrack: (data: YTResult) =>
    request<Track>('/tracks/youtube', { method: 'POST', body: JSON.stringify(data) }),
  resolveTrack: (song: Partial<Song>) =>
    request<Track>('/tracks/resolve', { method: 'POST', body: JSON.stringify(song) }),
  downloadTrack: (id: string) =>
    request<{ downloaded_path: string }>(`/tracks/${id}/download`, { method: 'POST' }),
  removeDownload: (id: string) => request(`/tracks/${id}/download`, { method: 'DELETE' }),
  storage: () => request<{ count: number; bytes: number }>('/tracks/storage'),
  prefetch: (id: string) => request(`/tracks/${id}/prefetch`, { method: 'POST' }).catch(() => {}),
  prewarmSong: (title: string, artist: string | null) =>
    request('/tracks/prewarm-song', { method: 'POST', body: JSON.stringify({ title, artist }) }).catch(() => {}),
  logPlayed: (id: string) => request(`/tracks/${id}/played`, { method: 'POST' }),
  radio: (seed: { artist_id?: number | null; title?: string | null; artist?: string | null }) => {
    const p = new URLSearchParams();
    if (seed.artist_id) p.set('artist_id', String(seed.artist_id));
    if (seed.title) p.set('title', seed.title);
    if (seed.artist) p.set('artist', seed.artist);
    return request<Song[]>(`/tracks/radio?${p}`);
  },
  deleteTrack: (id: string) => request(`/tracks/${id}`, { method: 'DELETE' }),
  streamUrl: (id: string) => `${BASE_URL}/tracks/${id}/stream`,

  // Lyrics
  getLyrics: (artist: string | null, title: string, album?: string | null, duration?: number | null) => {
    const p = new URLSearchParams({ title });
    if (artist) p.set('artist', artist);
    if (album) p.set('album', album);
    if (duration) p.set('duration', String(duration));
    return request<Lyrics>(`/lyrics?${p}`);
  },

  // Playlists
  getPlaylists: () => request<Playlist[]>('/playlists'),
  getPlaylist: (id: string) => request<Playlist>(`/playlists/${id}`),
  createPlaylist: (name: string) =>
    request<Playlist>('/playlists', { method: 'POST', body: JSON.stringify({ name }) }),
  getPlaylistTracks: (id: string) => request<Track[]>(`/playlists/${id}/tracks`),
  addToPlaylist: (playlistId: string, trackId: string) =>
    request(`/playlists/${playlistId}/tracks`, { method: 'POST', body: JSON.stringify({ track_id: trackId }) }),
  removeFromPlaylist: (playlistId: string, trackId: string) =>
    request(`/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' }),
  reorderPlaylist: (playlistId: string, order: string[]) =>
    request(`/playlists/${playlistId}/reorder`, { method: 'PUT', body: JSON.stringify({ order }) }),
  setPlaylistCover: (playlistId: string, cover: string | null) =>
    request(`/playlists/${playlistId}/cover`, { method: 'PUT', body: JSON.stringify({ cover }) }),
  deletePlaylist: (id: string) => request(`/playlists/${id}`, { method: 'DELETE' }),

  // Artists (Deezer)
  searchArtists: (q: string) => request<ArtistResult[]>(`/artists/search?q=${encodeURIComponent(q)}`),
  getArtist: (deezerId: number) => request<ArtistResult>(`/artists/deezer/${deezerId}`),
  getArtistTop: (deezerId: number) => request<Song[]>(`/artists/deezer/${deezerId}/top`),
  getArtistAlbums: (deezerId: number) => request<Album[]>(`/artists/deezer/${deezerId}/albums`),

  // Albums
  getAlbum: (deezerId: number) => request<AlbumDetail>(`/albums/${deezerId}`),
  searchAlbums: (q: string) => request<Album[]>(`/albums/search?q=${encodeURIComponent(q)}`),

  // Following
  getFollowed: () => request<Followed[]>('/artists'),
  follow: (a: { deezer_id: number; name: string; picture: string | null }) =>
    request<Followed>('/artists/follow', { method: 'POST', body: JSON.stringify(a) }),
  unfollow: (deezerId: number) => request(`/artists/follow/${deezerId}`, { method: 'DELETE' }),

  // Likes
  getLikedSongs: () => request<LikedSong[]>('/likes/songs'),
  likeSong: (s: Partial<Song>) => request<LikedSong>('/likes/songs', { method: 'POST', body: JSON.stringify(s) }),
  unlikeSong: (deezerId: number) => request(`/likes/songs/${deezerId}`, { method: 'DELETE' }),
  hideSong: (title: string, artist: string | null) =>
    request('/prefs/hide-song', { method: 'POST', body: JSON.stringify({ title, artist }) }).catch(() => {}),
  blockArtist: (artist: string) =>
    request('/prefs/block-artist', { method: 'POST', body: JSON.stringify({ artist }) }).catch(() => {}),
  clearHistory: () => request('/prefs/clear-history', { method: 'POST' }).catch(() => {}),

  getLikedAlbums: () => request<LikedAlbum[]>('/likes/albums'),
  likeAlbum: (a: { deezer_id: number; title: string; artist: string | null; cover: string | null }) =>
    request<LikedAlbum>('/likes/albums', { method: 'POST', body: JSON.stringify(a) }),
  unlikeAlbum: (deezerId: number) => request(`/likes/albums/${deezerId}`, { method: 'DELETE' }),
};

// ---- Types ----

export interface Track {
  id: string;
  title: string;
  artist: string | null;
  album: string | null;
  duration: number | null;
  thumbnail: string | null;
  source: 'local' | 'youtube';
  youtube_id: string | null;
  downloaded_path: string | null;
  created_at: number;
}

// A song from Deezer (metadata only — resolveTrack() makes it playable)
export interface Song {
  deezer_id: number;
  title: string;
  artist: string | null;
  artist_id: number | null;
  album: string | null;
  album_id: number | null;
  thumbnail: string | null;
  duration: number | null;
}

export interface Album {
  deezer_id: number;
  title: string;
  artist: string | null;
  artist_id: number | null;
  cover: string | null;
  release_date: string | null;
  nb_tracks: number | null;
}

export interface AlbumDetail extends Album {
  tracks: Song[];
}

export interface ArtistResult {
  deezer_id: number;
  name: string;
  picture: string | null;
  nb_fan: number | null;
}

export interface YTResult {
  youtube_id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  thumbnail: string | null;
}

export interface Playlist { id: string; name: string; created_at: number; cover: string | null; collage: string[]; titles?: string[]; }
export interface Followed { id: string; name: string; deezer_id: number | null; picture: string | null; }
export interface LikedSong extends Song { id: string; }
export interface LikedAlbum { id: string; deezer_id: number; title: string; artist: string | null; cover: string | null; }

export interface StatArtist { name: string; plays: number; thumbnail: string | null; }
export interface Stats { topTracks: (Track & { plays: number })[]; topArtists: StatArtist[]; totalPlays: number; since: number | null; }

export interface SearchResults { artists: ArtistResult[]; tracks: Song[]; albums: Album[]; }
export interface Suggestions { artists: ArtistResult[]; tracks: Song[]; }

export interface LyricLine { time: number; text: string; }
export interface Lyrics { synced: LyricLine[] | null; plain: string | null; }

export interface FeedSection {
  type: string;
  kind: 'tracks' | 'songs' | 'albums' | 'artists' | 'quickpicks' | 'playlists';
  title: string;
  items: any[];
}

// A playable item is either an already-resolved Track or a Deezer Song.
export type PlayItem = Track | Song;
export function isTrack(item: PlayItem): item is Track {
  return (item as Track).source !== undefined && (item as Track).id !== undefined;
}
