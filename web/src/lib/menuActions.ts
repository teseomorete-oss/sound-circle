// Every action available in the song hold-menu. The user picks which appear as
// the 3 big buttons and which appear in the options list (see Settings).
export interface MenuActionMeta {
  key: string;
  label: string;
  icon: string;
  big?: boolean; // can be used as one of the 3 big buttons
}

export const MENU_ACTIONS: MenuActionMeta[] = [
  { key: 'playNext', label: 'Play next', icon: 'next', big: true },
  { key: 'queue', label: 'Add to queue', icon: 'playlist', big: true },
  { key: 'like', label: 'Like', icon: 'heart', big: true },
  { key: 'playlist', label: 'Add to playlist', icon: 'addPlaylist', big: true },
  { key: 'radio', label: 'Start radio', icon: 'shuffle', big: true },
  { key: 'download', label: 'Download', icon: 'download', big: true },
  { key: 'share', label: 'Share', icon: 'share', big: true },
  { key: 'album', label: 'Go to album', icon: 'disc' },
  { key: 'artist', label: 'Go to artist', icon: 'star' },
  { key: 'copyLink', label: 'Copy link', icon: 'share' },
  { key: 'hide', label: 'Not interested', icon: 'close' },
  { key: 'block', label: "Don't recommend artist", icon: 'star' },
];

export const MENU_ACTION_LABEL: Record<string, string> =
  Object.fromEntries(MENU_ACTIONS.map((a) => [a.key, a.label]));

export const DEFAULT_MENU_BIG = ['playNext', 'like', 'playlist'];
export const DEFAULT_MENU_OPTIONS = ['queue', 'radio', 'download', 'share', 'album', 'artist', 'hide', 'block'];
