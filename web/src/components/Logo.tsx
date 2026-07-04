import { useId } from 'react';

// Animated "Sound Circle" mark — a ring with an equalizer that pulses.
export default function Logo({ size = 28 }: { size?: number }) {
  const gid = 'lg' + useId().replace(/:/g, '');
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" stroke={`url(#${gid})`} strokeWidth="2.6" />
      <g fill={`url(#${gid})`}>
        <rect className="lb b1" x="13.5" y="13" width="3" height="14" rx="1.5" />
        <rect className="lb b2" x="18.5" y="13" width="3" height="14" rx="1.5" />
        <rect className="lb b3" x="23.5" y="13" width="3" height="14" rx="1.5" />
      </g>
    </svg>
  );
}
