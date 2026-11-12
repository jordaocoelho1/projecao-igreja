import { useEffect, useState } from 'react';
import Field from './Field.jsx';
import { parseReference, verseSlide } from '../lib/bible.js';
import { store } from '../lib/storage.js';
import { useArrowKeys } from '../lib/useArrowKeys.js';

const MAX_HISTORY = 12;

// Navegação da Bíblia sem digitar: Tradução → Livro → Capítulo → clique no versículo.
// Também guarda favoritos e os últimos versículos projetados.
export default function BibleBrowser({ bibles, translation, onTranslation, bible, loadError, onShow, onAddToService }) {
  const [bookId, setBookId] = useState(store.get('bible.book', ''));
  const [chapter, setChapter] = useState(store.get('bible.chapter', 1));
  const [selFrom, setSelFrom] = useState(null);
  const [selTo, setSelTo] = useState(null);
  const [perSlide, setPerSlide] = useState(store.get('bible.perSlide', 1));
  const [goTo, setGoTo] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState(store.get('bible.history', []));
  const [favorites, setFavorites] = useState(store.get('bible.favorites', []));

  const book = bible?.books.find((b) => b.id === bookId) || bible?.books[0];
  const chapterCount = book?.chapters.length || 0;
  const verses = book?.chapters[chapter - 1] || [];
  const lo = selFrom == null ? null : Math.min(selFrom, selTo ?? selFrom);
  const hi = selFrom == null ? null : Math.max(selFrom, selTo ?? selFrom);

  useEffect(() => {
    if (book && chapter > chapterCount) setChapter(1);
  }, [book, chapter, chapterCount]);

  function remember(entry) {
    const next = [entry, ...history.filter((h) => h.key !== entry.key)].slice(0, MAX_HISTORY);
    setHistory(next);
    store.set('bible.history', next);
  }

  function project(bk, ch, n, rangeEnd) {
    const end = rangeEnd ?? Math.min(n + perSlide - 1, bk.chapters[ch - 1].length);
    setBookId(bk.id);
    setChapter(ch);
    setSelFrom(n);
    setSelTo(end);
    store.set('bible.book', bk.id);
    store.set('bible.chapter', ch);
    const slide = verseSlide(bk, ch, n, perSlide);
    remember({ key: `${bk.id}-${ch}-${n}`, bookId: bk.id, chapter: ch, verse: n, label: `${bk.name} ${ch}:${n}` });
    onShow(slide);
  }

  function step(delta) {
    if (!book) return;
    if (selFrom == null) return project(book, chapter, 1);
    const next = selFrom + delta * perSlide;
    if (next >= 1 && next <= verses.length) return project(book, chapter, next);
    if (next > verses.length && chapter < chapterCount) return project(book, chapter + 1, 1);
    if (next < 1 && chapter > 1) {
      const prev = book.chapters[chapter - 2];
      return project(book, chapter - 1, Math.max(1, prev.length - perSlide + 1));
    }
    return undefined;
  }
  useArrowKeys(step);

  function clickVerse(e, n) {
    // Shift + clique: estende a seleção sem projetar (para adicionar um trecho ao culto)
    if (e.shiftKey && selFrom != null) {
      setSelTo(n);
      return;
    }
    project(book, chapter, n);
  }

  function goToRef(entry) {
    const bk = bible?.books.find((b) => b.id === entry.bookId);
    if (!bk || !bk.chapters[entry.chapter - 1]) return;
    project(bk, entry.chapter, Math.min(entry.verse, bk.chapters[entry.chapter - 1].length));
  }

  function handleGoTo(e) {
    if (e.key !== 'Enter' || !bible) return;
    try {
      const ref = parseReference(bible, goTo);
      const bk = bible.books.find((b) => b.id === ref.bookId);
      project(bk, ref.chapter, ref.verse, ref.to ?? undefined);
      setGoTo('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  const favKey = book && lo != null ? `${book.id}-${chapter}-${lo}` : null;
  const isFavorite = favKey && favorites.some((f) => f.key === favKey);

  function toggleFavorite() {
    if (!favKey) return;
    const next = isFavorite
      ? favorites.filter((f) => f.key !== favKey)
      : [{ key: favKey, bookId: book.id, chapter, verse: lo, label: `${book.name} ${chapter}:${lo}` }, ...favorites];
    setFavorites(next);
    store.set('bible.favorites', next);
  }

  function addSelection() {
    if (!book || lo == null) return;
    onAddToService({ type: 'bible', bookId: book.id, chapter, from: lo, to: hi, perSlide });
  }

  if (!bibles.length) {
    return (
      <div className="empty">
        <strong>Nenhuma Bíblia encontrada.</strong>
        <p>Coloque o arquivo da tradução na pasta <code>data/bible</code> e abra o programa de novo.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <Field label="1. Tradução">
          <select value={translation} onChange={(e) => { onTranslation(e.target.value); e.target.blur(); }}>
            {bibles.map((b) => <option key={b.path} value={b.path}>{b.id}</option>)}
          </select>
        </Field>
        <Field label="2. Livro">
          <select
            value={book?.id || ''}
            onChange={(e) => { setBookId(e.target.value); setChapter(1); setSelFrom(null); e.target.blur(); }}
          >
            {bible?.books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="3. Capítulo">
          <select value={chapter} onChange={(e) => { setChapter(Number(e.target.value)); setSelFrom(null); e.target.blur(); }}>
            {Array.from({ length: chapterCount }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
        </Field>
        <Field label="Versículos por slide">
          <select
            value={perSlide}
            onChange={(e) => { const v = Number(e.target.value); setPerSlide(v); store.set('bible.perSlide', v); e.target.blur(); }}
          >
            <option value={1}>1 versículo</option>
            <option value={2}>2 versículos</option>
            <option value={3}>3 versículos</option>
          </select>
        </Field>
        <Field label="Ir direto para" hint="Digite e aperte Enter. Ex.: Jo 3:16 ou Sl 23:1-6">
          <input value={goTo} placeholder="Jo 3:16" onChange={(e) => setGoTo(e.target.value)} onKeyDown={handleGoTo} />
        </Field>
      </div>

      {(error || loadError) && <div className="alert">{error || loadError}</div>}

      {book && (
        <div className="bible-layout">
          <div className="panel">
            <div className="panel-head">
              <h2>{book.name} {chapter}</h2>
              <div className="row">
                <button className="secondary" onClick={toggleFavorite} disabled={lo == null} title="Favoritar o versículo selecionado">
                  {isFavorite ? '★ Favorito' : '☆ Favoritar'}
                </button>
                <button className="secondary" onClick={addSelection} disabled={lo == null}>
                  + Adicionar ao culto{lo != null ? ` (${lo}${hi > lo ? `-${hi}` : ''})` : ''}
                </button>
                <button className="secondary" onClick={() => step(-1)}>◀ Anterior</button>
                <button onClick={() => step(1)}>Próximo ▶</button>
              </div>
            </div>
            <p className="hint">Clique para projetar. Shift + clique seleciona um trecho para adicionar ao culto. Setas ← → avançam.</p>
            <ol className="verses">
              {verses.map((text, i) => {
                const n = i + 1;
                const active = lo != null && n >= lo && n <= hi;
                return (
                  <li key={n}>
                    <button className={`verse ${active ? 'active' : ''}`} onClick={(e) => clickVerse(e, n)}>
                      <span className="verse-n">{n}</span>
                      <span className="verse-t">{text}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="stack">
            <div className="panel stack">
              <h3 className="side-title">★ Favoritos</h3>
              {favorites.length === 0 && <p className="muted">Selecione um versículo e clique em “Favoritar”.</p>}
              <div className="chips">
                {favorites.map((f) => (
                  <button key={f.key} className="chip" onClick={() => goToRef(f)}>{f.label}</button>
                ))}
              </div>
            </div>
            <div className="panel stack">
              <div className="panel-head">
                <h3 className="side-title">Recentes</h3>
                {history.length > 0 && (
                  <button className="link" onClick={() => { setHistory([]); store.set('bible.history', []); }}>limpar</button>
                )}
              </div>
              {history.length === 0 && <p className="muted">Os versículos projetados aparecem aqui.</p>}
              <div className="chips">
                {history.map((h) => (
                  <button key={h.key} className="chip" onClick={() => goToRef(h)}>{h.label}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
