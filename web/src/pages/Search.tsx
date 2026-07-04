import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, SearchResults, Suggestions } from '../api/client';
import { usePlayerStore } from '../store/player';
import SongRow from '../components/SongRow';
import { ArtistCard, AlbumCard } from '../components/Cards';
import { Icon } from '../components/icons';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [suggest, setSuggest] = useState<Suggestions | null>(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('sc-recent') || '[]'); } catch { return []; }
  });
  const playOne = usePlayerStore((s) => s.playOne);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const saveRecent = (q: string) => {
    const next = [q, ...recent.filter((r) => r.toLowerCase() !== q.toLowerCase())].slice(0, 10);
    setRecent(next);
    localStorage.setItem('sc-recent', JSON.stringify(next));
  };

  const runSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true); setShowSuggest(false);
    saveRecent(q.trim());
    try {
      const r = await api.search(q.trim());
      setResults(r);
      r.tracks.slice(0, 3).forEach((t) => api.prewarmSong(t.title, t.artist));
    }
    catch (e: any) { alert('Search failed: ' + e.message); }
    finally { setLoading(false); }
  };

  // Run search if arriving with a ?q= param (e.g. clicking an artist link)
  useEffect(() => {
    const q = params.get('q');
    if (q) { setQuery(q); runSearch(q); }
  }, [params.get('q')]);

  // Debounced typeahead suggestions
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) { setSuggest(null); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const s = await api.suggest(query.trim());
        setSuggest(s);
        setShowSuggest(true);
      } catch {}
    }, 220);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({ q: query.trim() });
    runSearch(query);
  };

  return (
    <div>
      <div className="main-topbar">
        <form className="search-wrap" onSubmit={submit}>
          <div className="search-bar">
            <Icon name="search" size={20} />
            <input
              autoFocus
              placeholder="Songs, artists, albums…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => suggest && setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
            />
            {query && <button type="button" className="icon-btn" onClick={() => { setQuery(''); setResults(null); setSuggest(null); }}><Icon name="close" size={16} /></button>}
          </div>

          {showSuggest && suggest && (suggest.artists.length > 0 || suggest.tracks.length > 0) && (
            <div className="suggest-dropdown">
              {suggest.artists.length > 0 && <div className="suggest-group-label">Artists</div>}
              {suggest.artists.map((a) => (
                <button key={a.deezer_id} type="button" className="suggest-item round"
                  onMouseDown={() => navigate(`/artist/${a.deezer_id}`)}>
                  {a.picture ? <img className="round" src={a.picture} alt="" /> : <div className="round" />}
                  <div><div className="si-title">{a.name}</div><div className="si-sub">Artist</div></div>
                </button>
              ))}
              {suggest.tracks.length > 0 && <div className="suggest-group-label">Songs</div>}
              {suggest.tracks.map((t) => (
                <button key={t.deezer_id} type="button" className="suggest-item"
                  onMouseDown={() => playOne(t)}>
                  {t.thumbnail ? <img src={t.thumbnail} alt="" /> : <div />}
                  <div><div className="si-title">{t.title}</div><div className="si-sub">{t.artist}</div></div>
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {loading && <div className="spinner">Searching…</div>}

      {!loading && !results && (
        <div className="section">
          {recent.length > 0 ? (
            <>
              <h2 className="section-title">
                Recent searches
                <button className="see-all" onClick={() => { setRecent([]); localStorage.removeItem('sc-recent'); }}>Clear all</button>
              </h2>
              {recent.map((r) => (
                <div key={r} className="recent-row" onClick={() => { setQuery(r); setParams({ q: r }); runSearch(r); }}>
                  <Icon name="search" size={18} />
                  <span className="recent-text">{r}</span>
                  <button className="icon-btn" onClick={(e) => { e.stopPropagation(); const next = recent.filter((x) => x !== r); setRecent(next); localStorage.setItem('sc-recent', JSON.stringify(next)); }}>
                    <Icon name="close" size={15} />
                  </button>
                </div>
              ))}
            </>
          ) : (
            <div className="empty"><h3>Search for anything</h3><p>Songs, artists, albums — your recent searches will show up here.</p></div>
          )}
        </div>
      )}

      {!loading && results && (
        <>
          {results.artists.length > 0 && (
            <div className="section">
              <h2 className="section-title">Artists</h2>
              <div className="card-row">
                {results.artists.map((a) => <ArtistCard key={a.deezer_id} artist={a} />)}
              </div>
            </div>
          )}

          {results.albums.length > 0 && (
            <div className="section">
              <h2 className="section-title">Albums</h2>
              <div className="card-row">
                {results.albums.map((a) => <AlbumCard key={a.deezer_id} album={a} />)}
              </div>
            </div>
          )}

          {results.tracks.length > 0 && (
            <div className="section">
              <h2 className="section-title">Songs</h2>
              {results.tracks.map((t, i) => <SongRow key={t.deezer_id} song={t} rank={i + 1} showAlbum />)}
            </div>
          )}

          {!results.artists.length && !results.tracks.length && !results.albums.length && (
            <div className="empty">No results. Try a different search.</div>
          )}
        </>
      )}
    </div>
  );
}
