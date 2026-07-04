import { useEffect, useState } from 'react';
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
  const { showQuickPicks, showTrending, showNewReleases, displayName } = useSettings();

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

  return (
    <div>
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
