import { create } from 'zustand';
import { Song } from '../api/client';

interface MenuState {
  song: Song | null;
  open: (song: Song) => void;
  close: () => void;
}

// Controls the song context-menu bottom sheet (opened via ⋮ / long-press).
export const useMenuStore = create<MenuState>((set) => ({
  song: null,
  open: (song) => set({ song }),
  close: () => set({ song: null }),
}));
