import { create } from 'zustand';
import { api, Track, PlayItem, isTrack, Song } from '../api/client';
import { useSettings } from './settings';

export interface PendingInfo { title: string; artist: string | null; thumbnail: string | null; }

interface PlayerState {
  items: PlayItem[];       // queue — may contain unresolved Deezer songs
  index: number;
  currentTrack: Track | null; // the resolved, playable track
  pending: PendingInfo | null; // metadata shown instantly while a track resolves
  isPlaying: boolean;
  loading: boolean;
  loop: boolean;

  queueOpen: boolean;

  play: (items: PlayItem[], startIndex?: number) => Promise<void>;
  playOne: (item: PlayItem) => Promise<void>;
  playNext: (item: PlayItem) => void;
  addToQueue: (item: PlayItem) => void;
  removeAt: (absIndex: number) => void;
  moveUpcoming: (fromAbs: number, toAbs: number) => void;
  setQueueOpen: (v: boolean) => void;
  toggleQueue: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  toggleLoop: () => void;
}

// Resolve a queue item to a playable Track (Deezer songs hit the resolve API).
async function resolve(item: PlayItem): Promise<Track> {
  if (isTrack(item)) return item;
  return api.resolveTrack(item);
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  items: [],
  index: 0,
  currentTrack: null,
  pending: null,
  isPlaying: false,
  loading: false,
  loop: false,
  queueOpen: false,

  playNext(item) {
    const { items, index, currentTrack } = get();
    if (!currentTrack) { get().play([item], 0); return; }
    const ni = [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
    set({ items: ni, queueOpen: true });
  },

  addToQueue(item) {
    const { items, currentTrack } = get();
    if (!currentTrack) { get().play([item], 0); return; }
    set({ items: [...items, item], queueOpen: true });
  },

  removeAt(absIndex) {
    const { items, index } = get();
    if (absIndex <= index) return;
    set({ items: items.filter((_, i) => i !== absIndex) });
  },

  moveUpcoming(fromAbs, toAbs) {
    const { items, index } = get();
    if (fromAbs <= index || toAbs <= index) return;
    const arr = [...items];
    const [m] = arr.splice(fromAbs, 1);
    arr.splice(toAbs, 0, m);
    set({ items: arr });
  },

  setQueueOpen(v) { set({ queueOpen: v }); },
  toggleQueue() { set((s) => ({ queueOpen: !s.queueOpen })); },

  async play(items, startIndex = 0) {
    set({ items, index: startIndex, loading: true, isPlaying: true });
    await loadIndex(set, get, startIndex);
  },

  async playOne(item) {
    const { items, index } = get();
    // Insert right after current and jump to it (keeps the rest of the queue).
    const next = [...items.slice(0, index + 1), item, ...items.slice(index + 1)];
    set({ items: next, loading: true, isPlaying: true });
    await loadIndex(set, get, index + (items.length ? 1 : 0));
  },

  async next() {
    const { items, index } = get();
    if (!items.length) return;
    // Autoplay: if we're near the end of the queue, append similar songs so
    // music keeps going instead of stopping/looping back to the start.
    await topUpRadio(set, get);
    const after = get().items;
    const nextIndex = index + 1 < after.length ? index + 1 : (after.length ? (index + 1) % after.length : 0);
    await loadIndex(set, get, nextIndex);
  },

  async prev() {
    const { items, index } = get();
    if (!items.length) return;
    await loadIndex(set, get, (index - 1 + items.length) % items.length);
  },

  togglePlay() { set((s) => ({ isPlaying: !s.isPlaying })); },
  setPlaying(v) { set({ isPlaying: v }); },
  toggleLoop() { set((s) => ({ loop: !s.loop })); },
}));

// Keep the queue endless: when autoplay is on and there are few upcoming items,
// fetch similar songs (radio) seeded from the current track and append them.
let radioBusy = false;
async function topUpRadio(set: any, get: any) {
  if (radioBusy) return;
  if (!useSettings.getState().autoplay) return;
  const { items, index } = get();
  const upcoming = items.length - 1 - index;
  if (upcoming >= 3) return;
  const seedItem = items[index] ?? items[items.length - 1];
  if (!seedItem) return;
  const seed = {
    artist_id: (seedItem as Song).artist_id ?? null,
    title: seedItem.title ?? null,
    artist: seedItem.artist ?? null,
  };
  radioBusy = true;
  try {
    const songs = await api.radio(seed);
    const have = new Set(
      items.map((it: PlayItem) => (isTrack(it) ? it.youtube_id ?? it.title : (it as Song).deezer_id))
    );
    const fresh = songs.filter((s) => !have.has(s.deezer_id) && s.title?.toLowerCase() !== seedItem.title?.toLowerCase());
    if (fresh.length) set({ items: [...get().items, ...fresh.slice(0, 20)] });
  } catch (e) {
    // radio is best-effort; ignore failures
  } finally {
    radioBusy = false;
  }
}

async function loadIndex(set: any, get: any, index: number) {
  const item = get().items[index];
  if (!item) return;
  // Show the track's info immediately (before it resolves) so the player
  // reacts instantly instead of after the ~2s cold lookup.
  set({
    index,
    loading: true,
    pending: { title: item.title, artist: item.artist ?? null, thumbnail: item.thumbnail ?? null },
  });
  try {
    const track = await resolve(item);
    set({ currentTrack: track, pending: null, loading: false, isPlaying: true });
    api.logPlayed(track.id).catch(() => {});

    // Keep the queue endless in the background (autoplay).
    topUpRadio(set, get);

    // Warm the next item (resolve + prefetch its stream URL) for gapless-ish play.
    const items = get().items;
    const nextItem = items[(index + 1) % items.length];
    if (nextItem) {
      resolve(nextItem).then((t) => api.prefetch(t.id)).catch(() => {});
    }
  } catch (e) {
    console.error('Could not play item', e);
    set({ loading: false, isPlaying: false, pending: null });
  }
}
