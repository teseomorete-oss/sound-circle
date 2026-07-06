import { create } from 'zustand';
import { api, Track, PlayItem, isTrack, Song } from '../api/client';
import { useSettings } from './settings';

export interface PendingInfo { title: string; artist: string | null; thumbnail: string | null; }

interface PlayerState {
  queue: PlayItem[];          // the VISIBLE up-next queue: only songs you added
                              // (Play next / Add to queue) or the list you pressed play on.
  history: PlayItem[];        // previously played, for prev()
  currentItem: PlayItem | null;
  currentTrack: Track | null; // the resolved, playable track
  pending: PendingInfo | null;
  isPlaying: boolean;
  loading: boolean;
  loop: boolean;
  queueOpen: boolean;

  play: (items: PlayItem[], startIndex?: number) => Promise<void>;
  playOne: (item: PlayItem) => Promise<void>;
  playNext: (item: PlayItem) => void;
  addToQueue: (item: PlayItem) => void;
  removeFromQueue: (i: number) => void;
  moveInQueue: (from: number, to: number) => void;
  setQueueOpen: (v: boolean) => void;
  toggleQueue: () => void;
  next: () => Promise<void>;
  prev: () => Promise<void>;
  togglePlay: () => void;
  setPlaying: (v: boolean) => void;
  toggleLoop: () => void;
}

async function resolve(item: PlayItem): Promise<Track> {
  if (isTrack(item)) return item;
  return api.resolveTrack(item);
}

// Autoplay radio lives OUTSIDE the visible queue — it just keeps the music going
// once your queue runs out, and never shows up in the "Next up" list.
let radioBuffer: PlayItem[] = [];
let radioBusy = false;

function itemKey(it: PlayItem) {
  return isTrack(it) ? (it.youtube_id ?? it.title) : (it as Song).deezer_id ?? it.title;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  history: [],
  currentItem: null,
  currentTrack: null,
  pending: null,
  isPlaying: false,
  loading: false,
  loop: false,
  queueOpen: false,

  async play(items, startIndex = 0) {
    radioBuffer = [];
    const cur = items[startIndex];
    if (!cur) return;
    set({ history: [], queue: items.slice(startIndex + 1), isPlaying: true, loading: true });
    await loadCurrent(set, get, cur);
  },

  async playOne(item) {
    radioBuffer = []; // new seed → forget old radio
    const { currentItem, history } = get();
    set({ history: currentItem ? [...history, currentItem] : history, isPlaying: true, loading: true });
    await loadCurrent(set, get, item);
  },

  // Your manual queue — these play BEFORE any autoplay radio (priority).
  playNext(item) {
    if (!get().currentItem) { get().play([item], 0); return; }
    set({ queue: [item, ...get().queue], queueOpen: true });
  },
  addToQueue(item) {
    if (!get().currentItem) { get().play([item], 0); return; }
    set({ queue: [...get().queue, item], queueOpen: true });
  },

  removeFromQueue(i) {
    set({ queue: get().queue.filter((_, idx) => idx !== i) });
  },
  moveInQueue(from, to) {
    const arr = [...get().queue];
    const [m] = arr.splice(from, 1);
    arr.splice(to, 0, m);
    set({ queue: arr });
  },

  setQueueOpen(v) { set({ queueOpen: v }); },
  toggleQueue() { set((s) => ({ queueOpen: !s.queueOpen })); },

  async next() {
    const { queue, currentItem, history } = get();
    // 1) Your queued songs have priority.
    if (queue.length) {
      const [nextItem, ...rest] = queue;
      set({ history: currentItem ? [...history, currentItem] : history, queue: rest });
      await loadCurrent(set, get, nextItem);
      return;
    }
    // 2) Otherwise, autoplay radio (hidden) keeps things going.
    if (!useSettings.getState().autoplay) { set({ isPlaying: false }); return; }
    if (!radioBuffer.length) await fillRadio(get);
    const nextItem = radioBuffer.shift();
    if (!nextItem) { set({ isPlaying: false }); return; }
    set({ history: currentItem ? [...history, currentItem] : history });
    await loadCurrent(set, get, nextItem);
  },

  async prev() {
    const { history } = get();
    if (!history.length) return;
    const prevItem = history[history.length - 1];
    set({ history: history.slice(0, -1) });
    await loadCurrent(set, get, prevItem);
  },

  togglePlay() { set((s) => ({ isPlaying: !s.isPlaying })); },
  setPlaying(v) { set({ isPlaying: v }); },
  toggleLoop() { set((s) => ({ loop: !s.loop })); },
}));

async function loadCurrent(set: any, get: any, item: PlayItem) {
  set({
    currentItem: item,
    loading: true,
    pending: { title: item.title, artist: item.artist ?? null, thumbnail: item.thumbnail ?? null },
  });
  try {
    const track = await resolve(item);
    set({ currentTrack: track, pending: null, loading: false, isPlaying: true });
    api.logPlayed(track.id).catch(() => {});
    prefetchNext(get);
    maybeFillRadio(get);
  } catch (e) {
    console.error('Could not play item', e);
    set({ loading: false, isPlaying: false, pending: null });
  }
}

// Warm the next track (resolve + prefetch its stream URL) for gapless-ish play.
function prefetchNext(get: any) {
  const { queue } = get();
  const upcoming = queue[0] ?? radioBuffer[0];
  if (upcoming) resolve(upcoming).then((t) => api.prefetch(t.id)).catch(() => {});
}

// Stock the (hidden) radio buffer when the queue is empty, so autoplay is instant.
function maybeFillRadio(get: any) {
  if (!useSettings.getState().autoplay) return;
  const { queue } = get();
  if (queue.length === 0 && radioBuffer.length < 2) fillRadio(get);
}

async function fillRadio(get: any) {
  if (radioBusy) return;
  const seed = get().currentItem;
  if (!seed) return;
  radioBusy = true;
  try {
    const songs = await api.radio({
      artist_id: (seed as Song).artist_id ?? null,
      title: seed.title ?? null,
      artist: seed.artist ?? null,
    });
    const seen = new Set<any>([itemKey(seed), ...get().history.map(itemKey), ...get().queue.map(itemKey)]);
    for (const s of songs) {
      const k = itemKey(s);
      if (seen.has(k)) continue;
      seen.add(k);
      radioBuffer.push(s);
    }
    radioBuffer = radioBuffer.slice(0, 30);
  } catch { /* best-effort */ }
  finally { radioBusy = false; }
}
