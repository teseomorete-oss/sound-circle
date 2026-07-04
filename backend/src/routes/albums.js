import { Router } from 'express';
import { getAlbum, searchAlbums } from '../deezer.js';

const router = Router();

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    res.json(await searchAlbums(String(q)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    res.json(await getAlbum(req.params.id));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
