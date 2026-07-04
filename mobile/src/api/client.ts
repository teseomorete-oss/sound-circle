// Change this to your computer's local IP address
export const BASE_URL = 'http://192.168.1.100:3000/api';

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

  // Search
  search: (q: string) => request<YTResult[]>(`/tracks/search?q=${encodeURIComponent(q)}`),

  // Library
  getTracks: () => request<Track[]>('/tracks'),
  addYouTubeTrack: (data: YTResult) =>
    request<Track>('/tracks/youtube', { method: 'POST', body: JSON.stringify(data) }),
  downloadTrack: (id: string) =>
    request<{ downloaded_path: string }>(`/tracks/${id}/download`, { method: 'POST' }),
  logPlayed: (id: string) =>
    request(`/tracks/${id}/played`, { method: 'POST' }),
  deleteTrack: (id: string) =>
    request(`/tracks/${id}`, { method: 'DELETE' }),

  // Stream URL
  streamUrl: (id: string) => `${BASE_URL}/tracks/${id}/stream`,

  // Playlists
  getPlaylists: () => request<Playlist[]>('/playlists'),
  createPlaylist: (name: string) =>
    request<Playlist>('/playlists', { method: 'POST', body: JSON.stringify({ name }) }),
  getPlaylistTracks: (id: string) => request<Track[]>(`/playlists/${id}/tracks`),
  addToPlaylist: (playlistId: string, trackId: string) =>
    request(`/playlists/${playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ track_id: trackId }),
    }),
  removeFromPlaylist: (playlistId: string, trackId: string) =>
    request(`/playlists/${playlistId}/tracks/${trackId}`, { method: 'DELETE' }),
  deletePlaylist: (id: string) =>
    request(`/playlists/${id}`, { method: 'DELETE' }),

  // Artists
  getArtists: () => request<Artist[]>('/artists'),
  followArtist: (name: string, youtube_channel_id?: string) =>
    request<Artist>('/artists', {
      method: 'POST',
      body: JSON.stringify({ name, youtube_channel_id }),
    }),
  unfollowArtist: (id: string) => request(`/artists/${id}`, { method: 'DELETE' }),
};

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

export interface YTResult {
  youtube_id: string;
  title: string;
  artist: string | null;
  duration: number | null;
  thumbnail: string | null;
}

export interface Playlist {
  id: string;
  name: string;
  created_at: number;
}

export interface Artist {
  id: string;
  name: string;
  youtube_channel_id: string | null;
}

export interface FeedSection {
  type: 'recently_played' | 'suggestions' | 'new_releases';
  title: string;
  items: Track[];
}
