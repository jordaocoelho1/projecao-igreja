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

// Desenha um slide (ou a tela de descanso). Usado na projeção e nas pré-visualizações.
export default function SlideView({ slide, settings, media }) {
  const theme = THEMES[settings.themeId] || THEMES.classico;
  const font = FONTS[settings.fontFamily] || FONTS.sans;

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
          <div className="slideview-body" style={{ fontSize: `${sizeFor(slide.body)}cqmin` }}>{slide.body}</div>
          {settings.showTitle && slide.title && (
            <div className="slideview-title" style={{ color: theme.title }}>{slide.title}</div>
          )}
        </div>
      )}
    </div>
  );
}
