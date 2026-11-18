import { useEffect, useRef, useState } from 'react';
import { setConfirmListener } from '../lib/confirm.js';

export default function ConfirmHost() {
  const [req, setReq] = useState(null);
  const okRef = useRef(null);

  useEffect(() => {
    setConfirmListener(setReq);
    return () => setConfirmListener(null);
  }, []);

  useEffect(() => {
    if (!req) return undefined;
    okRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); close(false); }
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  function close(value) {
    req?.resolve(value);
    setReq(null);
  }

  if (!req) return null;
  return (
    <div className="modal-backdrop" onMouseDown={() => close(false)}>
      <div className="modal" role="dialog" onMouseDown={(e) => e.stopPropagation()}>
        <p className="modal-msg">{req.message}</p>
        <div className="row end">
          <button className="secondary" onClick={() => close(false)}>Cancelar</button>
          <button ref={okRef} className={req.danger ? 'danger' : ''} onClick={() => close(true)}>{req.okLabel || 'Confirmar'}</button>
        </div>
      </div>
    </div>
  );
}
