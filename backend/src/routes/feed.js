import { Router } from 'express';
import { getRecentlyPlayed, getLibrarySuggestions, refreshNewReleases } from '../feed.js';
import { artistTop, chartTracks, chartArtists, newReleases, relatedArtists, searchArtists, artistRadio } from '../deezer.js';
import { songKey } from './prefs.js';

const router = Router();

// Remove songs/artists the user marked "not interested" / "don't recommend".
function applyPrefs(db, sections) {
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

async function fromFollowedArtists(db) {
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
async function moreLike(db) {
  const seed = db
    .prepare('SELECT name, deezer_id FROM followed_artists WHERE deezer_id IS NOT NULL ORDER BY RANDOM() LIMIT 1')
    .get();
  if (!seed) return null;
  try {
    const related = await relatedArtists(seed.deezer_id, 12);
    return related.length ? { title: `More like ${seed.name}`, items: related } : null;
  } catch { return null; }
}

// "Because you played <artist>" — radio-style mix seeded from your most-played artist.
async function becauseYouPlayed(db) {
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
  const db = req.db;
  const likedSongs = db.prepare('SELECT * FROM liked_songs ORDER BY created_at DESC LIMIT 12').all();
  const likedAlbums = db.prepare('SELECT * FROM liked_albums ORDER BY created_at DESC LIMIT 12').all();

  const [followedSongs, trending, releases, topArtists, related, becausePlayed] = await Promise.all([
    fromFollowedArtists(db).catch(() => []),
    chartTracks(15).catch(() => []),
    newReleases(15).catch(() => []),
    chartArtists(12).catch(() => []),
    moreLike(db).catch(() => null),
    becauseYouPlayed(db).catch(() => null),
  ]);

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

  const sections = [
    { type: 'quick_picks', kind: 'quickpicks', title: 'Quick picks', items: shuffle(quickPicks) },
    { type: 'recently_played', kind: 'tracks', title: 'Recently played', items: getRecentlyPlayed(db, 12) },
    { type: 'your_playlists', kind: 'playlists', title: 'Your playlists', items: myPlaylists },
    { type: 'liked', kind: 'songs', title: 'Songs you like', items: likedSongs },
    { type: 'trending', kind: 'songs', title: 'Trending now', items: trending },
    { type: 'new_releases_dz', kind: 'albums', title: 'New releases', items: releases },
    { type: 'from_followed', kind: 'songs', title: 'From artists you follow', items: followedSongs },
    becausePlayed ? { type: 'because_played', kind: 'songs', title: becausePlayed.title, items: becausePlayed.items } : null,
    related ? { type: 'more_like', kind: 'artists', title: related.title, items: related.items } : null,
    { type: 'top_artists', kind: 'artists', title: 'Top artists', items: topArtists },
    { type: 'liked_albums', kind: 'albums', title: 'Albums you like', items: likedAlbums },
    { type: 'suggestions', kind: 'tracks', title: 'Based on your library', items: getLibrarySuggestions(db, 10) },
  ].filter((s) => s && s.items.length > 0);

  res.json(applyPrefs(db, sections));
});

router.post('/refresh', async (req, res) => {
  try {
    await refreshNewReleases(req.db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
