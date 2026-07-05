import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import AppHeader from './components/AppHeader';
import PlayerBar from './components/PlayerBar';
import Home from './pages/Home';
import Search from './pages/Search';
import Liked from './pages/Liked';
import Playlists from './pages/Playlists';
import PlaylistDetail from './pages/PlaylistDetail';
import Following from './pages/Following';
import Artist from './pages/Artist';
import Album from './pages/Album';
import Downloads from './pages/Downloads';
import SongMenu from './components/SongMenu';
import QueueBar from './components/QueueBar';
import Settings from './pages/Settings';
import Stats from './pages/Stats';
import Login from './pages/Login';
import { useSocialStore } from './store/social';
import { useSettings, applySettings } from './store/settings';
import { useAuth } from './store/auth';

export default function App() {
  const load = useSocialStore((s) => s.load);
  const { status, init } = useAuth();

  useEffect(() => { applySettings(useSettings.getState()); init(); }, []);
  useEffect(() => { if (status === 'in') load(); }, [status]);

  if (status === 'loading') {
    return <div className="app-splash"><div className="spinner">Loading…</div></div>;
  }
  if (status === 'out') return <Login />;

  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main">
          <AppHeader />
          <QueueBar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/liked" element={<Liked />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/downloads" element={<Downloads />} />
            <Route path="/playlist/:id" element={<PlaylistDetail />} />
            <Route path="/following" element={<Following />} />
            <Route path="/artist/:id" element={<Artist />} />
            <Route path="/album/:id" element={<Album />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
        <PlayerBar />
        <SongMenu />
      </div>
    </BrowserRouter>
  );
}
