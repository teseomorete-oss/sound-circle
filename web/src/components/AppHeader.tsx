import { useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { Icon } from './icons';
import { usePlayerStore } from '../store/player';

// Global mobile top bar: logo + name, then queue toggle + settings.
export default function AppHeader() {
  const navigate = useNavigate();
  const { queueOpen, toggleQueue, items, index } = usePlayerStore();
  const hasQueue = items.length - 1 > index;

  return (
    <header className="app-header">
      <button className="brand" onClick={() => navigate('/')} title="Home">
        <Logo size={26} />
        <span className="brand-name">Sound Circle</span>
      </button>
      <div className="app-header-actions">
        <button
          className={`icon-btn ${queueOpen ? 'active' : ''}`}
          title="Queue" disabled={!hasQueue}
          onClick={toggleQueue}
        >
          <Icon name="queue" size={22} />
        </button>
        <button className="icon-btn" title="Settings" onClick={() => navigate('/settings')}>
          <Icon name="settings" size={22} />
        </button>
      </div>
    </header>
  );
}
