import { Icon } from './icons';

interface Props {
  liked: boolean;
  onToggle: () => void;
  size?: number;
  className?: string;
}

export default function LikeButton({ liked, onToggle, size = 18, className = '' }: Props) {
  return (
    <button
      className={`like-btn ${liked ? 'liked' : ''} ${className}`}
      title={liked ? 'Remove from liked' : 'Add to liked'}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      <Icon name={liked ? 'heartFill' : 'heart'} size={size} />
    </button>
  );
}
