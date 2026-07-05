// Per-user SQLite databases. Each account gets its own file under data/users/,
// so libraries, history and feeds are completely separate. Uses Node's built-in
// SQLite (node:sqlite) — no native compilation, runs anywhere Node runs.
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
const USERS_DIR = join(DATA_DIR, 'users');
mkdirSync(USERS_DIR, { recursive: true });

const SCHEMA = `
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
`;

function initSchema(db) {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  // Lightweight migrations
  const cols = db.prepare(`PRAGMA table_info(followed_artists)`).all().map((c) => c.name);
  if (!cols.includes('deezer_id')) db.exec(`ALTER TABLE followed_artists ADD COLUMN deezer_id INTEGER`);
  if (!cols.includes('picture')) db.exec(`ALTER TABLE followed_artists ADD COLUMN picture TEXT`);
  const plCols = db.prepare(`PRAGMA table_info(playlists)`).all().map((c) => c.name);
  if (!plCols.includes('cover')) db.exec(`ALTER TABLE playlists ADD COLUMN cover TEXT`);
}

const cache = new Map();

// Open (and cache) the database for a given user id.
export function getUserDb(userId) {
  let db = cache.get(userId);
  if (db) return db;
  db = new DatabaseSync(join(USERS_DIR, `${userId}.db`));
  initSchema(db);
  cache.set(userId, db);
  return db;
}
