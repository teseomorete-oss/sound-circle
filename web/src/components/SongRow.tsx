import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Song } from '../api/client';
import { useSocialStore } from '../store/social';
import { usePlayerStore } from '../store/player';
import LikeButton from './LikeButton';
import { Icon } from './icons';
import { openArtist } from '../lib/artist';
import { useMenuStore } from '../store/menu';
import { useLongPress } from '../hooks/useLongPress';

interface Props {
  song: Song;
  rank?: number;
  showAlbum?: boolean;
}

function fmt(sec: number | null) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongRow({ song, rank, showAlbum }: Props) {
  const navigate = useNavigate();
  const { likedSongs, toggleSong } = useSocialStore();
  const { currentTrack, playOne } = usePlayerStore();
  const openMenu = useMenuStore((s) => s.open);
  const isCurrent = currentTrack?.title === song.title && currentTrack?.artist === song.artist;
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>();
  const press = useLongPress(() => openMenu(song), () => playOne(song));

  // Prewarm the stream if the user hovers for a moment — so the click is instant.
  const onEnter = () => {
    hoverTimer.current = setTimeout(() => api.prewarmSong(song.title, song.artist), 220);
  };
  const onLeave = () => clearTimeout(hoverTimer.current);

  return (
    <div
      className={`song-row clickable ${isCurrent ? 'current' : ''}`}
      {...press}
      onContextMenu={(e) => { e.preventDefault(); openMenu(song); }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      {rank != null && <span className="song-rank">{rank}</span>}
      {song.thumbnail ? (
        <div className="song-art-wrap">
          <img className="song-art" src={song.thumbnail} alt="" />
          <button className="song-play" onClick={(e) => { e.stopPropagation(); playOne(song); }}><Icon name="play" size={16} /></button>
        </div>
      ) : (
        <div className="song-art song-art-placeholder"><Icon name="music" size={20} /></div>
      )}
      <div className="song-info">
        <div className={`song-title ${isCurrent ? 'accent' : ''}`}>{song.title}</div>
        <div className="song-sub">
          {song.artist && (
            <span
              className="artist-link"
              onClick={(e) => { e.stopPropagation(); openArtist(navigate, song.artist, song.artist_id); }}
            >
              {song.artist}
            </span>
          )}
          {showAlbum && song.album && (
            <>
              {' · '}
              <span
                className="artist-link"
                onClick={(e) => { e.stopPropagation(); if (song.album_id) navigate(`/album/${song.album_id}`); }}
              >
                {song.album}
              </span>
            </>
          )}
        </div>
      </div>
      <LikeButton liked={likedSongs.has(song.deezer_id)} onToggle={() => toggleSong(song)} />
      <span className="song-dur">{fmt(song.duration)}</span>
      <button className="icon-btn song-more" onClick={(e) => { e.stopPropagation(); openMenu(song); }} title="More"><Icon name="more" size={18} /></button>
    </div>
  );
}
