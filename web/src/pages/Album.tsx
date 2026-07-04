import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, AlbumDetail } from '../api/client';
import { usePlayerStore } from '../store/player';
import { useSocialStore } from '../store/social';
import SongRow from '../components/SongRow';
import LikeButton from '../components/LikeButton';
import { Icon } from '../components/icons';

export default function Album() {
  const { id } = useParams<{ id: string }>();
  const deezerId = Number(id);
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore((s) => s.play);
  const { likedAlbums, toggleAlbum, load: loadSocial, loaded } = useSocialStore();
  const navigate = useNavigate();

  useEffect(() => { if (!loaded) loadSocial(); }, [loaded]);

  useEffect(() => {
    setLoading(true);
    api.getAlbum(deezerId).then((a) => {
      setAlbum(a);
      a.tracks.slice(0, 3).forEach((t) => api.prewarmSong(t.title, t.artist));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [deezerId]);

  if (loading) return <div className="spinner">Loading…</div>;
  if (!album) return <div className="empty">Album not found.</div>;

  const year = album.release_date?.slice(0, 4);

  return (
    <div>
      <div className="hero">
        {album.cover && <div className="np-bg" style={{ backgroundImage: `url(${album.cover})` }} />}
        {album.cover ? <img className="hero-art" src={album.cover} alt="" /> : <div className="hero-art song-art-placeholder"><Icon name="disc" size={64} /></div>}
        <div className="hero-info">
          <span className="hero-label">Album</span>
          <h1 className="hero-name">{album.title}</h1>
          <span className="hero-meta">
            <span className="artist-link" onClick={() => album.artist_id && navigate(`/artist/${album.artist_id}`)}>{album.artist}</span>
            {year ? ` · ${year}` : ''}{album.nb_tracks ? ` · ${album.nb_tracks} songs` : ''}
          </span>
          <div className="hero-actions">
            {album.tracks.length > 0 && <button className="btn-primary" onClick={() => play(album.tracks, 0)}><Icon name="play" size={16} /> Play</button>}
            <LikeButton size={26} liked={likedAlbums.has(deezerId)} onToggle={() => toggleAlbum(album)} />
          </div>
        </div>
      </div>

      <div className="section">
        {album.tracks.map((t, i) => <SongRow key={t.deezer_id} song={t} rank={i + 1} />)}
      </div>
    </div>
  );
}
