import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useMenuStore } from '../store/menu';
import { usePlayerStore } from '../store/player';
import { useSocialStore } from '../store/social';
import { useSettings } from '../store/settings';
import { useBackClose } from '../lib/useBackClose';
import { Icon } from './icons';
import AddToPlaylistModal from './AddToPlaylistModal';

function fmt(sec: number | null) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Action { label: string; icon: string; onClick: () => void; active?: boolean; }

export default function SongMenu() {
  const song = useMenuStore((s) => s.song);
  const close = useMenuStore((s) => s.close);
  const { playNext, addToQueue, play } = usePlayerStore();
  const { likedSongs, toggleSong } = useSocialStore();
  const { menuBig, menuOptions } = useSettings();
  const navigate = useNavigate();
  const [addTrackId, setAddTrackId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useBackClose(!!song, close);

  if (!song) return null;
  const liked = likedSongs.has(song.deezer_id);

  const saveToPlaylist = async () => {
    setBusy('save');
    try { const t = await api.resolveTrack(song); setAddTrackId(t.id); }
    finally { setBusy(null); }
  };
  const download = async () => {
    setBusy('download');
    try { const t = await api.resolveTrack(song); await api.downloadTrack(t.id); } catch {}
    finally { setBusy(null); close(); }
  };
  const link = song.deezer_id ? `https://www.deezer.com/track/${song.deezer_id}` : '';
  const share = async () => {
    const text = `${song.title} — ${song.artist ?? ''}`.trim();
    try {
      if (navigator.share) await navigator.share({ title: song.title, text, url: link || undefined });
      else { await navigator.clipboard.writeText(link ? `${text}  ${link}` : text); alert('Link copied'); }
    } catch {}
    close();
  };

  // Every action, keyed. Rendered per the user's Settings choices.
  const A: Record<string, Action> = {
    playNext: { label: 'Play next', icon: 'next', onClick: () => { playNext(song); close(); } },
    queue: { label: 'Add to queue', icon: 'playlist', onClick: () => { addToQueue(song); close(); } },
    like: { label: liked ? 'Liked' : 'Like', icon: liked ? 'heartFill' : 'heart', active: liked, onClick: () => toggleSong(song) },
    playlist: { label: busy === 'save' ? 'Saving…' : 'Playlist', icon: 'addPlaylist', onClick: saveToPlaylist },
    radio: { label: 'Start radio', icon: 'shuffle', onClick: () => { play([song], 0); close(); } },
    download: { label: busy === 'download' ? 'Downloading…' : 'Download', icon: 'download', onClick: download },
    share: { label: 'Share', icon: 'share', onClick: share },
    album: { label: 'Go to album', icon: 'disc', onClick: () => { if (song.album_id) navigate(`/album/${song.album_id}`); close(); } },
    artist: { label: 'Go to artist', icon: 'star', onClick: () => { if (song.artist_id) navigate(`/artist/${song.artist_id}`); close(); } },
    copyLink: { label: 'Copy link', icon: 'share', onClick: async () => { if (link) { await navigator.clipboard.writeText(link); alert('Link copied'); } close(); } },
    hide: { label: 'Not interested', icon: 'close', onClick: () => { api.hideSong(song.title, song.artist); close(); } },
    block: { label: "Don't recommend artist", icon: 'star', onClick: () => { if (song.artist) api.blockArtist(song.artist); close(); } },
  };

  const bigs = menuBig.map((k) => A[k]).filter(Boolean).slice(0, 3);
  const opts = menuOptions
    .map((k) => ({ k, a: A[k] }))
    .filter((x) => x.a && !(x.k === 'album' && !song.album_id) && !(x.k === 'artist' && !song.artist_id));

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

          {bigs.length > 0 && (
            <div className="sheet-actions">
              {bigs.map((a, i) => (
                <button key={i} className="sheet-act" onClick={a.onClick}>
                  <span className={`sheet-act-ico ${a.active ? 'liked' : ''}`}><Icon name={a.icon as any} size={22} /></span>
                  {a.label}
                </button>
              ))}
            </div>
          )}

          <div className="sheet-options">
            {opts.map(({ k, a }) => (
              <button key={k} className="sheet-option" onClick={a.onClick}>
                <Icon name={a.icon as any} size={20} />
                <span>{a.label}</span>
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
