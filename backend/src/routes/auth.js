import { Router } from 'express';
import { createUser, login, createSession, userForToken, deleteSession, countUsers } from '../auth.js';

const router = Router();

// Optional invite code: if SC_INVITE is set in the environment, signups must
// provide it — keeps strangers from creating accounts on your server.
const INVITE = process.env.SC_INVITE || '';

function tokenFrom(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : (req.query.t || '');
}

// Tell the login screen whether an invite code is required.
router.get('/config', (req, res) => {
  res.json({ needsCode: !!INVITE, hasUsers: countUsers() > 0 });
});

router.post('/signup', (req, res) => {
  const { username, password, code } = req.body || {};
  if (INVITE && code !== INVITE) return res.status(403).json({ error: 'Invalid invite code' });
  try {
    const user = createUser(username, password);
    const token = createSession(user.id);
    res.json({ token, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = login(username, password);
  if (!user) return res.status(401).json({ error: 'Wrong username or password' });
  const token = createSession(user.id);
  res.json({ token, user });
});

router.get('/me', (req, res) => {
  const user = userForToken(tokenFrom(req));
  if (!user) return res.status(401).json({ error: 'Not logged in' });
  res.json({ user });
});

router.post('/logout', (req, res) => {
  deleteSession(tokenFrom(req));
  res.json({ ok: true });
});

export default router;
