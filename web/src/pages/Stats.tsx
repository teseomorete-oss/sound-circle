import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Stats as StatsData } from '../api/client';
import { usePlayerStore } from '../store/player';
import TrackRow from '../components/TrackRow';
import { openArtist } from '../lib/artist';
import { Icon } from '../components/icons';

export default function Stats() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore((s) => s.play);
  const navigate = useNavigate();

  useEffect(() => { api.getStats().then(setData).catch(console.error).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="spinner">Loading…</div>;
  if (!data || !data.totalPlays) {
    return (
      <div>
        <div className="main-topbar"><h1 className="page-title">Your stats</h1></div>
        <div className="empty"><h3>No listening yet</h3><p>Play some songs and your top tracks and artists will show up here.</p></div>
      </div>
    );
  }

  const since = data.since ? new Date(data.since * 1000).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : null;

  return (
    <div>
      <div className="main-topbar"><h1 className="page-title">Your stats</h1></div>

      <div className="stat-cards">
        <div className="stat-card"><div className="stat-big">{data.totalPlays}</div><div className="stat-cap">songs played{since ? ` since ${since}` : ''}</div></div>
        <div className="stat-card"><div className="stat-big">{data.topArtists.length}</div><div className="stat-cap">artists</div></div>
      </div>

      {data.topArtists.length > 0 && (
        <div className="section">
          <h2 className="section-title">Top artists</h2>
          <div className="card-row">
            {data.topArtists.map((a, i) => (
              <button key={a.name} className="media-card" onClick={() => openArtist(navigate, a.name)}>
                <div className="card-img-wrap round">
                  {a.thumbnail ? <img className="card-img" src={a.thumbnail} alt="" /> : <div className="card-img placeholder"><Icon name="music" size={30} /></div>}
                </div>
                <div className="card-title">{i + 1}. {a.name}</div>
                <div className="card-sub">{a.plays} play{a.plays === 1 ? '' : 's'}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {data.topTracks.length > 0 && (
        <div className="section">
          <h2 className="section-title">Most played</h2>
          {data.topTracks.map((t, i) => (
            <TrackRow key={t.id} track={t} rank={i + 1} onPlay={() => play(data.topTracks, i)} meta={`${t.plays} play${t.plays === 1 ? '' : 's'}`} />
          ))}
        </div>
      )}
    </div>
  );
}
