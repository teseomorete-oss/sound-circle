import { Router } from 'express';
import { suggest, searchArtists, searchTracks, searchAlbums } from '../deezer.js';

const router = Router();

// Typeahead suggestions while the user types (debounced on the client).
router.get('/suggest', async (req, res) => {
  const { q } = req.query;
  if (!q || String(q).length < 2) return res.json({ artists: [], tracks: [] });
  try {
    res.json(await suggest(String(q)));
  } catch (e) {
    res.json({ artists: [], tracks: [] });
  }
});

// Full search: artists (with photos), tracks, and albums in one shot.
router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const [artists, tracks, albums] = await Promise.all([
      searchArtists(String(q), 6),
      searchTracks(String(q), 20),
      searchAlbums(String(q), 8),
    ]);
    res.json({ artists, tracks, albums });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
