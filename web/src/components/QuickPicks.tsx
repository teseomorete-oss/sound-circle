import { useRef } from 'react';
import { Song } from '../api/client';
import { usePlayerStore } from '../store/player';
import { useMenuStore } from '../store/menu';
import { useLongPress } from '../hooks/useLongPress';
import { api } from '../api/client';
import { Icon } from './icons';

function Tile({ song }: { song: Song }) {
  const { playOne, currentTrack } = usePlayerStore();
  const openMenu = useMenuStore((s) => s.open);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const isCurrent = currentTrack?.title === song.title && currentTrack?.artist === song.artist;
  const press = useLongPress(() => openMenu(song), () => playOne(song));
  return (
    <button
      className={`qp-tile ${isCurrent ? 'current' : ''}`}
      {...press}
      onContextMenu={(e) => { e.preventDefault(); openMenu(song); }}
      onMouseEnter={() => { timer.current = setTimeout(() => api.prewarmSong(song.title, song.artist), 220); }}
      onMouseLeave={() => clearTimeout(timer.current)}
    >
      {song.thumbnail ? <img className="qp-art" src={song.thumbnail} alt="" /> : <div className="qp-art placeholder"><Icon name="music" size={26} /></div>}
      <div className="qp-fade" />
      <div className="qp-text">
        <div className="qp-title">{song.title}</div>
        <div className="qp-artist">{song.artist}</div>
      </div>
      <span className="qp-more" onClick={(e) => { e.stopPropagation(); openMenu(song); }}><Icon name="more" size={16} /></span>
    </button>
  );
}

// YT-Music "Kurzwahl" style: a 3-row grid of square tiles that scrolls
// horizontally, title overlaid on the artwork.
export default function QuickPicks({ songs }: { songs: Song[] }) {
  return (
    <div className="quickpicks">
      {songs.map((song, i) => <Tile key={(song.deezer_id ?? song.title) + '-' + i} song={song} />)}
    </div>
  );
}
