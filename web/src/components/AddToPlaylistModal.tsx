import { useEffect, useState } from 'react';
import { api, Playlist } from '../api/client';
import { Icon } from './icons';

interface Props {
  trackId: string;
  onClose: () => void;
  onDone?: () => void;
}

export default function AddToPlaylistModal({ trackId, onClose, onDone }: Props) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { api.getPlaylists().then(setPlaylists).catch(() => {}); }, []);

  const addTo = async (playlistId: string) => {
    await api.addToPlaylist(playlistId, trackId).catch(() => {});
    onDone?.();
    onClose();
  };

  const createAndAdd = async () => {
    if (!name.trim()) return;
    const pl = await api.createPlaylist(name.trim());
    await api.addToPlaylist(pl.id, trackId).catch(() => {});
    onDone?.();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Add to playlist</h3>

        {creating ? (
          <>
            <input
              autoFocus placeholder="New playlist name" value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createAndAdd()}
            />
            <div className="modal-actions">
              <button className="link-btn" onClick={() => setCreating(false)}>Back</button>
              <button className="link-btn accent" onClick={createAndAdd}>Create & add</button>
            </div>
          </>
        ) : (
          <>
            <button className="pl-pick" onClick={() => setCreating(true)}>
              <div className="thumb thumb-placeholder" style={{ background: 'var(--accent-grad)', color: '#fff' }}><Icon name="plus" size={18} /></div>
              <div className="track-info"><div className="track-title">New playlist</div></div>
            </button>
            {playlists.map((p) => (
              <button key={p.id} className="pl-pick" onClick={() => addTo(p.id)}>
                <div className="thumb thumb-placeholder"><Icon name="playlist" size={18} /></div>
                <div className="track-info"><div className="track-title">{p.name}</div></div>
              </button>
            ))}
            <div className="modal-actions">
              <button className="link-btn" onClick={onClose}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
