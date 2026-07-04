import { create } from 'zustand';
import { api, Track, Lyrics } from '../api/client';

interface Entry extends Lyrics { loading: boolean; }

interface LyricsState {
  cache: Record<string, Entry>;
  fetch: (track: Track) => void;
}

// Caches lyrics per track and prefetches them as soon as a song starts, so the
// lyrics view opens instantly instead of loading on demand.
export const useLyricsStore = create<LyricsState>((set, get) => ({
  cache: {},
  fetch(track) {
    const id = track.id;
    const existing = get().cache[id];
    if (existing && !existing.loading) return; // already have it
    set((s) => ({ cache: { ...s.cache, [id]: { synced: null, plain: null, loading: true } } }));
    api.getLyrics(track.artist, track.title, track.album, track.duration)
      .then((l) => set((s) => ({ cache: { ...s.cache, [id]: { ...l, loading: false } } })))
      .catch(() => set((s) => ({ cache: { ...s.cache, [id]: { synced: null, plain: null, loading: false } } })));
  },
}));
