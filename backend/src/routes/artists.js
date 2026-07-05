import { Router } from 'express';
import { randomUUID } from 'crypto';
import { searchArtists, getArtist, artistTop, artistAlbums } from '../deezer.js';

const router = Router();

// --- Discovery (Deezer) ---

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await searchArtists(String(q)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/deezer/:id', async (req, res) => {
  try {
    res.json(await getArtist(req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/deezer/:id/top', async (req, res) => {
  try {
    res.json(await artistTop(req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/deezer/:id/albums', async (req, res) => {
  try {
    res.json(await artistAlbums(req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Following ---

router.get('/', (req, res) => {
  res.json(req.db.prepare('SELECT * FROM followed_artists ORDER BY name').all());
});

// Follow (idempotent) — keyed by Deezer artist id
router.post('/follow', (req, res) => {
  const { deezer_id, name, picture } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const existing = deezer_id
    ? req.db.prepare('SELECT * FROM followed_artists WHERE deezer_id = ?').get(deezer_id)
    : null;
  if (existing) return res.json(existing);

  const id = randomUUID();
  req.db.prepare(
    'INSERT INTO followed_artists (id, name, deezer_id, picture) VALUES (?, ?, ?, ?)',
  ).run(id, name, deezer_id ?? null, picture ?? null);
  res.status(201).json(req.db.prepare('SELECT * FROM followed_artists WHERE id = ?').get(id));
});

router.delete('/follow/:deezerId', (req, res) => {
  req.db.prepare('DELETE FROM followed_artists WHERE deezer_id = ?').run(req.params.deezerId);
  res.json({ ok: true });
});

// Unfollow by internal id (used by the Following list)
router.delete('/:id', (req, res) => {
  req.db.prepare('DELETE FROM followed_artists WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
