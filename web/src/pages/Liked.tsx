import { useEffect, useState } from 'react';
import { api, LikedSong, LikedAlbum, Song } from '../api/client';
import { usePlayerStore } from '../store/player';
import { useSocialStore } from '../store/social';
import SongRow from '../components/SongRow';
import { AlbumCard } from '../components/Cards';
import { Icon } from '../components/icons';

export default function Liked() {
  const [songs, setSongs] = useState<LikedSong[]>([]);
  const [albums, setAlbums] = useState<LikedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore((s) => s.play);
  const { likedSongs, likedAlbums, loaded, load } = useSocialStore();

  const refresh = async () => {
    const [s, a] = await Promise.all([api.getLikedSongs(), api.getLikedAlbums()]);
    setSongs(s); setAlbums(a); setLoading(false);
  };
  // Re-fetch whenever the liked sets change (like/unlike elsewhere)
  useEffect(() => { if (!loaded) load(); refresh(); }, [likedSongs.size, likedAlbums.size]);

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="hero">
        <div className="hero-art" style={{ background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Icon name="heartFill" size={72} /></div>
        <div className="hero-info">
          <span className="hero-label">Playlist</span>
          <h1 className="hero-name">Liked Songs</h1>
          <span className="hero-meta">{songs.length} songs · {albums.length} albums</span>
          {songs.length > 0 && (
            <div className="hero-actions">
              <button className="btn-primary" onClick={() => play(songs as Song[], 0)}><Icon name="play" size={16} /> Play</button>
            </div>
          )}
        </div>
      </div>

      {songs.length > 0 && (
        <div className="section">
          <h2 className="section-title">Songs</h2>
          {songs.map((s, i) => <SongRow key={s.id} song={s} rank={i + 1} showAlbum />)}
        </div>
      )}

      {albums.length > 0 && (
        <div className="section">
          <h2 className="section-title">Albums</h2>
          <div className="card-grid">
            {albums.map((a) => (
              <AlbumCard key={a.id} album={{ deezer_id: a.deezer_id, title: a.title, artist: a.artist, cover: a.cover, artist_id: null, release_date: null, nb_tracks: null }} />
            ))}
          </div>
        </div>
      )}

      {!songs.length && !albums.length && (
        <div className="empty">
          <h3>No likes yet</h3>
          <p>Tap the heart on any song or album to save it here.</p>
        </div>
      )}
    </div>
  );
}
