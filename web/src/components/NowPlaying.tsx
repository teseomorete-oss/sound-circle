import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayerStore } from '../store/player';
import { useLyricsStore } from '../store/lyrics';
import { useSettings } from '../store/settings';
import { api } from '../api/client';
import { Icon } from './icons';
import AddToPlaylistModal from './AddToPlaylistModal';
import { openArtist } from '../lib/artist';

function fmt(sec: number) {
  if (!isFinite(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Entry = { time: number; text?: string; interlude?: boolean };

// Memoized so it only re-renders when the active line changes — not on every
// audio time-update — which keeps the lyrics view smooth (no lag).
const LyricsList = memo(function LyricsList({
  entries, activeIdx, seek, activeRef,
}: { entries: Entry[]; activeIdx: number; seek: (t: number) => void; activeRef: React.RefObject<HTMLDivElement> }) {
  return (
    <>
      {entries.map((e, i) => {
        const state = i === activeIdx ? 'active' : i < activeIdx ? 'passed' : '';
        const ref = i === activeIdx ? activeRef : null;
        if (e.interlude) {
          return (
            <div key={i} ref={ref} className={`lyric-interlude ${state}`} onClick={() => seek(e.time)}>
              <span className="note"><Icon name="music" size={22} /></span>
              <span className="note"><Icon name="music" size={22} /></span>
              <span className="note"><Icon name="music" size={22} /></span>
            </div>
          );
        }
        return (
          <div key={i} ref={ref} className={`lyric-line ${state}`} onClick={() => seek(e.time)}>{e.text}</div>
        );
      })}
    </>
  );
});

interface Props {
  position: number;
  duration: number;
  onSeek: (t: number) => void;
  onClose: () => void;
  startLyrics?: boolean;
}

export default function NowPlaying({ position, duration, onSeek, onClose, startLyrics }: Props) {
  const { currentTrack, isPlaying, togglePlay, next, prev, loop, toggleLoop } = usePlayerStore();
  const [lyricsOpen, setLyricsOpen] = useState(!!startLyrics);
  const [addOpen, setAddOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const activeLineRef = useRef<HTMLDivElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const touchY = useRef<number | null>(null);
  const navigate = useNavigate();

  // Lyrics come from the prefetch store (fetched when the song started) → instant.
  const entry = useLyricsStore((s) => (currentTrack ? s.cache[currentTrack.id] : undefined));
  useEffect(() => { if (currentTrack) useLyricsStore.getState().fetch(currentTrack); }, [currentTrack?.id]);
  const synced = entry?.synced ?? null;
  const plain = entry?.plain ?? null;
  const lyricsLoading = entry?.loading ?? !entry;

  const { lyricOffset, showNotes, reduceMotion } = useSettings();
  const GAP = 6;
  const entries = useMemo(() => {
    if (!synced || !synced.length) return [] as Entry[];
    const out: Entry[] = [];
    if (showNotes && synced[0].time > GAP) out.push({ time: 0, interlude: true });
    for (let i = 0; i < synced.length; i++) {
      out.push({ time: synced[i].time, text: synced[i].text });
      // Only add note-breaks BETWEEN real lines (no trailing outro bars).
      if (showNotes && i + 1 < synced.length && synced[i + 1].time - synced[i].time > GAP) {
        out.push({ time: synced[i].time + 2.5, interlude: true });
      }
    }
    return out;
  }, [synced, duration, showNotes]);

  const lead = position + lyricOffset / 1000;
  const activeIdx = entries.length ? entries.reduce((acc, e, i) => (lead >= e.time ? i : acc), -1) : -1;

  // Stable seek callback so the memoized lyrics list isn't invalidated each tick.
  const onSeekRef = useRef(onSeek); onSeekRef.current = onSeek;
  const seek = useCallback((t: number) => onSeekRef.current(t), []);

  // Scroll ONLY the lyrics container (never the overlay) so the top bar stays put.
  useEffect(() => {
    if (!lyricsOpen) return;
    const container = lyricsRef.current;
    const active = activeLineRef.current;
    if (!container || !active) return;
    const top = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2;
    container.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, [activeIdx, lyricsOpen]);

  if (!currentTrack) return null;
  const art = currentTrack.thumbnail;

  // Swipe up on the cover opens lyrics; swipe down on the lyrics top bar closes.
  const swipe = (onUp?: () => void, onDown?: () => void) => ({
    onTouchStart: (e: React.TouchEvent) => { touchY.current = e.touches[0].clientY; },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchY.current == null) return;
      const dy = e.changedTouches[0].clientY - touchY.current;
      touchY.current = null;
      if (dy < -45) onUp?.();
      if (dy > 45) onDown?.();
    },
  });

  const seekBar = (
    <div className="progress-bar" onClick={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      onSeek(((e.clientX - r.left) / r.width) * duration);
    }}>
      <div className="progress-fill" style={{ width: duration ? `${(position / duration) * 100}%` : '0%' }} />
    </div>
  );

  return (
    <div className="now-playing">
      {art && <div className="np-bg" style={{ backgroundImage: `url(${art})` }} />}
      <div className="np-bg-overlay" />

      <div className="np-top">
        <button className="np-chevron" onClick={onClose}><Icon name="chevronDown" size={26} /></button>
        <span className="hero-label">Now Playing</span>
        <button
          className={`np-chevron np-download ${downloaded ? 'done' : ''}`}
          title={downloaded ? 'Downloaded' : 'Download for offline'}
          disabled={downloading || downloaded}
          onClick={async () => {
            setDownloading(true);
            try { await api.downloadTrack(currentTrack.id); setDownloaded(true); } catch {}
            finally { setDownloading(false); }
          }}
        >
          {downloading ? <span className="btn-spinner dark" /> : <Icon name="download" size={22} />}
        </button>
      </div>

      <div className="np-body single" {...swipe(() => setLyricsOpen(true))}>
        {art ? <img className="np-art" src={art} alt="" /> : <div className="np-art song-art-placeholder"><Icon name="music" size={64} /></div>}
        <div className="np-side">
          <div className="np-title">{currentTrack.title}</div>
          <div className="np-artist" onClick={() => { onClose(); openArtist(navigate, currentTrack.artist); }}>
            {currentTrack.artist ?? 'Unknown'}
          </div>
          <div className="np-controls">
            <div className="np-progress">
              <span className="time">{fmt(position)}</span>
              {seekBar}
              <span className="time right">{fmt(duration)}</span>
            </div>
            <div className="np-buttons">
              <button className={`ctrl loop-btn ${loop ? 'active' : ''}`} onClick={toggleLoop} title="Loop"><Icon name="repeat" size={22} /></button>
              <button className="ctrl" onClick={() => prev()}><Icon name="prev" size={26} /></button>
              <button className="play-btn" onClick={togglePlay}><Icon name={isPlaying ? 'pause' : 'play'} size={26} /></button>
              <button className="ctrl" onClick={() => next()}><Icon name="next" size={26} /></button>
              <button className="ctrl add-btn" onClick={() => setAddOpen(true)} title="Add to playlist"><Icon name="addPlaylist" size={22} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Tappable / swipe-up affordance to open lyrics — hidden once lyrics open */}
      {!lyricsOpen && (
        <button className="np-pulltab" onClick={() => setLyricsOpen(true)}>
          <span className="np-pulltab-chip"><Icon name="chevronUp" size={15} /> Lyrics</span>
        </button>
      )}

      {/* Full-screen lyrics — the now-playing bar moves to the TOP here */}
      <div className={`lyrics-sheet ${lyricsOpen ? 'open' : ''}`}>
        {art && <div className="np-bg" style={{ backgroundImage: `url(${art})` }} />}
        <div className="np-bg-overlay" />

        <div className="lyrics-topbar" {...swipe(undefined, () => setLyricsOpen(false))}>
          <button className="np-chevron" onClick={() => setLyricsOpen(false)}><Icon name="chevronDown" size={24} /></button>
          {art ? <img className="lt-art" src={art} alt="" /> : <div className="lt-art song-art-placeholder"><Icon name="music" size={18} /></div>}
          <div className="lt-meta">
            <div className="track-title">{currentTrack.title}</div>
            <div className="track-sub">{currentTrack.artist ?? 'Unknown'}</div>
          </div>
          <button className="play-btn lt-play" onClick={togglePlay}><Icon name={isPlaying ? 'pause' : 'play'} size={18} /></button>
        </div>
        <div className="lt-progress">
          <span className="time">{fmt(position)}</span>
          {seekBar}
          <span className="time right">{fmt(duration)}</span>
        </div>

        <div className="lyrics centered" ref={lyricsRef}>
          {lyricsLoading ? (
            <div className="lyrics-empty">Loading lyrics…</div>
          ) : entries.length ? (
            <LyricsList entries={entries} activeIdx={activeIdx} seek={seek} activeRef={activeLineRef} />
          ) : plain ? (
            <div className="lyrics-plain">{plain}</div>
          ) : (
            <div className="lyrics-empty">No lyrics found for this track.</div>
          )}
        </div>
      </div>

      {addOpen && <AddToPlaylistModal trackId={currentTrack.id} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
