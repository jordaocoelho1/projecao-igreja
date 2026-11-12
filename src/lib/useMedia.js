import { useEffect, useState } from 'react';

// Carrega as imagens escolhidas (tela de descanso e fundo dos slides) como URLs
export function useMedia(settings) {
  const [media, setMedia] = useState({ idleUrl: null, bgUrl: null });
  useEffect(() => {
    let cancelled = false;
    const idle = settings.idleMode === 'wallpaper' ? 'wallpaper' : settings.idleMode === 'image' ? settings.idleImage : null;
    Promise.all([
      idle ? window.api.mediaData(idle).catch(() => null) : null,
      settings.slideBgImage ? window.api.mediaData(settings.slideBgImage).catch(() => null) : null,
    ]).then(([idleUrl, bgUrl]) => { if (!cancelled) setMedia({ idleUrl, bgUrl }); });
    return () => { cancelled = true; };
  }, [settings.idleMode, settings.idleImage, settings.slideBgImage]);
  return media;
}
