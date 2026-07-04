// lrclib.net — free synced + plain lyrics, no key.
const BASE = 'https://lrclib.net/api';

// Parse LRC "[mm:ss.xx] text" lines into { time, text } for karaoke highlighting.
function parseLrc(lrc) {
  const out = [];
  for (const line of lrc.split('\n')) {
    const m = line.match(/^\[(\d+):(\d+)(?:\.(\d+))?\]\s*(.*)$/);
    if (!m) continue;
    const [, mm, ss, frac, text] = m;
    const time = Number(mm) * 60 + Number(ss) + (frac ? Number(`0.${frac}`) : 0);
    if (text.trim()) out.push({ time, text: text.trim() });
  }
  return out;
}

const cache = new Map(); // "artist|title" -> { synced, plain }

export async function getLyrics({ artist, title, album, duration }) {
  const key = `${(artist ?? '').toLowerCase()}|${(title ?? '').toLowerCase()}`;
  if (cache.has(key)) return cache.get(key);

  const result = await fetchLyrics({ artist, title, album, duration });
  cache.set(key, result);
  return result;
}

async function fetchLyrics({ artist, title, album, duration }) {
  const params = new URLSearchParams({
    artist_name: artist ?? '',
    track_name: title ?? '',
  });
  if (album) params.set('album_name', album);
  if (duration) params.set('duration', String(Math.round(duration)));

  // Try the exact-match endpoint first, then fall back to fuzzy search.
  let data = null;
  try {
    const res = await fetch(`${BASE}/get?${params}`);
    if (res.ok) data = await res.json();
  } catch {}

  if (!data?.syncedLyrics && !data?.plainLyrics) {
    try {
      const res = await fetch(
        `${BASE}/search?track_name=${encodeURIComponent(title ?? '')}&artist_name=${encodeURIComponent(artist ?? '')}`,
      );
      if (res.ok) {
        const arr = await res.json();
        data = arr?.[0] ?? null;
      }
    } catch {}
  }

  if (!data) return { synced: null, plain: null };
  return {
    synced: data.syncedLyrics ? parseLrc(data.syncedLyrics) : null,
    plain: data.plainLyrics ?? null,
  };
}
