import YTDlpWrapModule from 'yt-dlp-wrap';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, existsSync } from 'fs';

// yt-dlp-wrap's ESM interop nests the constructor under .default
const YTDlpWrap = YTDlpWrapModule.default ?? YTDlpWrapModule;

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DOWNLOADS_DIR = join(__dirname, '..', 'downloads');
mkdirSync(DOWNLOADS_DIR, { recursive: true });

// On cloud/datacenter IPs YouTube demands "sign in to confirm you're not a bot".
// Passing cookies from a logged-in (throwaway) account gets past it. Drop a
// Netscape-format cookies file here and every yt-dlp call uses it automatically.
const COOKIES = join(__dirname, '..', 'data', 'cookies.txt');
// Residential proxy for yt-dlp so YouTube sees a home IP instead of the blocked
// datacenter IP. Only the small metadata resolution goes through it (the audio
// streams straight to the client), so proxy bandwidth stays tiny.
const PROXY = process.env.SC_PROXY || '';

const ytdlp = new YTDlpWrap();

// Each yt-dlp call spawns a memory-hungry process (plus a JS runtime). On a
// small (1 GB) cloud VM, several at once exhaust RAM and hard-crash the box, so
// cap how many run concurrently; the rest queue.
const MAX_CONCURRENT = Number(process.env.YTDLP_CONCURRENCY || 2);
let active = 0;
const waiting = [];
function runLimited(task) {
  return new Promise((resolve, reject) => {
    const start = () => {
      active++;
      task().then(resolve, reject).finally(() => {
        active--;
        const next = waiting.shift();
        if (next) next();
      });
    };
    if (active < MAX_CONCURRENT) start(); else waiting.push(start);
  });
}

// Wrap execPromise: add cookies + proxy (when configured) and throttle concurrency.
function exec(args) {
  const extra = [];
  if (existsSync(COOKIES)) extra.push('--cookies', COOKIES);
  if (PROXY) extra.push('--proxy', PROXY);
  return runLimited(() => ytdlp.execPromise(extra.length ? [...args, ...extra] : args));
}

export async function search(query, limit = 20) {
  const raw = await exec([
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
  const raw = await exec([
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

  const info = await exec([
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

  const raw = await exec([
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
  await exec([
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
  const raw = await exec([
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
