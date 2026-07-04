import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Followed } from '../api/client';
import { Icon } from '../components/icons';

export default function Following() {
  const [artists, setArtists] = useState<Followed[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    try { setArtists(await api.getFollowed()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  if (loading) return <div className="spinner">Loading…</div>;

  return (
    <div>
      <div className="main-topbar"><h1 className="page-title">Following</h1></div>

      {!artists.length ? (
        <div className="empty">
          <h3>Not following anyone yet</h3>
          <p>Open an artist and tap Follow to see their music in your feed.</p>
        </div>
      ) : (
        <div className="card-grid">
          {artists.map((a) => (
            <button key={a.id} className="media-card" onClick={() => a.deezer_id && navigate(`/artist/${a.deezer_id}`)}>
              <div className="card-img-wrap round">
                {a.picture ? <img className="card-img" src={a.picture} alt="" /> : <div className="card-img placeholder"><Icon name="starFill" size={40} /></div>}
              </div>
              <div className="card-title">{a.name}</div>
              <div className="card-sub">Artist</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
