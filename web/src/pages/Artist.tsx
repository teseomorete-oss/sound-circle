import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ArtistResult, Song, Album } from '../api/client';
import { usePlayerStore } from '../store/player';
import { useSocialStore } from '../store/social';
import SongRow from '../components/SongRow';
import { AlbumCard } from '../components/Cards';
import { Icon } from '../components/icons';

function fans(n: number | null) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M fans`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K fans`;
  return `${n} fans`;
}

export default function Artist() {
  const { id } = useParams<{ id: string }>();
  const deezerId = Number(id);
  const [artist, setArtist] = useState<ArtistResult | null>(null);
  const [top, setTop] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore((s) => s.play);
  const { followed, toggleFollow, load: loadSocial, loaded } = useSocialStore();

  useEffect(() => { if (!loaded) loadSocial(); }, [loaded]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getArtist(deezerId).then(setArtist).catch(() => {}),
      api.getArtistTop(deezerId).then((songs) => {
        setTop(songs);
        // Prewarm the first few so hitting Play / the top song is instant.
        songs.slice(0, 3).forEach((s) => api.prewarmSong(s.title, s.artist));
      }).catch(() => setTop([])),
      api.getArtistAlbums(deezerId).then(setAlbums).catch(() => setAlbums([])),
    ]).finally(() => setLoading(false));
  }, [deezerId]);

  if (loading) return <div className="spinner">Loading…</div>;
  if (!artist) return <div className="empty">Artist not found.</div>;

  const isFollowing = followed.has(deezerId);

  return (
    <div>
      <div className="artist-banner">
        {artist.picture
          ? <div className="artist-banner-img" style={{ backgroundImage: `url(${artist.picture})` }} />
          : <div className="artist-banner-img placeholder-bg" />}
        <div className="artist-banner-fade" />
        <div className="artist-banner-content">
          <span className="hero-label">Artist</span>
          <h1 className="artist-banner-name">{artist.name}</h1>
          <span className="hero-meta">{fans(artist.nb_fan)}</span>
          <div className="hero-actions">
            {top.length > 0 && <button className="btn-primary" onClick={() => play(top, 0)}><Icon name="play" size={16} /> Play</button>}
            <button
              className={`btn-ghost ${isFollowing ? 'active' : ''}`}
              onClick={() => toggleFollow({ deezer_id: deezerId, name: artist.name, picture: artist.picture })}
            >
              {isFollowing ? '✓ Following' : '+ Follow'}
            </button>
          </div>
        </div>
      </div>

      {top.length > 0 && (
        <div className="section">
          <h2 className="section-title">Popular</h2>
          {top.slice(0, 10).map((s, i) => <SongRow key={s.deezer_id} song={s} rank={i + 1} showAlbum />)}
        </div>
      )}

      {albums.length > 0 && (
        <div className="section">
          <h2 className="section-title">Albums</h2>
          <div className="card-grid">
            {albums.map((a) => <AlbumCard key={a.deezer_id} album={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}
