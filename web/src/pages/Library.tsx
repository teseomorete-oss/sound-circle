import { useEffect, useState } from 'react';
import { api, Track, Playlist } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';
import { Icon } from '../components/icons';

export default function Library() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [addingTrack, setAddingTrack] = useState<Track | null>(null);
  const play = usePlayerStore((s) => s.play);

  const load = async () => {
    try {
      setTracks(await api.getTracks());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const download = async (track: Track) => {
    try {
      await api.downloadTrack(track.id);
      load();
    } catch (e: any) { alert('Download failed: ' + e.message); }
  };

  const remove = async (track: Track) => {
    if (!confirm(`Remove "${track.title}" from library?`)) return;
    await api.deleteTrack(track.id);
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
  };

  const openAddToPlaylist = async (track: Track) => {
    setPlaylists(await api.getPlaylists());
    setAddingTrack(track);
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!addingTrack) return;
    await api.addToPlaylist(playlistId, addingTrack.id);
    setAddingTrack(null);
  };

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="main-topbar"><h1 className="page-title">Songs</h1></div>

      {!tracks.length ? (
        <div className="empty">
          <h3>No songs yet</h3>
          <p>Play or add music and it collects here — ready to download for offline.</p>
        </div>
      ) : (
        tracks.map((track, i) => (
          <TrackRow
            key={track.id}
            track={track}
            onPlay={() => play(tracks, i)}
            onAdd={() => openAddToPlaylist(track)}
            addLabel="Add to playlist"
            onDownload={() => download(track)}
            onRemove={() => remove(track)}
          />
        ))
      )}

      {addingTrack && (
        <div className="modal-overlay" onClick={() => setAddingTrack(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add to playlist</h3>
            {playlists.length ? (
              playlists.map((p) => (
                <div key={p.id} className="track-row" onClick={() => addToPlaylist(p.id)} style={{ cursor: 'pointer' }}>
                  <div className="thumb thumb-placeholder"><Icon name="playlist" size={20} /></div>
                  <div className="track-info"><div className="track-title">{p.name}</div></div>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-dim)' }}>No playlists yet. Create one first.</p>
            )}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="link-btn" onClick={() => setAddingTrack(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
