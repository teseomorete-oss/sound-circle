import YTDlpWrapModule from 'yt-dlp-wrap';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

// yt-dlp-wrap's ESM interop nests the constructor under .default
const YTDlpWrap = YTDlpWrapModule.default ?? YTDlpWrapModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DOWNLOADS_DIR = join(__dirname, '..', 'downloads');
mkdirSync(DOWNLOADS_DIR, { recursive: true });

const ytdlp = new YTDlpWrap();

export async function search(query, limit = 20) {
  const raw = await ytdlp.execPromise([
    `ytsearch${limit}:${query}`,
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
  ]);
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const v = JSON.parse(line);
      return {
        youtube_id: v.id,
        title: v.title,
        artist: v.uploader || v.channel || null,
        duration: v.duration || null,
        thumbnail: v.thumbnail || (v.thumbnails?.[0]?.url ?? null),
      };
    });
}

// Find the best playable YouTube video id for a search query (e.g. an iTunes
// "artist - title"). Returns the first match's id, or null.
export async function resolveYoutubeId(query) {
  const raw = await ytdlp.execPromise([
    `ytsearch1:${query}`,
    '--flat-playlist',
    '--print', '%(id)s',
    '--no-warnings',
  ]);
  const id = raw.trim().split('\n')[0];
  return id || null;
}

// Cache resolved googlevideo URLs. They stay valid for ~6h (the `expire` query
// param), so we cache for 5h to avoid re-running yt-dlp on every play/seek.
const STREAM_URL_TTL_MS = 5 * 60 * 60 * 1000;
const streamUrlCache = new Map();  // youtubeId -> { url, expires }
const queryCache = new Map();      // normalized search query -> youtubeId
const FMT = 'bestaudio[ext=m4a]/bestaudio';

function cacheUrl(youtubeId, url) {
  streamUrlCache.set(youtubeId, { url, expires: Date.now() + STREAM_URL_TTL_MS });
}

export async function getStreamUrl(youtubeId) {
  const cached = streamUrlCache.get(youtubeId);
  if (cached && cached.expires > Date.now()) return cached.url;

  const info = await ytdlp.execPromise([
    `https://www.youtube.com/watch?v=${youtubeId}`,
    // Prefer progressive m4a/AAC — streams far more smoothly in browsers than
    // the default opus/webm, which stutters under range requests.
    '-f', FMT,
    '--get-url',
    '--no-warnings',
  ]);
  const url = info.trim();
  cacheUrl(youtubeId, url);
  return url;
}

// Resolve a search query straight to a playable video id + stream URL in a
// SINGLE yt-dlp extraction (search + format URL together). This halves the
// startup wait versus doing a search call and then a separate get-url call.
// Both results are cached so a later play/seek is instant.
export async function resolvePlayable(query) {
  const norm = query.toLowerCase().trim();
  const knownId = queryCache.get(norm);
  if (knownId) {
    const c = streamUrlCache.get(knownId);
    if (c && c.expires > Date.now()) return { youtube_id: knownId, url: c.url };
    return { youtube_id: knownId, url: await getStreamUrl(knownId) };
  }

  const raw = await ytdlp.execPromise([
    `ytsearch1:${query}`,
    '-f', FMT,
    '--get-id',
    '--get-url',
    '--no-warnings',
  ]);
  const lines = raw.trim().split('\n').filter(Boolean);
  const url = lines.find((l) => l.startsWith('http')) ?? null;
  const youtube_id = lines.find((l) => !l.startsWith('http')) ?? null;
  if (youtube_id) {
    queryCache.set(norm, youtube_id);
    if (url) cacheUrl(youtube_id, url);
  }
  return { youtube_id, url };
}

export async function downloadTrack(youtubeId, trackId) {
  const outPath = join(DOWNLOADS_DIR, `${trackId}.%(ext)s`);
  await ytdlp.execPromise([
    `https://www.youtube.com/watch?v=${youtubeId}`,
    '-f', 'bestaudio',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '-o', outPath,
    '--no-warnings',
  ]);
  return join(DOWNLOADS_DIR, `${trackId}.mp3`);
}

export async function getChannelUploads(channelId, limit = 10) {
  const raw = await ytdlp.execPromise([
    `https://www.youtube.com/channel/${channelId}/videos`,
    '--dump-json',
    '--flat-playlist',
    '--playlist-end', String(limit),
    '--no-warnings',
  ]);
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const v = JSON.parse(line);
      return {
        youtube_id: v.id,
        title: v.title,
        artist: v.uploader || v.channel || null,
        duration: v.duration || null,
        thumbnail: v.thumbnail || (v.thumbnails?.[0]?.url ?? null),
      };
    });
}
