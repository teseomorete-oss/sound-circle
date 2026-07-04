import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Track, Playlist } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';
import { PlaylistCover } from './Playlists';
import { Icon } from '../components/icons';

// Downscale a picked image to a compact data URL for the cover.
function fileToCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 600;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const s = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const play = usePlayerStore((s) => s.play);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [dl, setDl] = useState<{ done: number; total: number } | null>(null);

  const downloadAll = async () => {
    const pending = tracks.filter((t) => !t.downloaded_path);
    if (!pending.length) return;
    setDl({ done: 0, total: pending.length });
    for (let i = 0; i < pending.length; i++) {
      try { await api.downloadTrack(pending[i].id); } catch {}
      setDl({ done: i + 1, total: pending.length });
    }
    setDl(null);
    load();
  };

  const load = () => {
    if (!id) return;
    Promise.all([
      api.getPlaylist(id).then(setMeta).catch(() => {}),
      api.getPlaylistTracks(id).then(setTracks).catch(console.error),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [id]);

  const remove = async (track: Track) => {
    if (!id) return;
    setTracks((prev) => prev.filter((t) => t.id !== track.id));
    await api.removeFromPlaylist(id, track.id);
  };

  const move = (from: number, to: number) => {
    setTracks((prev) => { const a = [...prev]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; });
  };

  const saveOrder = async () => {
    setEditing(false);
    if (id) await api.reorderPlaylist(id, tracks.map((t) => t.id));
  };

  const onPickCover = async (file?: File) => {
    if (!file || !id) return;
    const cover = await fileToCover(file);
    await api.setPlaylistCover(id, cover);
    load();
  };

  const onMove = (e: React.PointerEvent) => {
    if (dragFrom.current == null) return;
    const el = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest('.edit-row') as HTMLElement | null;
    if (!el) return;
    const to = Number(el.dataset.idx);
    if (!Number.isNaN(to) && to !== dragFrom.current) { move(dragFrom.current, to); dragFrom.current = to; }
  };

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="hero">
        <div className="hero-art" style={{ overflow: 'hidden', padding: 0 }}>
          {meta ? <PlaylistCover playlist={meta} /> : null}
        </div>
        <div className="hero-info">
          <span className="hero-label">Playlist</span>
          <h1 className="hero-name">{meta?.name ?? 'Playlist'}</h1>
          <span className="hero-meta">{tracks.length} song{tracks.length === 1 ? '' : 's'}</span>
          <div className="hero-actions">
            {tracks.length > 0 && <button className="btn-primary" onClick={() => play(tracks, 0)}><Icon name="play" size={16} /> Play</button>}
            {editing ? (
              <button className="btn-ghost" onClick={saveOrder}>Done</button>
            ) : (
              <button className="btn-ghost" onClick={() => setEditing(true)} disabled={!tracks.length}>Edit</button>
            )}
            {tracks.length > 0 && (() => {
              const offline = tracks.every((t) => t.downloaded_path);
              return (
                <button className="btn-ghost" onClick={downloadAll} disabled={!!dl || offline}>
                  <Icon name="download" size={15} />{' '}
                  {dl ? `Downloading ${dl.done}/${dl.total}…` : offline ? 'Downloaded' : 'Download'}
                </button>
              );
            })()}
            <button className="btn-ghost" onClick={() => fileRef.current?.click()}>Change photo</button>
            {meta?.cover && <button className="btn-ghost" onClick={async () => { if (id) { await api.setPlaylistCover(id, null); load(); } }}>Remove photo</button>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPickCover(e.target.files?.[0])} />
          </div>
        </div>
      </div>

      {!tracks.length ? (
        <div className="empty">No tracks yet. Add songs with the ⋮ menu → Playlist.</div>
      ) : editing ? (
        <div className="section">
          {tracks.map((track, i) => (
            <div
              key={track.id}
              className="edit-row"
              data-idx={i}
              onPointerDown={(e) => { dragFrom.current = i; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
              onPointerMove={onMove}
              onPointerUp={() => { dragFrom.current = null; }}
              onPointerCancel={() => { dragFrom.current = null; }}
            >
              <span className="edit-handle"><Icon name="queue" size={18} /></span>
              {track.thumbnail ? <img className="thumb" src={track.thumbnail} alt="" draggable={false} /> : <div className="thumb thumb-placeholder"><Icon name="music" size={18} /></div>}
              <div className="track-info"><div className="track-title">{track.title}</div><div className="track-sub">{track.artist}</div></div>
              <button className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={() => remove(track)}><Icon name="close" size={16} /></button>
            </div>
          ))}
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
