import { useEffect, useRef } from 'react';

/**
 * Makes the phone's back gesture (and browser Back) close an overlay instead of
 * navigating away / leaving the app. When [open] becomes true we push a history
 * entry; pressing Back pops it and calls [onClose] rather than changing routes.
 */
export function useBackClose(open: boolean, onClose: () => void) {
  const cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    if (!open) return;
    window.history.pushState({ overlay: true }, '');
    const onPop = () => cb.current();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      // Closing programmatically (not via Back)? Drop our pushed history entry.
      if (window.history.state?.overlay) window.history.back();
    };
  }, [open]);
}
