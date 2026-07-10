import { Router } from 'express';
import db from '../db.js';
import { getRecentlyPlayed, getLibrarySuggestions, getFeedItems, refreshNewReleases } from '../feed.js';
import { artistTop, chartTracks, chartArtists, newReleases, relatedArtists, searchArtists, artistRadio } from '../deezer.js';
import { songKey } from './prefs.js';

const router = Router();

// Remove songs/artists the user marked "not interested" / "don't recommend".
function applyPrefs(sections) {
  const hidden = new Set(db.prepare('SELECT key FROM hidden_songs').all().map((r) => r.key));
  const blocked = new Set(db.prepare('SELECT name FROM blocked_artists').all().map((r) => r.name));
  return sections
    .map((s) => {
      if (s.kind === 'artists') {
        return { ...s, items: s.items.filter((a) => !blocked.has((a.name ?? '').toLowerCase())) };
      }
      return {
        ...s,
        items: s.items.filter((it) => {
          const artist = (it.artist ?? '').toLowerCase();
          if (blocked.has(artist)) return false;
          if (hidden.has(songKey(it.artist, it.title))) return false;
          return true;
        }),
      };
    })
    .filter((s) => s.items.length > 0);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fromFollowedArtists() {
  const artists = db
    .prepare('SELECT name, deezer_id FROM followed_artists WHERE deezer_id IS NOT NULL LIMIT 8')
    .all();
  const songs = [];
  await Promise.all(artists.map(async (a) => {
    try { songs.push(...(await artistTop(a.deezer_id, 3)).slice(0, 2)); } catch {}
  }));
  return shuffle(songs).slice(0, 12);
}

// "More like <artist>" — related artists based on someone you follow or like.
async function moreLike() {
  const seed = db
    .prepare('SELECT name, deezer_id FROM followed_artists WHERE deezer_id IS NOT NULL ORDER BY RANDOM() LIMIT 1')
    .get();
  if (!seed) return null;
  try {
    const related = await relatedArtists(seed.deezer_id, 12);
    return related.length ? { title: `More like ${seed.name}`, items: related } : null;
  } catch { return null; }
}

// Junk that shows up in Deezer's global "chart artists" but isn't music
// (audio dramas, audiobooks, etc.) — e.g. "Die drei ???".
const NON_MUSIC = /\?\?\?|h[oö]rspiel|h[oö]rbuch|\bfolge\s*\d|verk[aä]lteten|conni|bibi|benjamin bl|drei fragezeichen|five nights|asmr|white noise|sleep sounds/i;

// "Your top artists" — built from what YOU actually listen to (history + likes +
// follows), not a global chart. Falls back to filtered charts for new users.
async function topArtistsSmart(limit = 12) {
  const names = new Map(); // lowercased name -> weight
  const bump = (name, w) => { if (!name) return; const k = name.toLowerCase(); names.set(k, (names.get(k) ?? 0) + w); };

  // Most-played (history) get the most weight, then liked, then followed.
  db.prepare(`SELECT t.artist AS name, COUNT(*) AS plays FROM history h JOIN tracks t ON t.id = h.track_id
              WHERE t.artist IS NOT NULL GROUP BY t.artist`).all().forEach((r) => bump(r.name, r.plays * 3));
  db.prepare('SELECT artist AS name FROM liked_songs WHERE artist IS NOT NULL').all().forEach((r) => bump(r.name, 2));
  db.prepare('SELECT name FROM followed_artists').all().forEach((r) => bump(r.name, 2));

  const ranked = [...names.entries()].sort((a, b) => b[1] - a[1]).map((e) => e[0]);

  if (ranked.length >= 3) {
    // Enrich with Deezer artist info (picture) in parallel.
    const found = await Promise.all(ranked.slice(0, limit).map((n) => searchArtists(n, 1).then((r) => r[0]).catch(() => null)));
    const out = found.filter(Boolean);
    if (out.length) return out;
  }

  // New user: fall back to popular artists, filtered to real music.
  const chart = await chartArtists(24).catch(() => []);
  return chart.filter((a) => !NON_MUSIC.test(a.name ?? '')).slice(0, limit);
}

// "Because you played <artist>" — radio-style mix seeded from your most-played artist.
async function becauseYouPlayed() {
  const top = db.prepare(`
    SELECT t.artist AS name, COUNT(*) AS plays
    FROM history h JOIN tracks t ON t.id = h.track_id
    WHERE t.artist IS NOT NULL
    GROUP BY t.artist ORDER BY plays DESC LIMIT 1
  `).get();
  if (!top || top.plays < 3) return null;
  try {
    const [artist] = await searchArtists(top.name, 1);
    if (!artist) return null;
    const songs = await artistRadio(artist.deezer_id, 15);
    return songs.length ? { title: `Because you played ${top.name}`, items: songs } : null;
  } catch { return null; }
}

router.get('/', async (req, res) => {
  const likedSongs = db.prepare('SELECT * FROM liked_songs ORDER BY created_at DESC LIMIT 12').all();
  const likedAlbums = db.prepare('SELECT * FROM liked_albums ORDER BY created_at DESC LIMIT 12').all();

  const [followedSongs, trending, releases, topArtists, related, becausePlayed] = await Promise.all([
    fromFollowedArtists().catch(() => []),
    chartTracks(15).catch(() => []),
    newReleases(15).catch(() => []),
    topArtistsSmart(12).catch(() => []),
    moreLike().catch(() => null),
    becauseYouPlayed().catch(() => null),
  ]);

  // Does the user have their own listening data? If so we lead with personalized
  // shelves; otherwise we lead with what's popular so a fresh app isn't empty.
  const playCount = db.prepare('SELECT COUNT(*) AS n FROM history').get().n;
  const personalized = playCount >= 5;

  // "Quick picks" (YT Music's Kurzwahl) — a personalized mix rendered as a
  // 3-row square-tile carousel. Blend liked songs + trending, deduped.
  const quickPicks = [];
  const seen = new Set();
  for (const s of [...likedSongs, ...trending]) {
    const key = (s.title + s.artist).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    quickPicks.push(s);
    if (quickPicks.length >= 18) break;
  }

  // The user's own playlists (with collage covers) to jump back into.
  const myPlaylists = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC LIMIT 12').all();
  const collageStmt = db.prepare(`
    SELECT t.thumbnail FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ? AND t.thumbnail IS NOT NULL ORDER BY pt.position LIMIT 4
  `);
  const titlesStmt = db.prepare(`
    SELECT t.title FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ? ORDER BY pt.position LIMIT 5
  `);
  for (const p of myPlaylists) {
    p.collage = collageStmt.all(p.id).map((r) => r.thumbnail);
    p.titles = titlesStmt.all(p.id).map((r) => r.title);
  }

  const S = {
    quick_picks: { type: 'quick_picks', kind: 'quickpicks', title: 'Quick picks', items: shuffle(quickPicks) },
    recently_played: { type: 'recently_played', kind: 'tracks', title: 'Recently played', items: getRecentlyPlayed(12) },
    your_playlists: { type: 'your_playlists', kind: 'playlists', title: 'Your playlists', items: myPlaylists },
    liked: { type: 'liked', kind: 'songs', title: 'Songs you like', items: likedSongs },
    trending: { type: 'trending', kind: 'songs', title: 'Trending now', items: trending },
    new_releases_dz: { type: 'new_releases_dz', kind: 'albums', title: 'New releases', items: releases },
    from_followed: { type: 'from_followed', kind: 'songs', title: 'From artists you follow', items: followedSongs },
    because_played: becausePlayed ? { type: 'because_played', kind: 'songs', title: becausePlayed.title, items: becausePlayed.items } : null,
    more_like: related ? { type: 'more_like', kind: 'artists', title: related.title, items: related.items } : null,
    top_artists: { type: 'top_artists', kind: 'artists', title: personalized ? 'Your top artists' : 'Popular artists', items: topArtists },
    liked_albums: { type: 'liked_albums', kind: 'albums', title: 'Albums you like', items: likedAlbums },
    suggestions: { type: 'suggestions', kind: 'tracks', title: 'Based on your library', items: getLibrarySuggestions(10) },
  };

  // Smarter ordering: personalized shelves first once you've listened a bit.
  const order = personalized
    ? ['quick_picks', 'recently_played', 'because_played', 'your_playlists', 'liked', 'from_followed', 'top_artists', 'more_like', 'suggestions', 'new_releases_dz', 'liked_albums', 'trending']
    : ['quick_picks', 'trending', 'new_releases_dz', 'top_artists', 'your_playlists', 'liked', 'recently_played', 'from_followed', 'because_played', 'more_like', 'liked_albums', 'suggestions'];

  const sections = order.map((k) => S[k]).filter((s) => s && s.items.length > 0);

  res.json(applyPrefs(sections));
});

router.post('/refresh', async (req, res) => {
  try {
    await refreshNewReleases();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
