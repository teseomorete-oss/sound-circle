import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const playlists = db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all();
  // attach up to 4 track covers for a collage cover
  const coverStmt = db.prepare(`
    SELECT t.thumbnail FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ? AND t.thumbnail IS NOT NULL
    ORDER BY pt.position LIMIT 4
  `);
  for (const p of playlists) {
    p.collage = coverStmt.all(p.id).map((r) => r.thumbnail);
  }
  res.json(playlists);
});

// Set / clear a custom cover image (data URL from the device)
router.put('/:id/cover', (req, res) => {
  const { cover } = req.body; // data URL string, or null to clear
  db.prepare('UPDATE playlists SET cover = ? WHERE id = ?').run(cover ?? null, req.params.id);
  res.json({ ok: true });
});

// Reorder tracks: body { order: [trackId, ...] }
router.put('/:id/reorder', (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
  const upd = db.prepare('UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?');
  order.forEach((trackId, i) => upd.run(i, req.params.id, trackId));
  res.json({ ok: true });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = randomUUID();
  db.prepare('INSERT INTO playlists (id, name) VALUES (?, ?)').run(id, name);
  res.status(201).json(db.prepare('SELECT * FROM playlists WHERE id = ?').get(id));
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  p.collage = db.prepare(`
    SELECT t.thumbnail FROM playlist_tracks pt JOIN tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ? AND t.thumbnail IS NOT NULL ORDER BY pt.position LIMIT 4
  `).all(p.id).map((r) => r.thumbnail);
  res.json(p);
});

router.get('/:id/tracks', (req, res) => {
  const tracks = db.prepare(`
    SELECT t.*, pt.position
    FROM playlist_tracks pt
    JOIN tracks t ON t.id = pt.track_id
    WHERE pt.playlist_id = ?
    ORDER BY pt.position
  `).all(req.params.id);
  res.json(tracks);
});

router.post('/:id/tracks', (req, res) => {
  const { track_id } = req.body;
  if (!track_id) return res.status(400).json({ error: 'track_id required' });

  const max = db
    .prepare('SELECT MAX(position) as m FROM playlist_tracks WHERE playlist_id = ?')
    .get(req.params.id);
  const position = (max?.m ?? -1) + 1;

  db.prepare('INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, position) VALUES (?, ?, ?)')
    .run(req.params.id, track_id, position);
  res.json({ ok: true });
});

router.delete('/:id/tracks/:trackId', (req, res) => {
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?')
    .run(req.params.id, req.params.trackId);
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
