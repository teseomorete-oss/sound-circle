import { create } from 'zustand';
import { usePlayerStore } from './player';

let handle: ReturnType<typeof setTimeout> | undefined;

interface SleepState {
  minutes: number;        // 0 = off
  endsAt: number | null;  // timestamp when playback will pause
  arm: (minutes: number) => void;
}

// Pauses playback after a chosen number of minutes (great for falling asleep).
export const useSleep = create<SleepState>((set) => ({
  minutes: 0,
  endsAt: null,
  arm(minutes) {
    if (handle) clearTimeout(handle);
    if (!minutes) { set({ minutes: 0, endsAt: null }); return; }
    const ms = minutes * 60_000;
    handle = setTimeout(() => {
      usePlayerStore.getState().setPlaying(false);
      set({ minutes: 0, endsAt: null });
    }, ms);
    set({ minutes, endsAt: Date.now() + ms });
  },
}));
