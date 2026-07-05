import { Router } from 'express';

const router = Router();

export const songKey = (artist, title) => `${(artist ?? '').toLowerCase()}|${(title ?? '').toLowerCase()}`;

// "Not interested" in a specific song
router.post('/hide-song', (req, res) => {
  const { title, artist } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  req.db.prepare('INSERT OR IGNORE INTO hidden_songs (key) VALUES (?)').run(songKey(artist, title));
  res.json({ ok: true });
});

// "Don't recommend this artist"
router.post('/block-artist', (req, res) => {
  const { artist } = req.body;
  if (!artist) return res.status(400).json({ error: 'artist required' });
  req.db.prepare('INSERT OR IGNORE INTO blocked_artists (name) VALUES (?)').run(artist.toLowerCase());
  res.json({ ok: true });
});

// Clear listening history
router.post('/clear-history', (req, res) => {
  req.db.prepare('DELETE FROM history').run();
  res.json({ ok: true });
});

export default router;
