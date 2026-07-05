import { create } from 'zustand';

export type Accent = 'purple' | 'blue' | 'green' | 'sunset' | 'crimson';
export const ACCENTS: Record<Accent, [string, string]> = {
  purple: ['#a855f7', '#ec4899'],
  blue: ['#3b82f6', '#06b6d4'],
  green: ['#22c55e', '#14b8a6'],
  sunset: ['#f97316', '#f43f5e'],
  crimson: ['#ef4444', '#a855f7'],
};

export interface SettingsData {
  displayName: string;     // shown in the home welcome line
  accent: Accent;
  amoled: boolean;
  reduceMotion: boolean;
  defaultVolume: number;   // 0–1
  lyricOffset: number;     // ms; how far ahead lyrics highlight
  lyricSize: 'sm' | 'md' | 'lg';
  autoplay: boolean;       // keep playing similar songs when the queue ends
  dynamicTheme: boolean;   // tint the UI to the current album cover
  showNotes: boolean;      // animated notes during instrumental gaps
  queueMode: 'shrink' | 'manual'; // shrink-on-scroll, or open/close manually
  queueMinSize: number;    // px, smallest cover size when scrolled (shrink mode)
  showQueueTitle: boolean; // manual mode: show song title under covers
  showQueueArtist: boolean;// manual mode: show artist under covers
  showQuickPicks: boolean;
  showTrending: boolean;
  showNewReleases: boolean;
  showMenuButton: boolean;  // ⋮ buttons on covers/rows
  showLikeOnRows: boolean;  // inline heart on song rows
  showScrollbars: boolean;  // visible scrollbars on shelves/lists
  mainScrollbar: boolean;   // show the main page's right-side scrollbar
}

const DEFAULTS: SettingsData = {
  displayName: '',
  accent: 'purple',
  amoled: false,
  reduceMotion: false,
  defaultVolume: 1,
  lyricOffset: 550,
  lyricSize: 'md',
  autoplay: true,
  dynamicTheme: true,
  showNotes: true,
  queueMode: 'manual',
  queueMinSize: 44,
  showQueueTitle: true,
  showQueueArtist: true,
  showQuickPicks: true,
  showTrending: true,
  showNewReleases: true,
  showMenuButton: true,
  showLikeOnRows: true,
  showScrollbars: false,
  mainScrollbar: false,
};

const KEY = 'sc-settings';
function load(): SettingsData {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}

const LYRIC_SIZES = { sm: '22px', md: '28px', lg: '36px' };

export function applySettings(s: SettingsData) {
  const root = document.documentElement;
  const [a1, a2] = ACCENTS[s.accent] ?? ACCENTS.purple;
  root.style.setProperty('--accent', a1);
  root.style.setProperty('--accent-2', a2);
  root.style.setProperty('--accent-grad', `linear-gradient(135deg, ${a1}, ${a2})`);
  root.style.setProperty('--bg', s.amoled ? '#000000' : '#0a0a12');
  root.style.setProperty('--lyric-size', LYRIC_SIZES[s.lyricSize]);
  document.body.classList.toggle('reduce-motion', s.reduceMotion);
  document.body.classList.toggle('no-menu-btn', !s.showMenuButton);
  document.body.classList.toggle('no-row-like', !s.showLikeOnRows);
  document.body.classList.toggle('scrollbars', s.showScrollbars);
  document.body.classList.toggle('main-scrollbar', s.mainScrollbar);
  if (!s.dynamicTheme) { root.style.removeProperty('--art-color'); root.style.removeProperty('--art-soft'); }
}

interface SettingsState extends SettingsData {
  set: (patch: Partial<SettingsData>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>((set, get) => ({
  ...load(),
  set(patch) {
    set(patch as any);
    const { set: _s, reset: _r, ...data } = get() as any;
    localStorage.setItem(KEY, JSON.stringify(data));
    applySettings(get());
  },
  reset() { get().set(DEFAULTS); },
}));
