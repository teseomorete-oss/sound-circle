// Single monochrome icon system. Every icon uses currentColor so it inherits
// the text color of its button — no colored emoji anywhere.
import { CSSProperties } from 'react';

type Kind = 'stroke' | 'fill';
const P: Record<string, { kind: Kind; body: JSX.Element }> = {
  home: { kind: 'stroke', body: <><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></> },
  search: { kind: 'stroke', body: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></> },
  heart: { kind: 'stroke', body: <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" /> },
  heartFill: { kind: 'fill', body: <path d="M12 21.35 4.55 13.9a5.4 5.4 0 0 1 0-7.64 5.4 5.4 0 0 1 7.45-.2 5.4 5.4 0 0 1 7.45.2 5.4 5.4 0 0 1 0 7.64Z" /> },
  library: { kind: 'stroke', body: <><path d="M4 4v16" /><path d="M9 4v16" /><rect x="13" y="4" width="7" height="16" rx="1" transform="rotate(8 16.5 12)" /></> },
  playlist: { kind: 'stroke', body: <><path d="M4 7h11" /><path d="M4 12h11" /><path d="M4 17h7" /><circle cx="17.5" cy="16" r="2.5" /><path d="M20 16V9" /></> },
  star: { kind: 'stroke', body: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5Z" /> },
  starFill: { kind: 'fill', body: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.9L12 3.5Z" /> },
  volume: { kind: 'stroke', body: <><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" /><path d="M15.5 9a3.5 3.5 0 0 1 0 6" /><path d="M18 6.5a7 7 0 0 1 0 11" /></> },
  volumeLow: { kind: 'stroke', body: <><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" /><path d="M15.5 9a3.5 3.5 0 0 1 0 6" /></> },
  mute: { kind: 'stroke', body: <><path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></> },
  play: { kind: 'fill', body: <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.79-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" /> },
  pause: { kind: 'fill', body: <><rect x="6.5" y="5" width="3.6" height="14" rx="1" /><rect x="13.9" y="5" width="3.6" height="14" rx="1" /></> },
  prev: { kind: 'fill', body: <><rect x="5.5" y="5" width="2.4" height="14" rx="1" /><path d="M20 5.7v12.6a1 1 0 0 1-1.55.83l-9-6.3a1 1 0 0 1 0-1.66l9-6.3A1 1 0 0 1 20 5.7Z" /></> },
  next: { kind: 'fill', body: <><rect x="16.1" y="5" width="2.4" height="14" rx="1" /><path d="M4 5.7v12.6a1 1 0 0 0 1.55.83l9-6.3a1 1 0 0 0 0-1.66l-9-6.3A1 1 0 0 0 4 5.7Z" /></> },
  chevronDown: { kind: 'stroke', body: <path d="m6 9 6 6 6-6" /> },
  chevronUp: { kind: 'stroke', body: <path d="m6 15 6-6 6 6" /> },
  plus: { kind: 'stroke', body: <><path d="M12 5v14" /><path d="M5 12h14" /></> },
  download: { kind: 'stroke', body: <><path d="M12 4v10" /><path d="m8 11 4 4 4-4" /><path d="M5 19h14" /></> },
  close: { kind: 'stroke', body: <><path d="M6 6l12 12" /><path d="M18 6 6 18" /></> },
  refresh: { kind: 'stroke', body: <><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></> },
  music: { kind: 'stroke', body: <><path d="M9 18V6l10-2v12" /><circle cx="6" cy="18" r="3" /><circle cx="16" cy="16" r="3" /></> },
  disc: { kind: 'stroke', body: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2.6" /></> },
  share: { kind: 'stroke', body: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="M8.2 10.8 15.8 6.2" /><path d="M8.2 13.2 15.8 17.8" /></> },
  lyrics: { kind: 'stroke', body: <><rect x="3" y="4.5" width="18" height="15" rx="3" /><path d="M7 9.5h6" /><path d="M7 13.5h10" /><path d="M15 9.5h2" /></> },
  addPlaylist: { kind: 'stroke', body: <><path d="M4 7h12" /><path d="M4 12h12" /><path d="M4 17h7" /><path d="M18 14v6" /><path d="M15 17h6" /></> },
  repeat: { kind: 'stroke', body: <><path d="M17 2.5 21 6l-4 3.5" /><path d="M3 11.5V10a4 4 0 0 1 4-4h14" /><path d="M7 21.5 3 18l4-3.5" /><path d="M21 12.5V14a4 4 0 0 1-4 4H3" /></> },
  shuffle: { kind: 'stroke', body: <><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="m4 4 5 5" /></> },
  more: { kind: 'fill', body: <><circle cx="12" cy="5" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="12" cy="19" r="1.7" /></> },
  settings: { kind: 'stroke', body: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" /></> },
  back: { kind: 'stroke', body: <><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></> },
  queue: { kind: 'stroke', body: <><path d="M4 6h11" /><path d="M4 12h11" /><path d="M4 18h7" /><path d="M16 13.5v5l4-2.5z" fill="currentColor" stroke="none" /></> },
};

interface IconProps { name: keyof typeof P; size?: number; strokeWidth?: number; className?: string; style?: CSSProperties; }

export function Icon({ name, size = 20, strokeWidth = 2, className, style }: IconProps) {
  const icon = P[name];
  if (!icon) return null;
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', className, style,
    ...(icon.kind === 'fill'
      ? { fill: 'currentColor' }
      : { fill: 'none', stroke: 'currentColor', strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }),
  };
  return <svg {...common}>{icon.body}</svg>;
}

// Back-compat map used by the sidebar
export const Icons = P;
