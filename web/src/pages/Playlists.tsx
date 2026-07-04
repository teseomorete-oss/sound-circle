import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Playlist } from '../api/client';
import { Icon } from '../components/icons';

export function PlaylistCover({ playlist }: { playlist: Playlist }) {
  if (playlist.cover) return <img className="card-img" src={playlist.cover} alt="" />;
  const c = playlist.collage ?? [];
  if (c.length >= 4) {
    return (
      <div className="card-img pl-collage">
        {c.slice(0, 4).map((src, i) => <img key={i} src={src} alt="" />)}
      </div>
    );
  }
  if (c.length > 0) return <img className="card-img" src={c[0]} alt="" />;
  return <div className="card-img placeholder" style={{ background: 'var(--surface-2)', color: 'var(--text-dim)' }}><Icon name="playlist" size={40} /></div>;
}

export default function Playlists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try { setPlaylists(await api.getPlaylists()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name.trim()) return;
    await api.createPlaylist(name.trim());
    setName('');
    setShowModal(false);
    load();
  };

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="main-topbar">
        <h1 className="page-title">Playlists</h1>
        <div style={{ flex: 1 }} />
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ New playlist</button>
      </div>

      <div className="card-grid">
        {/* Permanent Downloads shortcut */}
        <button className="media-card" onClick={() => navigate('/downloads')}>
          <div className="card-img-wrap">
            <div className="card-img placeholder" style={{ background: 'var(--accent-grad)', color: '#fff' }}><Icon name="download" size={40} /></div>
          </div>
          <div className="card-title">Downloads</div>
          <div className="card-sub">Offline songs</div>
        </button>

        {playlists.map((p) => (
          <button key={p.id} className="media-card" onClick={() => navigate(`/playlist/${p.id}`, { state: { name: p.name } })}>
            <div className="card-img-wrap">
              <PlaylistCover playlist={p} />
            </div>
            <div className="card-title">{p.name}</div>
            <div className="card-sub">Playlist</div>
          </button>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>New playlist</h3>
            <input
              autoFocus placeholder="Playlist name" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
            />
            <div className="modal-actions">
              <button className="link-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="link-btn accent" onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
