import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useMenuStore } from '../store/menu';
import { usePlayerStore } from '../store/player';
import { useSocialStore } from '../store/social';
import { Icon } from './icons';
import AddToPlaylistModal from './AddToPlaylistModal';

function fmt(sec: number | null) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongMenu() {
  const song = useMenuStore((s) => s.song);
  const close = useMenuStore((s) => s.close);
  const { playNext, addToQueue } = usePlayerStore();
  const { likedSongs, toggleSong } = useSocialStore();
  const navigate = useNavigate();
  const [addTrackId, setAddTrackId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!song) return null;
  const liked = likedSongs.has(song.deezer_id);

  const saveToPlaylist = async () => {
    setBusy('save');
    try { const t = await api.resolveTrack(song); setAddTrackId(t.id); }
    finally { setBusy(null); }
  };

  const download = async () => {
    setBusy('download');
    try { const t = await api.resolveTrack(song); await api.downloadTrack(t.id); }
    catch {}
    finally { setBusy(null); close(); }
  };

  const share = async () => {
    const url = song.deezer_id ? `https://www.deezer.com/track/${song.deezer_id}` : undefined;
    const text = `${song.title} — ${song.artist ?? ''}`.trim();
    try {
      if (navigator.share) await navigator.share({ title: song.title, text, url });
      else { await navigator.clipboard.writeText(url ? `${text}  ${url}` : text); alert('Link copied to clipboard'); }
    } catch {}
    close();
  };

  const options: { key: string; label: string; icon: any; onClick: () => void }[] = [
    { key: 'download', label: busy === 'download' ? 'Downloading…' : 'Download', icon: 'download', onClick: download },
    { key: 'queue', label: 'Add to queue', icon: 'playlist', onClick: () => { addToQueue(song); close(); } },
    { key: 'share', label: 'Share', icon: 'share', onClick: share },
    { key: 'album', label: 'Show album', icon: 'disc', onClick: () => { if (song.album_id) { navigate(`/album/${song.album_id}`); } close(); } },
    { key: 'hide', label: 'Not interested', icon: 'close', onClick: () => { api.hideSong(song.title, song.artist); close(); } },
    { key: 'block', label: "Don't recommend this artist", icon: 'star', onClick: () => { if (song.artist) api.blockArtist(song.artist); close(); } },
  ];

  return (
    <>
      <div className="sheet-overlay" onClick={close}>
        <div className="song-sheet" onClick={(e) => e.stopPropagation()}>
          <div className="sheet-grip" />

          <div className="sheet-head">
            {song.thumbnail ? <img className="sheet-art" src={song.thumbnail} alt="" /> : <div className="sheet-art song-art-placeholder"><Icon name="music" size={22} /></div>}
            <div className="sheet-info">
              <div className="sheet-title">{song.title}</div>
              <div className="sheet-sub">{song.artist}{song.duration ? ` · ${fmt(song.duration)}` : ''}</div>
            </div>
          </div>

          <div className="sheet-actions">
            <button className="sheet-act" onClick={() => { playNext(song); close(); }}>
              <span className="sheet-act-ico"><Icon name="next" size={22} /></span>
              Play next
            </button>
            <button className="sheet-act" onClick={() => toggleSong(song)}>
              <span className={`sheet-act-ico ${liked ? 'liked' : ''}`}><Icon name={liked ? 'heartFill' : 'heart'} size={22} /></span>
              {liked ? 'Liked' : 'Like'}
            </button>
            <button className="sheet-act" onClick={saveToPlaylist}>
              <span className="sheet-act-ico"><Icon name="addPlaylist" size={22} /></span>
              {busy === 'save' ? 'Saving…' : 'Playlist'}
            </button>
          </div>

          <div className="sheet-options">
            {options.map((o) => (
              <button key={o.key} className="sheet-option" onClick={o.onClick}>
                <Icon name={o.icon} size={20} />
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {addTrackId && (
        <AddToPlaylistModal trackId={addTrackId} onClose={() => { setAddTrackId(null); close(); }} />
      )}
    </>
  );
}
