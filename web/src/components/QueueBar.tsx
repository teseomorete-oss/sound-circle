import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/player';
import { useSettings } from '../store/settings';
import { Icon } from './icons';

const FULL = 88; // base cover size

// Upcoming tracks. Two modes (setting): "shrink" pins it and shrinks on scroll;
// "manual" keeps it full-size and you open/close it with the header button.
// Reordering is drag-based (mouse + touch); each cover has a remove ✕.
export default function QueueBar() {
  const { queue, queueOpen, removeFromQueue, moveInQueue, setQueueOpen } = usePlayerStore();
  const { queueMode, queueMinSize, showQueueTitle, showQueueArtist } = useSettings();
  const barRef = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);

  const upcoming = queue.map((it, i) => ({ it, abs: i }));
  const shown = upcoming.slice(0, 12);

  useEffect(() => {
    if (queueOpen && upcoming.length === 0) setQueueOpen(false);
  }, [queueOpen, upcoming.length]);

  // Shrink-on-scroll (shrink mode only) — via a CSS variable + rAF, no re-render.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (queueMode !== 'shrink') {
      bar.style.setProperty('--qsize', `${FULL}px`);
      bar.classList.remove('compact');
      return;
    }
    const main = document.querySelector('.main') as HTMLElement | null;
    if (!main) return;
    let raf = 0;
    const apply = () => {
      raf = 0;
      const size = Math.max(queueMinSize, FULL - main.scrollTop * 0.4);
      // text fade: fully visible near the top, smoothly collapses as it shrinks
      const t = Math.max(0, Math.min(1, (size - Math.max(queueMinSize, 48)) / Math.max(1, FULL - Math.max(queueMinSize, 48))));
      bar.style.setProperty('--qsize', `${size}px`);
      bar.style.setProperty('--qtext', `${t}`);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply();
    main.addEventListener('scroll', onScroll, { passive: true });
    return () => { main.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [queueOpen, queueMode, queueMinSize, upcoming.length]);

  if (!queueOpen || upcoming.length === 0) return null;

  const manual = queueMode === 'manual';
  const showTitle = manual ? showQueueTitle : true;
  const showArtist = manual ? showQueueArtist : true;

  const onMove = (e: React.PointerEvent) => {
    if (dragFrom.current == null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const target = el?.closest('.queue-item') as HTMLElement | null;
    if (!target) return;
    const to = Number(target.dataset.abs);
    if (!Number.isNaN(to) && to !== dragFrom.current) {
      moveInQueue(dragFrom.current, to);
      dragFrom.current = to;
    }
  };

  return (
    <div className={`queue-bar ${manual ? 'manual' : ''}`} ref={barRef}>
      <div className="queue-head">
        <span className="queue-title"><Icon name="queue" size={16} /> Next up · {upcoming.length}</span>
        <button className="icon-btn" onClick={() => setQueueOpen(false)}><Icon name="close" size={16} /></button>
      </div>
      <div className="queue-list">
        {shown.map(({ it, abs }, i) => (
          <div key={abs} className="queue-slot">
            <div
              className="queue-item"
              data-abs={abs}
              onPointerDown={(e) => { dragFrom.current = abs; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); }}
              onPointerMove={onMove}
              onPointerUp={() => { dragFrom.current = null; }}
              onPointerCancel={() => { dragFrom.current = null; }}
            >
              {it.thumbnail ? <img className="queue-cover" src={it.thumbnail} alt="" draggable={false} /> : <div className="queue-cover song-art-placeholder"><Icon name="music" size={18} /></div>}
              <button className="queue-remove" onPointerDown={(e) => e.stopPropagation()} onClick={() => removeFromQueue(abs)}><Icon name="close" size={12} /></button>
              {showTitle && <div className="queue-name">{it.title}</div>}
              {showArtist && <div className="queue-artist">{it.artist}</div>}
            </div>
            {i < shown.length - 1 && <span className="queue-arrow"><Icon name="chevronUp" size={14} /></span>}
          </div>
        ))}
      </div>
    </div>
  );
}
