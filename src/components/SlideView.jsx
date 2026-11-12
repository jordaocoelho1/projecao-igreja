import { useEffect, useState } from 'react';
import { THEMES, FONTS } from '../lib/themes.js';

// Tamanho da letra (em % do menor lado da área), conforme a quantidade de texto
function sizeFor(text) {
  const lines = text.split('\n').length;
  const score = Math.max(text.length, lines * 38);
  if (score > 420) return 4.6;
  if (score > 320) return 5.2;
  if (score > 230) return 6;
  if (score > 140) return 7;
  if (score > 80) return 8;
  return 9;
}

// Desenha um slide (texto, imagem, tela preta) ou a tela de descanso.
// Usado na projeção e em todas as pré-visualizações, para ficarem iguais.
export default function SlideView({ slide, settings, media }) {
  const [imageUrl, setImageUrl] = useState(null);
  const imagePath = slide?.image || null;

  useEffect(() => {
    let cancelled = false;
    setImageUrl(null);
    if (imagePath) {
      window.api.mediaData(imagePath).then((u) => { if (!cancelled) setImageUrl(u); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [imagePath]);

  if (slide?.black) return <div className="slideview" style={{ background: '#000' }} />;

  if (imagePath) {
    return (
      <div
        className="slideview"
        style={{ background: imageUrl ? `#000 center / contain no-repeat url("${imageUrl}")` : '#000' }}
      />
    );
  }

  const theme = THEMES[settings.themeId] || THEMES.classico;
  const font = FONTS[settings.fontFamily] || FONTS.sans;
  const scale = settings.fontScale || 1;

  let background;
  let overlay = null;
  if (!slide) {
    background = media.idleUrl ? `center / cover no-repeat url("${media.idleUrl}")` : '#000';
  } else if (media.bgUrl) {
    background = `center / cover no-repeat url("${media.bgUrl}")`;
    overlay = `rgba(${theme.overlay},${settings.overlay})`;
  } else {
    background = theme.background;
  }

  return (
    <div className="slideview" style={{ background }}>
      {overlay && <div className="slideview-overlay" style={{ background: overlay }} />}
      {slide && (
        <div className="slideview-content" style={{ color: theme.text, fontFamily: font.css }}>
          {slide.body && (
            <div className="slideview-body" style={{ fontSize: `${sizeFor(slide.body) * scale}cqmin` }}>{slide.body}</div>
          )}
          {settings.showTitle && slide.title && (
            <div className="slideview-title" style={{ color: theme.title, fontSize: `${3.4 * scale}cqmin` }}>
              {slide.title}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
