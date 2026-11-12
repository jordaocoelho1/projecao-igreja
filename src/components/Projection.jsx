import { useEffect, useState } from 'react';
import SlideView from './SlideView.jsx';
import { DEFAULT_SETTINGS } from '../lib/themes.js';
import { useMedia } from '../lib/useMedia.js';

// Tela que vai para o projetor
export default function Projection() {
  const [slide, setSlide] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const media = useMedia(settings);

  useEffect(() => {
    window.api.loadSettings().then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }));
    const offSlide = window.api.onSlide(setSlide);
    const offSettings = window.api.onSettings((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }));
    return () => { offSlide(); offSettings(); };
  }, []);

  return (
    <div className="projection">
      <SlideView slide={slide} settings={settings} media={media} />
    </div>
  );
}
