import { create } from 'zustand';
import { api, Track } from '../api/client';

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  currentTrack: Track | null;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  playTrack: (track: Track) => void;
  next: () => void;
  prev: () => void;
  setPlaying: (v: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  currentTrack: null,

  setQueue(tracks, startIndex = 0) {
    set({ queue: tracks, currentIndex: startIndex, currentTrack: tracks[startIndex] ?? null });
  },

  playTrack(track) {
    const { queue } = get();
    const idx = queue.findIndex((t) => t.id === track.id);
    if (idx >= 0) {
      set({ currentIndex: idx, currentTrack: track, isPlaying: true });
    } else {
      set({ queue: [track, ...queue], currentIndex: 0, currentTrack: track, isPlaying: true });
    }
    api.logPlayed(track.id).catch(() => {});
  },

  next() {
    const { queue, currentIndex } = get();
    const next = (currentIndex + 1) % queue.length;
    set({ currentIndex: next, currentTrack: queue[next], isPlaying: true });
    if (queue[next]) api.logPlayed(queue[next].id).catch(() => {});
  },

  prev() {
    const { queue, currentIndex } = get();
    const prev = (currentIndex - 1 + queue.length) % queue.length;
    set({ currentIndex: prev, currentTrack: queue[prev], isPlaying: true });
  },

  setPlaying(v) {
    set({ isPlaying: v });
  },
}));
