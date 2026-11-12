import { useEffect, useMemo, useState } from 'react';
import Field from './Field.jsx';
import SongEditor from './SongEditor.jsx';
import { emptySong, songToSlides } from '../lib/songs.js';

const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de músicas com busca, e os slides da música escolhida prontos para clicar
export default function SongsPanel({ songs, onSaveSong, onDeleteSong, onShow, currentId }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [slideIndex, setSlideIndex] = useState(null);

  const filtered = useMemo(() => {
    const q = normalize(query).trim();
    const sorted = [...songs].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    if (!q) return sorted;
    return sorted.filter((s) =>
      normalize([s.title, s.author, ...Object.values(s.verses || {})].join(' ')).includes(q)
    );
  }, [songs, query]);

  const song = songs.find((s) => s.id === selectedId) || null;
  const slides = song ? songToSlides(song) : [];

  function select(s) {
    setSelectedId(s.id);
    setSlideIndex(null);
  }

  function project(i) {
    setSlideIndex(i);
    onShow(slides[i]);
  }

  function step(delta) {
    if (!slides.length) return;
    const next = slideIndex == null ? 0 : Math.min(slides.length - 1, Math.max(0, slideIndex + delta));
    project(next);
  }

  // Setas ← → trocam de parte da música
  useEffect(() => {
    if (editing) return undefined;
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (editing) {
    return (
      <SongEditor
        song={editing}
        onSave={(s) => { onSaveSong(s); setSelectedId(s.id); setEditing(null); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="songs-layout">
      <div className="panel stack">
        <div className="panel-head">
          <h2>Músicas</h2>
          <button onClick={() => setEditing(emptySong())}>+ Nova música</button>
        </div>
        <Field label="Buscar música" hint="Procura no título, no autor e na letra">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite para filtrar" />
        </Field>
        <ul className="song-list">
          {filtered.map((s) => (
            <li key={s.id}>
              <button className={`song-item ${s.id === selectedId ? 'active' : ''}`} onClick={() => select(s)}>
                <strong>{s.title}</strong>
                {s.author && <span className="muted">{s.author}</span>}
              </button>
            </li>
          ))}
        </ul>
        {songs.length === 0 && <p className="muted">Nenhuma música cadastrada. Clique em “+ Nova música”.</p>}
        {songs.length > 0 && filtered.length === 0 && <p className="muted">Nenhuma música encontrada.</p>}
      </div>

      <div className="panel stack">
        {!song ? (
          <p className="muted">Escolha uma música na lista para ver as partes.</p>
        ) : (
          <>
            <div className="panel-head">
              <h2>{song.title}</h2>
              <div className="row">
                <button className="secondary" onClick={() => setEditing(song)}>Editar</button>
                <button
                  className="danger"
                  onClick={() => { if (confirm(`Excluir “${song.title}”?`)) { onDeleteSong(song.id); setSelectedId(null); } }}
                >
                  Excluir
                </button>
              </div>
            </div>
            <div className="row">
              <button className="secondary" onClick={() => step(-1)}>◀ Anterior</button>
              <button onClick={() => step(1)}>Próxima parte ▶</button>
              <span className="muted">Atalho: setas ← →</span>
            </div>
            <ol className="slides">
              {slides.map((slide, i) => (
                <li key={slide.id}>
                  <button className={`slide-card ${currentId === slide.id ? 'active' : ''}`} onClick={() => project(i)}>
                    <span className="slide-label">{slide.label}</span>
                    <span className="slide-text">{slide.body}</span>
                  </button>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
