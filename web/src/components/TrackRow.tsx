import { useNavigate } from 'react-router-dom';
import { Track } from '../api/client';
import { Icon } from './icons';
import { openArtist } from '../lib/artist';

interface Props {
  track: Track;
  onPlay: () => void;
  onAdd?: () => void;
  onDownload?: () => void;
  onRemove?: () => void;
  addLabel?: string;
  rank?: number;
  meta?: string;
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function TrackRow({ track, onPlay, onAdd, onDownload, onRemove, addLabel, rank, meta }: Props) {
  const navigate = useNavigate();
  const stop = (fn?: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn?.(); };
  return (
    <div className="track-row clickable" onClick={onPlay}>
      {rank != null && <span className="track-rank">{rank}</span>}
      {track.thumbnail ? (
        <img className="thumb" src={track.thumbnail} alt="" />
      ) : (
        <div className="thumb thumb-placeholder"><Icon name="music" size={20} /></div>
      )}
      <div className="track-info">
        <div className="track-title">{track.title}</div>
        <div className="track-sub">
          {track.artist ? (
            <span
              className="artist-link"
              onClick={stop(() => openArtist(navigate, track.artist))}
            >
              {track.artist}
            </span>
          ) : 'Unknown'}
          {track.duration ? `  ·  ${formatDuration(track.duration)}` : ''}
        </div>
      </div>
      {meta && <span className="track-meta">{meta}</span>}
      {track.downloaded_path && <span className="badge-downloaded" title="Downloaded"><Icon name="download" size={16} /></span>}
      <div className="row-actions">
        {onAdd && <button className="icon-btn" title={addLabel ?? 'Add to library'} onClick={stop(onAdd)}><Icon name="plus" size={18} /></button>}
        {onDownload && !track.downloaded_path && (
          <button className="icon-btn" title="Download for offline" onClick={stop(onDownload)}><Icon name="download" size={17} /></button>
        )}
        {onRemove && <button className="icon-btn" title="Remove" onClick={stop(onRemove)}><Icon name="close" size={16} /></button>}
      </div>
    </div>
  );
}
