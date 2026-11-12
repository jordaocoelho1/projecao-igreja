import { useEffect, useRef } from 'react';

// Setas ← → (e ↑ ↓) chamam step(-1) / step(1), exceto quando o foco está num campo de texto
export function useArrowKeys(step, enabled = true) {
  const ref = useRef(step);
  ref.current = step;
  useEffect(() => {
    if (!enabled) return undefined;
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); ref.current(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); ref.current(-1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
