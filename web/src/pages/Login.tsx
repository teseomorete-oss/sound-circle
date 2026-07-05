import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../store/auth';
import { Icon } from '../components/icons';

export default function Login() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [needsCode, setNeedsCode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.authConfig().then((c) => {
      setNeedsCode(c.needsCode);
      if (!c.hasUsers) setMode('signup'); // first account on a fresh server
    }).catch(() => {});
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      if (mode === 'login') await login(username.trim(), password);
      else await signup(username.trim(), password, code.trim() || undefined);
    } catch (err: any) {
      setError((err?.message || 'Something went wrong').replace(/^API error \d+: /, ''));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="login-card" onSubmit={submit}>
        <div className="login-logo"><Icon name="music" size={40} /></div>
        <h1 className="login-title">Sound Circle</h1>
        <p className="login-sub">{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</p>

        <input className="login-input" placeholder="Username" autoCapitalize="none" autoCorrect="off"
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="login-input" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {mode === 'signup' && needsCode && (
          <input className="login-input" placeholder="Invite code" value={code} onChange={(e) => setCode(e.target.value)} />
        )}

        {error && <div className="login-error">{error}</div>}

        <button className="login-btn" type="submit" disabled={busy || !username || !password}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <button type="button" className="login-toggle" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          {mode === 'login' ? "No account? Create one" : 'Have an account? Sign in'}
        </button>
      </form>
      <p className="login-foot">Each account keeps its own private library and feed.</p>
    </div>
  );
}
