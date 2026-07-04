import { useEffect, useState } from 'react';
import { api, Track } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/icons';

function fmtSize(bytes: number) {
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.round(bytes / 1e3)} KB`;
}

export default function Downloads() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [bytes, setBytes] = useState(0);
  const play = usePlayerStore((s) => s.play);

  const load = async () => {
    try {
      const all = await api.getTracks();
      setTracks(all.filter((t) => t.downloaded_path));
      api.storage().then((s) => setBytes(s.bytes)).catch(() => {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = async (track: Track) => {
    // Keep the song in your library — just delete the offline file.
    await api.removeDownload(track.id);
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    api.storage().then((s) => setBytes(s.bytes)).catch(() => {});
  };

  const clearAll = async () => {
    if (!confirm('Remove all downloads? Songs stay in your library, only the offline files are deleted.')) return;
    await Promise.all(tracks.map((t) => api.removeDownload(t.id).catch(() => {})));
    setTracks([]); setBytes(0);
  };

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="hero">
        <div className="hero-art" style={{ background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <Icon name="download" size={64} />
        </div>
        <div className="hero-info">
          <span className="hero-label">Offline</span>
          <h1 className="hero-name">Downloads</h1>
          <span className="hero-meta">{tracks.length} song{tracks.length === 1 ? '' : 's'}{bytes ? ` · ${fmtSize(bytes)}` : ''} · plays without internet</span>
          {tracks.length > 0 && (
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => play(tracks, 0)}><Icon name="play" size={16} /> Play</button>
              <button className="btn-ghost" onClick={clearAll}>Remove all</button>
            </div>
          )}
        </div>
      </div>

      {!tracks.length ? (
        <div className="empty">
          <h3>No downloads yet</h3>
          <p>Open the ⋮ menu on any song and tap <b>Download</b> to save it for offline.</p>
        </div>
      ) : (
        <div className="section">
          {tracks.map((track, i) => (
            <TrackRow key={track.id} track={track} onPlay={() => play(tracks, i)} onRemove={() => remove(track)} />
          ))}
        </div>
      )}
    </div>
  );
}
