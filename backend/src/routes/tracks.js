import { Router } from 'express';
import { randomUUID } from 'crypto';
import { createReadStream, statSync, unlinkSync } from 'fs';
import { join } from 'path';
import { search, getStreamUrl, downloadTrack, resolvePlayable, DOWNLOADS_DIR } from '../youtube.js';
import { findCover } from '../itunes.js';
import { cleanTitle } from '../clean.js';
import { trackRadio } from '../deezer.js';

const router = Router();

// Search YouTube
router.get('/search', async (req, res) => {
  const { q, limit = 20 } = req.query;
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const results = await search(q, Number(limit));
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Storage usage of offline downloads
router.get('/storage', (req, res) => {
  const rows = req.db.prepare('SELECT downloaded_path FROM tracks WHERE downloaded_path IS NOT NULL').all();
  let bytes = 0;
  for (const r of rows) { try { bytes += statSync(r.downloaded_path).size; } catch {} }
  res.json({ count: rows.length, bytes });
});

// Endless radio: similar songs seeded from the current track (for autoplay)
router.get('/radio', async (req, res) => {
  const { artist_id, title, artist } = req.query;
  try {
    const songs = await trackRadio({
      artist_id: artist_id ? Number(artist_id) : null,
      title: title ?? null,
      artist: artist ?? null,
    }, 30);
    res.json(songs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all library tracks
router.get('/', (req, res) => {
  const tracks = req.db.prepare('SELECT * FROM tracks ORDER BY created_at DESC').all();
  res.json(tracks);
});

// Add a YouTube track to library (enriched with a real album cover from iTunes)
router.post('/youtube', async (req, res) => {
  const { youtube_id, title, artist, album, duration, thumbnail } = req.body;
  if (!youtube_id || !title) return res.status(400).json({ error: 'youtube_id and title required' });

  const existing = req.db.prepare('SELECT * FROM tracks WHERE youtube_id = ?').get(youtube_id);
  if (existing) return res.json(existing);

  // Look up a real square cover + clean metadata; fall back to the YT values.
  const cover = await findCover(artist, cleanTitle(title));

  const id = randomUUID();
  req.db.prepare(`
    INSERT INTO tracks (id, title, artist, album, duration, thumbnail, source, youtube_id)
    VALUES (?, ?, ?, ?, ?, ?, 'youtube', ?)
  `).run(
    id,
    cover?.title ?? cleanTitle(title, artist),
    cover?.artist ?? artist ?? null,
    cover?.album ?? album ?? null,
    duration ?? cover?.duration ?? null,
    cover?.thumbnail ?? thumbnail ?? null,
    youtube_id,
  );

  res.status(201).json(req.db.prepare('SELECT * FROM tracks WHERE id = ?').get(id));
});

// Resolve an iTunes/metadata song to a playable track (finds a YouTube source).
// Used by the Artist page where songs come from iTunes, not YouTube.
router.post('/resolve', async (req, res) => {
  const { title, artist, album, thumbnail, duration } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });

  // Reuse an existing track if we already resolved this song.
  const existing = req.db
    .prepare('SELECT * FROM tracks WHERE title = ? AND IFNULL(artist, \'\') = IFNULL(?, \'\')')
    .get(title, artist ?? null);
  if (existing) return res.json(existing);

  try {
    // One yt-dlp call resolves the video AND the stream URL (pre-cached), so
    // playback starts immediately once this returns.
    const { youtube_id } = await resolvePlayable(`${artist ?? ''} ${title} audio`.trim());
    if (!youtube_id) return res.status(404).json({ error: 'No playable source found' });

    // Two different songs can resolve to the same YouTube video — reuse the
    // existing track instead of violating the unique youtube_id constraint.
    const byYt = req.db.prepare('SELECT * FROM tracks WHERE youtube_id = ?').get(youtube_id);
    if (byYt) return res.json(byYt);

    const id = randomUUID();
    req.db.prepare(`
      INSERT OR IGNORE INTO tracks (id, title, artist, album, duration, thumbnail, source, youtube_id)
      VALUES (?, ?, ?, ?, ?, ?, 'youtube', ?)
    `).run(id, title, artist ?? null, album ?? null, duration ?? null, thumbnail ?? null, youtube_id);

    const row = req.db.prepare('SELECT * FROM tracks WHERE id = ?').get(id)
      || req.db.prepare('SELECT * FROM tracks WHERE youtube_id = ?').get(youtube_id);
    res.status(201).json(row);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Prewarm a song (resolve + cache its stream URL) WITHOUT creating a track.
// The frontend calls this on hover so a later click plays instantly.
router.post('/prewarm-song', async (req, res) => {
  const { title, artist } = req.body;
  if (!title) return res.json({ ok: false });
  resolvePlayable(`${artist ?? ''} ${title} audio`.trim()).catch(() => {});
  res.json({ ok: true });
});

// Stream a YouTube track (no download)
router.get('/:id/stream', async (req, res) => {
  const track = req.db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });

  // If already downloaded, serve the file
  if (track.downloaded_path) {
    try {
      const stat = statSync(track.downloaded_path);
      const range = req.headers.range;
      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
        const start = parseInt(startStr, 10);
        const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': 'audio/mpeg',
        });
        createReadStream(track.downloaded_path, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': stat.size });
        createReadStream(track.downloaded_path).pipe(res);
      }
      return;
    } catch {}
  }

  if (!track.youtube_id) return res.status(400).json({ error: 'No stream source' });

  try {
    const url = await getStreamUrl(track.youtube_id);
    res.redirect(url);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Warm the stream-URL cache without streaming (used to prefetch the next track)
router.post('/:id/prefetch', async (req, res) => {
  const track = req.db.prepare('SELECT youtube_id FROM tracks WHERE id = ?').get(req.params.id);
  if (!track?.youtube_id) return res.json({ ok: false });
  try {
    await getStreamUrl(track.youtube_id);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, error: e.message });
  }
});

// Download a track for offline use
router.post('/:id/download', async (req, res) => {
  const track = req.db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (!track.youtube_id) return res.status(400).json({ error: 'Only YouTube tracks can be downloaded' });

  try {
    const path = await downloadTrack(track.youtube_id, track.id);
    req.db.prepare('UPDATE tracks SET downloaded_path = ? WHERE id = ?').run(path, track.id);
    res.json({ downloaded_path: path });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Remove just the offline download (keep the track in the library)
router.delete('/:id/download', (req, res) => {
  const track = req.db.prepare('SELECT * FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  if (track.downloaded_path) {
    try { unlinkSync(track.downloaded_path); } catch {}
  }
  req.db.prepare('UPDATE tracks SET downloaded_path = NULL WHERE id = ?').run(track.id);
  res.json({ ok: true });
});

// Log play to history
router.post('/:id/played', (req, res) => {
  const track = req.db.prepare('SELECT id FROM tracks WHERE id = ?').get(req.params.id);
  if (!track) return res.status(404).json({ error: 'Track not found' });
  req.db.prepare('INSERT INTO history (track_id) VALUES (?)').run(req.params.id);
  res.json({ ok: true });
});

// Delete a track
router.delete('/:id', (req, res) => {
  req.db.prepare('DELETE FROM tracks WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
