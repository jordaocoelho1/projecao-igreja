import { useMemo, useState } from 'react';
import Field from './Field.jsx';
import SongEditor from './SongEditor.jsx';
import { emptySong, songToSlides } from '../lib/songs.js';
import { useArrowKeys } from '../lib/useArrowKeys.js';

const normalize = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Lista de músicas com busca, e os slides da música escolhida prontos para clicar
export default function SongsPanel({ songs, onSaveSong, onDeleteSong, onShow, currentId, onAddToService, onImport, onExport }) {
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

  function project(i) {
    setSlideIndex(i);
    onShow(slides[i]);
  }

  function step(delta) {
    if (!slides.length) return;
    const next = slideIndex == null ? 0 : Math.min(slides.length - 1, Math.max(0, slideIndex + delta));
    project(next);
  }
  useArrowKeys(step, !editing);

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
          <h2>Músicas <span className="muted">({songs.length})</span></h2>
          <button onClick={() => setEditing(emptySong())}>+ Nova</button>
        </div>
        <div className="row">
          <button className="secondary small" onClick={onImport} title="TXT, OpenLyrics/OpenLP (.xml) ou backup (.json)">Importar…</button>
          <button className="secondary small" onClick={onExport} disabled={!songs.length}>Exportar backup</button>
        </div>
        <Field label="Buscar música" hint="Procura no título, no autor e na letra">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite para filtrar" />
        </Field>
        <ul className="song-list">
          {filtered.map((s) => (
            <li key={s.id}>
              <button
                className={`song-item ${s.id === selectedId ? 'active' : ''}`}
                onClick={() => { setSelectedId(s.id); setSlideIndex(null); }}
              >
                <strong>{s.title}</strong>
                {s.author && <span className="muted">{s.author}</span>}
              </button>
            </li>
          ))}
        </ul>
        {songs.length === 0 && <p className="muted">Nenhuma música cadastrada. Clique em “+ Nova” ou “Importar…”.</p>}
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
                <button className="secondary" onClick={() => onAddToService({ type: 'song', songId: song.id })}>+ Adicionar ao culto</button>
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
