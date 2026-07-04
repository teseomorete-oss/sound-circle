import { Router } from 'express';
import { randomUUID } from 'crypto';
import db from '../db.js';

const router = Router();

// --- Liked songs ---

router.get('/songs', (req, res) => {
  res.json(db.prepare('SELECT * FROM liked_songs ORDER BY created_at DESC').all());
});

router.post('/songs', (req, res) => {
  const { deezer_id, title, artist, album, thumbnail, duration } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  if (deezer_id) {
    const existing = db.prepare('SELECT * FROM liked_songs WHERE deezer_id = ?').get(deezer_id);
    if (existing) return res.json(existing);
  }
  const id = randomUUID();
  db.prepare(`
    INSERT INTO liked_songs (id, deezer_id, title, artist, album, thumbnail, duration)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, deezer_id ?? null, title, artist ?? null, album ?? null, thumbnail ?? null, duration ?? null);
  res.status(201).json(db.prepare('SELECT * FROM liked_songs WHERE id = ?').get(id));
});

router.delete('/songs/:deezerId', (req, res) => {
  db.prepare('DELETE FROM liked_songs WHERE deezer_id = ?').run(req.params.deezerId);
  res.json({ ok: true });
});

// --- Liked albums ---

router.get('/albums', (req, res) => {
  res.json(db.prepare('SELECT * FROM liked_albums ORDER BY created_at DESC').all());
});

router.post('/albums', (req, res) => {
  const { deezer_id, title, artist, cover } = req.body;
  if (!deezer_id || !title) return res.status(400).json({ error: 'deezer_id and title required' });

  const existing = db.prepare('SELECT * FROM liked_albums WHERE deezer_id = ?').get(deezer_id);
  if (existing) return res.json(existing);

  const id = randomUUID();
  db.prepare('INSERT INTO liked_albums (id, deezer_id, title, artist, cover) VALUES (?, ?, ?, ?, ?)')
    .run(id, deezer_id, title, artist ?? null, cover ?? null);
  res.status(201).json(db.prepare('SELECT * FROM liked_albums WHERE id = ?').get(id));
});

router.delete('/albums/:deezerId', (req, res) => {
  db.prepare('DELETE FROM liked_albums WHERE deezer_id = ?').run(req.params.deezerId);
  res.json({ ok: true });
});

export default router;
