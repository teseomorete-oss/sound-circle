import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, FeedSection, Track, Song, Album, ArtistResult, Playlist } from '../api/client';
import { ArtistCard, AlbumCard, TrackCard } from '../components/Cards';
import QuickPicks from '../components/QuickPicks';
import SongList from '../components/SongList';
import { PlaylistCover } from './Playlists';
import { Icon } from '../components/icons';
import { usePlayerStore } from '../store/player';
import { useSettings } from '../store/settings';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const CHIPS = ['Chill', 'Energy', 'Focus', 'Workout', 'Party', 'Sad', 'Feel good', 'Sleep'];

export default function Home() {
  const [sections, setSections] = useState<FeedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const { playOne, play } = usePlayerStore();
  const { showQuickPicks, showTrending, showNewReleases, displayName, pullToRefresh } = useSettings();
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const setP = (v: number) => { pullRef.current = v; setPull(v); };

  // Pick a random song from the feed and play it
  const randomPlay = () => {
    const songs: Song[] = [];
    let trackPool: { items: Track[]; i: number } | null = null;
    for (const s of sections) {
      if (s.kind === 'songs' || s.kind === 'quickpicks') songs.push(...(s.items as Song[]));
      else if (s.kind === 'tracks' && !trackPool && s.items.length) {
        trackPool = { items: s.items as Track[], i: Math.floor(Math.random() * s.items.length) };
      }
    }
    if (songs.length) playOne(songs[Math.floor(Math.random() * songs.length)]);
    else if (trackPool) play(trackPool.items, trackPool.i);
  };

  const load = async (refresh = false) => {
    try {
      if (refresh) { setRefreshing(true); await api.refreshFeed(); }
      setSections(await api.getFeed());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  // Pull-to-refresh: drag down at the top of the page to reload a fresh feed.
  useEffect(() => {
    if (!pullToRefresh) return;
    const main = document.querySelector('.main') as HTMLElement | null;
    if (!main) return;
    let startY = 0, pulling = false;
    const onStart = (e: TouchEvent) => { if (main.scrollTop <= 0) { startY = e.touches[0].clientY; pulling = true; } };
    const onMove = (e: TouchEvent) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && main.scrollTop <= 0) setP(Math.min(dy * 0.5, 90));
      else { pulling = false; setP(0); }
    };
    const onEnd = () => { if (pullRef.current > 55) load(true); setP(0); pulling = false; };
    main.addEventListener('touchstart', onStart, { passive: true });
    main.addEventListener('touchmove', onMove, { passive: true });
    main.addEventListener('touchend', onEnd);
    return () => {
      main.removeEventListener('touchstart', onStart);
      main.removeEventListener('touchmove', onMove);
      main.removeEventListener('touchend', onEnd);
    };
  }, [pullToRefresh]);

  return (
    <div>
      {(pull > 0 || refreshing) && (
        <div className="ptr" style={{ height: refreshing ? 44 : pull }}>
          <span className={`ptr-icon ${refreshing ? 'spin' : ''}`} style={{ transform: `rotate(${pull * 3}deg)` }}>
            <Icon name="refresh" size={22} />
          </span>
        </div>
      )}
      <div className="main-topbar desktop-only">
        <h1 className="page-title">{greeting()}{displayName ? `, ${displayName}` : ''}</h1>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost refresh-btn" onClick={() => load(true)} disabled={refreshing}>
          <Icon name="refresh" size={15} /> {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <h1 className="home-welcome mobile-only">{greeting()}{displayName ? `, ${displayName}` : ''}</h1>

      {/* Mood chips */}
      <div className="chip-scroll">
        {CHIPS.map((c) => (
          <button key={c} className="mood-chip" onClick={() => navigate(`/search?q=${encodeURIComponent(c)}`)}>{c}</button>
        ))}
      </div>

      {loading ? (
        <div className="spinner">Loading…</div>
      ) : !sections.length ? (
        <div className="empty">
          <h3>Your feed is empty</h3>
          <p>Search for music, like songs, and follow artists to fill it up.</p>
        </div>
      ) : (
        sections.filter((s) => {
          if (s.type === 'quick_picks' && !showQuickPicks) return false;
          if (s.type === 'trending' && !showTrending) return false;
          if (s.type === 'new_releases_dz' && !showNewReleases) return false;
          return true;
        }).map((section) => (
          <div className="section" key={section.type}>
            <h2 className="section-title">
              {section.title}
              {section.kind === 'quickpicks' && (
                <button className="shuffle-pill" onClick={randomPlay} title="Play a random song">
                  <Icon name="shuffle" size={14} /> Shuffle
                </button>
              )}
            </h2>

            {section.kind === 'quickpicks' ? (
              <QuickPicks songs={section.items as Song[]} />
            ) : section.kind === 'songs' ? (
              <SongList songs={section.items as Song[]} />
            ) : (
              <div className={`card-row ${section.kind === 'playlists' ? 'card-row-pl' : ''}`}>
                {section.kind === 'albums'
                  ? (section.items as Album[]).map((a) => <AlbumCard key={a.deezer_id} album={a} />)
                  : section.kind === 'artists'
                  ? (section.items as ArtistResult[]).map((a) => <ArtistCard key={a.deezer_id} artist={a} />)
                  : section.kind === 'playlists'
                  ? (section.items as Playlist[]).map((p) => (
                      <button key={p.id} className="media-card pl-home-card" onClick={() => navigate(`/playlist/${p.id}`, { state: { name: p.name } })}>
                        <div className="pl-home-cover"><PlaylistCover playlist={p} /></div>
                        <div className="pl-home-info">
                          <div className="card-title">{p.name}</div>
                          <div className="card-sub">Playlist</div>
                          {p.titles && p.titles.length > 0 && (
                            <ol className="pl-home-titles">
                              {p.titles.slice(0, 5).map((t, i) => (
                                <li key={i}><span className="plt-num">{i + 1}</span><span className="plt-name">{t}</span></li>
                              ))}
                            </ol>
                          )}
                        </div>
                      </button>
                    ))
                  : (section.items as Track[]).map((t, i) => (
                      <TrackCard key={`${t.id}-${i}`} track={t} queue={section.items as Track[]} index={i} />
                    ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
