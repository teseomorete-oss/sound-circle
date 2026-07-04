import { useEffect, useRef, useState } from 'react';

/**
 * Shows text on a single line. If it's wider than the available space it gently
 * scrolls to the end and back so the whole thing is readable; otherwise it sits
 * still (with an ellipsis fallback for reduce-motion users).
 */
export default function Marquee({ text, className }: { text: string; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0); // px the text overflows by

  useEffect(() => {
    const measure = () => {
      const w = wrapRef.current, t = textRef.current;
      if (!w || !t) return;
      const diff = t.scrollWidth - w.clientWidth;
      setShift(diff > 4 ? diff + 12 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    // re-measure once fonts have settled
    const t = setTimeout(measure, 300);
    return () => { ro.disconnect(); clearTimeout(t); };
  }, [text]);

  const style = shift
    ? ({ '--mq-shift': `-${shift}px`, '--mq-dur': `${Math.max(6, shift / 28)}s` } as React.CSSProperties)
    : undefined;

  return (
    <div className={`marquee ${className ?? ''}`} ref={wrapRef}>
      <span ref={textRef} className={shift ? 'marquee-move' : ''} style={style}>{text}</span>
    </div>
  );
}
