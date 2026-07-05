import { randomUUID } from 'crypto';
import { getChannelUploads } from './youtube.js';

export function getRecentlyPlayed(db, limit = 10) {
  return db
    .prepare(`
      SELECT t.*, h.played_at
      FROM history h
      JOIN tracks t ON t.id = h.track_id
      ORDER BY h.played_at DESC
      LIMIT ?
    `)
    .all(limit);
}

export function getLibrarySuggestions(db, limit = 10) {
  // Pull artists from user's library, then fetch more tracks by those artists from history/tracks
  const artists = db
    .prepare(`
      SELECT artist, COUNT(*) as plays
      FROM history h JOIN tracks t ON t.id = h.track_id
      WHERE t.artist IS NOT NULL
      GROUP BY t.artist
      ORDER BY plays DESC
      LIMIT 5
    `)
    .all();

  if (!artists.length) return [];

  // Return tracks from those artists not recently played
  const placeholders = artists.map(() => '?').join(',');
  const artistNames = artists.map((a) => a.artist);
  return db
    .prepare(`
      SELECT t.*
      FROM tracks t
      WHERE t.artist IN (${placeholders})
        AND t.id NOT IN (
          SELECT track_id FROM history ORDER BY played_at DESC LIMIT 30
        )
      ORDER BY RANDOM()
      LIMIT ?
    `)
    .all(...artistNames, limit);
}

export async function refreshNewReleases(db) {
  const artists = db.prepare('SELECT * FROM followed_artists').all();
  const now = Math.floor(Date.now() / 1000);

  for (const artist of artists) {
    if (!artist.youtube_channel_id) continue;
    try {
      const videos = await getChannelUploads(artist.youtube_channel_id, 5);
      for (const v of videos) {
        const existing = db
          .prepare('SELECT id FROM tracks WHERE youtube_id = ?')
          .get(v.youtube_id);
        let trackId = existing?.id;
        if (!existing) {
          trackId = randomUUID();
          db.prepare(`
            INSERT OR IGNORE INTO tracks (id, title, artist, duration, thumbnail, source, youtube_id)
            VALUES (?, ?, ?, ?, ?, 'youtube', ?)
          `).run(trackId, v.title, v.artist ?? artist.name, v.duration, v.thumbnail, v.youtube_id);
        }
        db.prepare(`
          INSERT OR IGNORE INTO feed_items (id, type, track_id, label)
          VALUES (?, 'new_release', ?, ?)
        `).run(randomUUID(), trackId, `New from ${artist.name}`);
      }
      db.prepare('UPDATE followed_artists SET last_checked = ? WHERE id = ?').run(now, artist.id);
    } catch (e) {
      console.error(`Feed refresh failed for ${artist.name}:`, e.message);
    }
  }
}

export function getFeedItems(db, limit = 30) {
  return db
    .prepare(`
      SELECT f.id as feed_id, f.type, f.label, f.created_at as feed_at, t.*
      FROM feed_items f
      JOIN tracks t ON t.id = f.track_id
      ORDER BY f.created_at DESC
      LIMIT ?
    `)
    .all(limit);
}
