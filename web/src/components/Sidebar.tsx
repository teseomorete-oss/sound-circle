import { NavLink } from 'react-router-dom';
import { Icon } from './icons';

const items = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/search', label: 'Search', icon: 'search' },
  { to: '/liked', label: 'Liked', icon: 'heart' },
  { to: '/playlists', label: 'Playlists', icon: 'playlist' },
  { to: '/following', label: 'Following', icon: 'star' },
];

export default function Sidebar() {
  return (
    <nav className="sidebar">
      {items.map((l) => (
        <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
          <span className="nav-ico"><Icon name={l.icon as any} size={24} /></span>
          <span>{l.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
