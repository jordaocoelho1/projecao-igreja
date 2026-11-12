import { useEffect, useState } from 'react';

// Ajusta o tamanho da letra conforme a quantidade de texto, para sempre caber na tela
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

// Tela que vai para o projetor: fundo preto, texto grande e centralizado
export default function Projection() {
  const [slide, setSlide] = useState(null);

  useEffect(() => {
    const off = window.api.onSlide(setSlide);
    return off;
  }, []);

  if (!slide) return <div className="projection blank" />;

  return (
    <div className="projection">
      <div className="projection-body" style={{ fontSize: `${sizeFor(slide.body)}vmin` }}>
        {slide.body}
      </div>
      {slide.title && <div className="projection-title">{slide.title}</div>}
    </div>
  );
}
