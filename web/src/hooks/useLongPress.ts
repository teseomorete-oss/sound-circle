import { useRef } from 'react';

// Opens something on long-press (mobile) or press-and-hold (desktop) while
// still allowing a normal tap/click to do its usual thing.
export function useLongPress(onLongPress: () => void, onClick?: (e: React.MouseEvent) => void, ms = 450) {
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fired = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const start = (e: React.PointerEvent) => {
    fired.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, ms);
  };
  const cancel = () => clearTimeout(timer.current);
  const move = (e: React.PointerEvent) => {
    if (Math.abs(e.clientX - startX.current) > 10 || Math.abs(e.clientY - startY.current) > 10) cancel();
  };

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerMove: move,
    onClick: (e: React.MouseEvent) => {
      if (fired.current) { e.preventDefault(); e.stopPropagation(); fired.current = false; return; }
      onClick?.(e);
    },
  };
}
