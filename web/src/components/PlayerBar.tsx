import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/player';
import { api } from '../api/client';
import { Icon } from './icons';
import NowPlaying from './NowPlaying';
import Marquee from './Marquee';
import AddToPlaylistModal from './AddToPlaylistModal';
import { openArtist } from '../lib/artist';
import { useLyricsStore } from '../store/lyrics';
import { useSettings } from '../store/settings';
import { dominantColor } from '../lib/color';

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerBar() {
  const { currentTrack, pending, loading, isPlaying, togglePlay, next, prev, setPlaying, loop, toggleLoop } = usePlayerStore();
  const audioRef = useRef<HTMLAudioElement>(null);
  const switching = useRef(false); // true while swapping the audio src to a new track
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(useSettings.getState().defaultVolume);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lyricsReq, setLyricsReq] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  const openLyrics = () => { if (currentTrack) { setLyricsReq(true); setExpanded(true); } };
  const closeExpanded = () => { setExpanded(false); setLyricsReq(false); };

  // What to display: the pending track shows instantly while it resolves.
  const disp = pending ?? currentTrack;

  const effectiveVol = muted ? 0 : volume;
  const volIcon = effectiveVol === 0 ? 'mute' : effectiveVol < 0.5 ? 'volumeLow' : 'volume';

  // Keyboard shortcuts (ignored while typing in an input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      const audio = audioRef.current;
      switch (e.key) {
        case ' ': if (disp) { e.preventDefault(); togglePlay(); } break;
        case 'ArrowRight': if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5); break;
        case 'ArrowLeft': if (audio) audio.currentTime = Math.max(0, audio.currentTime - 5); break;
        case 'ArrowUp': e.preventDefault(); setMuted(false); setVolume((v) => Math.min(1, v + 0.1)); break;
        case 'ArrowDown': e.preventDefault(); setMuted(false); setVolume((v) => Math.max(0, v - 0.1)); break;
        case 'm': case 'M': setMuted((m) => !m); break;
        case 'l': case 'L': toggleLoop(); break;
        case 'n': case 'N': next(); break;
        case 'p': case 'P': prev(); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disp, togglePlay, toggleLoop, next, prev]);

  // Reflect the current song in the browser tab title
  useEffect(() => {
    document.title = disp ? `${disp.title} · ${disp.artist ?? 'Unknown'} — Sound Circle` : 'Sound Circle';
  }, [disp?.title, disp?.artist]);

  // Prefetch lyrics the moment a track starts so they're instant when opened
  useEffect(() => { if (currentTrack) useLyricsStore.getState().fetch(currentTrack); }, [currentTrack?.id]);

  // Dynamic theming: tint the UI to the current album cover
  useEffect(() => {
    const root = document.documentElement;
    if (!useSettings.getState().dynamicTheme || !disp?.thumbnail) {
      root.style.removeProperty('--art-color');
      root.style.removeProperty('--art-soft');
      return;
    }
    let alive = true;
    dominantColor(disp.thumbnail).then(([r, g, b]) => {
      if (!alive) return;
      root.style.setProperty('--art-color', `rgb(${r}, ${g}, ${b})`);
      root.style.setProperty('--art-soft', `rgba(${r}, ${g}, ${b}, 0.30)`);
    }).catch(() => {});
    return () => { alive = false; };
  }, [disp?.thumbnail]);

  // Loop the current track when the loop button is on
  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop; }, [loop, currentTrack?.id]);

  // Load new track. Swapping src fires a spurious 'pause' event, so we guard it
  // (see onPause) and only treat a real autoplay block as a reason to stop.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    switching.current = true;
    audio.src = api.streamUrl(currentTrack.id);
    audio.play()
      .then(() => { switching.current = false; })
      .catch((e) => { switching.current = false; if (e?.name === 'NotAllowedError') setPlaying(false); });
  }, [currentTrack?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch((e) => { if (e?.name === 'NotAllowedError') setPlaying(false); });
    else audio.pause();
  }, [isPlaying]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = effectiveVol; }, [effectiveVol]);

  // Media Session — lock-screen / background controls on mobile
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist ?? 'Unknown',
      album: currentTrack.album ?? '',
      artwork: currentTrack.thumbnail
        ? [96, 256, 512].map((s) => ({ src: currentTrack.thumbnail!, sizes: `${s}x${s}`, type: 'image/jpeg' }))
        : [],
    });
    navigator.mediaSession.setActionHandler('play', () => setPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => setPlaying(false));
    navigator.mediaSession.setActionHandler('previoustrack', () => prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => next());
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (audioRef.current && d.seekTime != null) audioRef.current.currentTime = d.seekTime;
    });
  }, [currentTrack?.id]);

  useEffect(() => {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const seekTo = (t: number) => { if (audioRef.current) audioRef.current.currentTime = t; };

  return (
    <>
      <audio
        ref={audioRef}
        playsInline
        style={{ display: 'none' }}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setPosition(a.currentTime);
          if ('mediaSession' in navigator && a.duration && isFinite(a.duration)) {
            try { navigator.mediaSession.setPositionState({ duration: a.duration, position: a.currentTime, playbackRate: a.playbackRate }); } catch {}
          }
        }}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onPlay={() => setPlaying(true)}
        onPause={() => { if (!switching.current) setPlaying(false); }}
        onEnded={() => next()}
      />

      {expanded && currentTrack && (
        <NowPlaying
          position={position}
          duration={duration}
          onSeek={seekTo}
          onClose={closeExpanded}
          startLyrics={lyricsReq}
        />
      )}

      {disp && (
        <div className="player-bar">
          <div className="pb-left" onClick={() => currentTrack && setExpanded(true)}>
            {disp.thumbnail ? <img className="pb-art" src={disp.thumbnail} alt="" /> : <div className="pb-art song-art-placeholder"><Icon name="music" size={22} /></div>}
            <div className="pb-meta">
              <Marquee className="track-title" text={disp.title} />
              <div
                className="track-sub artist-link"
                onClick={(e) => { e.stopPropagation(); openArtist(navigate, disp.artist); }}
              >
                {disp.artist ?? 'Unknown'}
              </div>
            </div>
          </div>

          <div className="pb-controls">
            <div className="control-buttons">
              <button className={`ctrl loop-btn ${loop ? 'active' : ''}`} onClick={toggleLoop} title="Loop (L)"><Icon name="repeat" size={18} /></button>
              <button className="ctrl" onClick={() => prev()} title="Previous (P)"><Icon name="prev" size={20} /></button>
              <button className="play-btn" onClick={togglePlay} title="Play/Pause (Space)">
                {loading ? <span className="btn-spinner" /> : <Icon name={isPlaying ? 'pause' : 'play'} size={18} />}
              </button>
              <button className="ctrl" onClick={() => next()} title="Next (N)"><Icon name="next" size={20} /></button>
            </div>
            <div className="progress">
              <span className="time">{fmt(position)}</span>
              <div className="progress-bar" onClick={seek}>
                <div className="progress-fill" style={{ width: duration ? `${(position / duration) * 100}%` : '0%' }} />
              </div>
              <span className="time right">{fmt(duration)}</span>
            </div>
          </div>

          <div className="pb-right">
            <button className="icon-btn" title="Add to playlist" onClick={() => currentTrack && setAddOpen(true)} disabled={!currentTrack}><Icon name="addPlaylist" size={20} /></button>
            <button className="lyrics-pill" onClick={openLyrics} disabled={!currentTrack}>
              <Icon name="lyrics" size={18} /> Lyrics
            </button>
          </div>
        </div>
      )}

      {addOpen && currentTrack && (
        <AddToPlaylistModal trackId={currentTrack.id} onClose={() => setAddOpen(false)} />
      )}
    </>
  );
}
