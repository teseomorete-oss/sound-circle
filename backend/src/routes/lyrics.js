import { Router } from 'express';
import { getLyrics } from '../lyrics.js';

const router = Router();

router.get('/', async (req, res) => {
  const { artist, title, album, duration } = req.query;
  if (!title) return res.status(400).json({ error: 'title required' });
  try {
    res.json(await getLyrics({
      artist: artist ? String(artist) : null,
      title: String(title),
      album: album ? String(album) : null,
      duration: duration ? Number(duration) : null,
    }));
  } catch (e) {
    res.json({ synced: null, plain: null });
  }
});

export default router;
