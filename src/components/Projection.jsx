import { useEffect, useState } from 'react';

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
      <div className="projection-body">{slide.body}</div>
      {slide.title && <div className="projection-title">{slide.title}</div>}
    </div>
  );
}
