import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Listening stats: most-played songs & artists, total plays (your mini "Wrapped")
router.get('/', (req, res) => {
  const topTracks = db.prepare(`
    SELECT t.*, COUNT(*) AS plays
    FROM history h JOIN tracks t ON t.id = h.track_id
    GROUP BY h.track_id
    ORDER BY plays DESC, MAX(h.played_at) DESC
    LIMIT 20
  `).all();

  const topArtists = db.prepare(`
    SELECT t.artist AS name, COUNT(*) AS plays,
           (SELECT t2.thumbnail FROM history h2 JOIN tracks t2 ON t2.id = h2.track_id
            WHERE t2.artist = t.artist AND t2.thumbnail IS NOT NULL LIMIT 1) AS thumbnail
    FROM history h JOIN tracks t ON t.id = h.track_id
    WHERE t.artist IS NOT NULL
    GROUP BY t.artist
    ORDER BY plays DESC
    LIMIT 12
  `).all();

  const totals = db.prepare('SELECT COUNT(*) AS plays, MIN(played_at) AS since FROM history').get();

  res.json({ topTracks, topArtists, totalPlays: totals?.plays ?? 0, since: totals?.since ?? null });
});

export default router;
