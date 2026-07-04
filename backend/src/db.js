// Uses Node's built-in SQLite (node:sqlite) — no native compilation, so it runs
// anywhere Node runs, including on-device (Termux on Android).
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(join(DATA_DIR, 'music.db'));
db.exec('PRAGMA journal_mode = WAL;');

db.exec(`
  CREATE TABLE IF NOT EXISTS hidden_songs ( key TEXT PRIMARY KEY );
  CREATE TABLE IF NOT EXISTS blocked_artists ( name TEXT PRIMARY KEY );

  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    duration INTEGER,
    thumbnail TEXT,
    source TEXT NOT NULL CHECK(source IN ('local','youtube')),
    youtube_id TEXT UNIQUE,
    local_path TEXT,
    downloaded_path TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id TEXT REFERENCES playlists(id) ON DELETE CASCADE,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    position INTEGER,
    PRIMARY KEY (playlist_id, track_id)
  );

  CREATE TABLE IF NOT EXISTS history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    played_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS followed_artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    youtube_channel_id TEXT UNIQUE,
    last_checked INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS feed_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    track_id TEXT REFERENCES tracks(id) ON DELETE CASCADE,
    label TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS liked_songs (
    id TEXT PRIMARY KEY,
    deezer_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    artist TEXT,
    album TEXT,
    thumbnail TEXT,
    duration INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS liked_albums (
    id TEXT PRIMARY KEY,
    deezer_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    artist TEXT,
    cover TEXT,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

// --- Lightweight migrations: add columns to followed_artists if missing ---
const cols = db.prepare(`PRAGMA table_info(followed_artists)`).all().map((c) => c.name);
if (!cols.includes('deezer_id')) db.exec(`ALTER TABLE followed_artists ADD COLUMN deezer_id INTEGER`);
if (!cols.includes('picture')) db.exec(`ALTER TABLE followed_artists ADD COLUMN picture TEXT`);

const plCols = db.prepare(`PRAGMA table_info(playlists)`).all().map((c) => c.name);
if (!plCols.includes('cover')) db.exec(`ALTER TABLE playlists ADD COLUMN cover TEXT`);

// --- Clean up any raw YouTube titles already stored ---
import('./clean.js').then(({ cleanTitle }) => {
  const upd = db.prepare('UPDATE tracks SET title = ? WHERE id = ?');
  for (const t of db.prepare('SELECT id, title, artist FROM tracks').all()) {
    const c = cleanTitle(t.title, t.artist);
    if (c && c !== t.title) upd.run(c, t.id);
  }
}).catch(() => {});

export default db;
