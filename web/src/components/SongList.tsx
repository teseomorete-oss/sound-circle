import { Song } from '../api/client';
import { usePlayerStore } from '../store/player';
import { useMenuStore } from '../store/menu';
import { useLongPress } from '../hooks/useLongPress';
import { api } from '../api/client';
import { Icon } from './icons';

function Row({ song }: { song: Song }) {
  const { playOne, currentTrack } = usePlayerStore();
  const openMenu = useMenuStore((s) => s.open);
  const isCurrent = currentTrack?.title === song.title && currentTrack?.artist === song.artist;
  const press = useLongPress(() => openMenu(song), () => playOne(song));
  return (
    <div
      className={`sl-row ${isCurrent ? 'current' : ''}`}
      {...press}
      onContextMenu={(e) => { e.preventDefault(); openMenu(song); }}
      onMouseEnter={() => api.prewarmSong(song.title, song.artist)}
    >
      {song.thumbnail ? <img className="sl-art" src={song.thumbnail} alt="" draggable={false} /> : <div className="sl-art song-art-placeholder"><Icon name="music" size={18} /></div>}
      <div className="sl-info">
        <div className={`sl-title ${isCurrent ? 'accent' : ''}`}>{song.title}</div>
        <div className="sl-sub">{song.artist}</div>
      </div>
      <button className="sl-more" onClick={(e) => { e.stopPropagation(); openMenu(song); }} title="More"><Icon name="more" size={18} /></button>
    </div>
  );
}

// Horizontal, multi-row song list (YT-Music "Schnellauswahl" style).
export default function SongList({ songs }: { songs: Song[] }) {
  const cols: Song[][] = [];
  for (let i = 0; i < songs.length; i += 4) cols.push(songs.slice(i, i + 4));
  return (
    <div className="song-list">
      {cols.map((col, i) => (
        <div className="sl-col" key={i}>
          {col.map((s, j) => <Row key={(s.deezer_id ?? s.title) + '-' + j} song={s} />)}
        </div>
      ))}
    </div>
  );
}
