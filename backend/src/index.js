import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import tracksRouter from './routes/tracks.js';
import playlistsRouter from './routes/playlists.js';
import artistsRouter from './routes/artists.js';
import albumsRouter from './routes/albums.js';
import likesRouter from './routes/likes.js';
import searchRouter from './routes/search.js';
import lyricsRouter from './routes/lyrics.js';
import prefsRouter from './routes/prefs.js';
import feedRouter from './routes/feed.js';
import statsRouter from './routes/stats.js';
import { refreshNewReleases } from './feed.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/tracks', tracksRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/likes', likesRouter);
app.use('/api/search', searchRouter);
app.use('/api/lyrics', lyricsRouter);
app.use('/api/prefs', prefsRouter);
app.use('/api/feed', feedRouter);
app.use('/api/stats', statsRouter);

app.get('/health', (_, res) => res.json({ ok: true }));

// Serve the built web UI (single self-contained server — used on-device/Termux).
// Run `npm run build` in ../web to generate this.
const __dirname = dirname(fileURLToPath(import.meta.url));
const WEB_DIST = join(__dirname, '..', '..', 'web', 'dist');
if (existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  // SPA fallback for client-side routes (anything not /api)
  app.get(/^(?!\/api).*/, (_, res) => res.sendFile(join(WEB_DIST, 'index.html')));
  console.log('Serving web UI from', WEB_DIST);
}

// Refresh new releases every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('[cron] Refreshing feed...');
  refreshNewReleases().catch(console.error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Music backend running on http://0.0.0.0:${PORT}`);
});
