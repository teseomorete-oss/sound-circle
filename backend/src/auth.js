// Accounts + sessions. Kept in a separate auth.db; each user's music data lives
// in its own database file (see db.js getUserDb), so every account has a fully
// independent library, history and feed. Passwords hashed with scrypt (built-in).
import { DatabaseSync } from 'node:sqlite';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { scryptSync, randomBytes, timingSafeEqual, randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');
mkdirSync(DATA_DIR, { recursive: true });

const adb = new DatabaseSync(join(DATA_DIR, 'auth.db'));
adb.exec('PRAGMA journal_mode = WAL;');
adb.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL COLLATE NOCASE,
    pass TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch())
  );
`);

function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(pw, stored) {
  const [salt, hash] = (stored || '').split(':');
  if (!salt || !hash) return false;
  const h = scryptSync(pw, salt, 64);
  const hb = Buffer.from(hash, 'hex');
  return h.length === hb.length && timingSafeEqual(h, hb);
}

export function countUsers() {
  return adb.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}

export function createUser(username, password) {
  const clean = String(username || '').trim();
  if (clean.length < 2) throw new Error('Username too short');
  if (String(password || '').length < 4) throw new Error('Password too short (min 4)');
  const exists = adb.prepare('SELECT 1 FROM users WHERE username = ?').get(clean);
  if (exists) throw new Error('That username is taken');
  const id = randomUUID();
  adb.prepare('INSERT INTO users (id, username, pass) VALUES (?, ?, ?)').run(id, clean, hashPassword(password));
  return { id, username: clean };
}

export function login(username, password) {
  const row = adb.prepare('SELECT * FROM users WHERE username = ?').get(String(username || '').trim());
  if (!row || !verifyPassword(password, row.pass)) return null;
  return { id: row.id, username: row.username };
}

export function createSession(userId) {
  const token = randomBytes(32).toString('hex');
  adb.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(token, userId);
  return token;
}

export function userForToken(token) {
  if (!token) return null;
  const s = adb.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  if (!s) return null;
  const u = adb.prepare('SELECT id, username FROM users WHERE id = ?').get(s.user_id);
  return u || null;
}

export function deleteSession(token) {
  if (token) adb.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function listUserIds() {
  return adb.prepare('SELECT id FROM users').all().map((r) => r.id);
}
