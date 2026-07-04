import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArtistResult, Album, Song, Track, PlayItem, api } from '../api/client';
import { usePlayerStore } from '../store/player';
import { useMenuStore } from '../store/menu';
import { useLongPress } from '../hooks/useLongPress';
import { Icon } from './icons';

function fans(n: number | null) {
  if (!n) return '';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M fans`;
  if (n >= 1_000) return `${Math.round(n / 1000)}K fans`;
  return `${n} fans`;
}

export function ArtistCard({ artist }: { artist: ArtistResult }) {
  const navigate = useNavigate();
  return (
    <button className="media-card" onClick={() => navigate(`/artist/${artist.deezer_id}`)}>
      <div className="card-img-wrap round">
        {artist.picture ? <img className="card-img" src={artist.picture} alt="" /> : <div className="card-img placeholder"><Icon name="starFill" size={40} /></div>}
      </div>
      <div className="card-title">{artist.name}</div>
      <div className="card-sub">{fans(artist.nb_fan)}</div>
    </button>
  );
}

// A square play card for the feed (songs or tracks). Plays on click.
export function SongCard({ song }: { song: Song }) {
  const playOne = usePlayerStore((s) => s.playOne);
  const openMenu = useMenuStore((s) => s.open);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const press = useLongPress(() => openMenu(song), () => playOne(song));
  return (
    <div
      className="media-card"
      {...press}
      onContextMenu={(e) => { e.preventDefault(); openMenu(song); }}
      onMouseEnter={() => { hoverTimer.current = setTimeout(() => api.prewarmSong(song.title, song.artist), 220); }}
      onMouseLeave={() => clearTimeout(hoverTimer.current)}
      style={{ cursor: 'pointer' }}
    >
      <div className="card-img-wrap">
        {song.thumbnail ? <img className="card-img" src={song.thumbnail} alt="" /> : <div className="card-img placeholder"><Icon name="music" size={40} /></div>}
        <span className="card-play"><Icon name="play" size={17} /></span>
        <button className="card-more" onClick={(e) => { e.stopPropagation(); openMenu(song); }} title="More"><Icon name="more" size={18} /></button>
      </div>
      <div className="card-title">{song.title}</div>
      <div className="card-sub">{song.artist}</div>
    </div>
  );
}

export function TrackCard({ track, queue, index }: { track: Track; queue: PlayItem[]; index: number }) {
  const play = usePlayerStore((s) => s.play);
  return (
    <div className="media-card" onClick={() => play(queue, index)} style={{ cursor: 'pointer' }}>
      <div className="card-img-wrap">
        {track.thumbnail ? <img className="card-img" src={track.thumbnail} alt="" /> : <div className="card-img placeholder"><Icon name="music" size={40} /></div>}
        <span className="card-play"><Icon name="play" size={17} /></span>
      </div>
      <div className="card-title">{track.title}</div>
      <div className="card-sub">{track.artist}</div>
    </div>
  );
}

export function AlbumCard({ album }: { album: Album }) {
  const navigate = useNavigate();
  const year = album.release_date?.slice(0, 4);
  return (
    <button className="media-card" onClick={() => navigate(`/album/${album.deezer_id}`)}>
      <div className="card-img-wrap">
        {album.cover ? <img className="card-img" src={album.cover} alt="" /> : <div className="card-img placeholder"><Icon name="disc" size={40} /></div>}
      </div>
      <div className="card-title">{album.title}</div>
      <div className="card-sub">{[year, album.artist].filter(Boolean).join(' · ')}</div>
    </button>
  );
}
