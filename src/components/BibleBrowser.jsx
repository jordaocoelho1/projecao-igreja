import { useEffect, useState } from 'react';
import Field from './Field.jsx';
import { adaptBible, parseReference } from '../lib/bible.js';
import { store } from '../lib/storage.js';

// Navegação da Bíblia sem digitar: Tradução → Livro → Capítulo → clique no versículo
export default function BibleBrowser({ bibles, onShow, currentId }) {
  const [translation, setTranslation] = useState(store.get('bible.translation', ''));
  const [bible, setBible] = useState(null);
  const [bookId, setBookId] = useState(store.get('bible.book', ''));
  const [chapter, setChapter] = useState(store.get('bible.chapter', 1));
  const [verse, setVerse] = useState(null);
  const [perSlide, setPerSlide] = useState(store.get('bible.perSlide', 1));
  const [goTo, setGoTo] = useState('');
  const [error, setError] = useState('');

  // Escolhe a tradução salva (ou a primeira disponível)
  useEffect(() => {
    if (!bibles.length) return;
    if (!bibles.some((b) => b.path === translation)) setTranslation(bibles[0].path);
  }, [bibles, translation]);

  useEffect(() => {
    if (!translation) return;
    window.api
      .loadBible(translation)
      .then((raw) => {
        const b = adaptBible(raw);
        setBible(b);
        setError('');
        setBookId((cur) => (b.books.some((x) => x.id === cur) ? cur : b.books[0].id));
        store.set('bible.translation', translation);
      })
      .catch((e) => setError(`Não consegui abrir esta tradução: ${e.message}`));
  }, [translation]);

  const book = bible?.books.find((b) => b.id === bookId) || bible?.books[0];
  const chapterCount = book?.chapters.length || 0;
  const verses = book?.chapters[chapter - 1] || [];

  // Garante que o capítulo existe no livro escolhido
  useEffect(() => {
    if (book && chapter > chapterCount) setChapter(1);
  }, [book, chapter, chapterCount]);

  function slideFor(bk, ch, n) {
    const list = bk.chapters[ch - 1];
    const group = list.slice(n - 1, n - 1 + perSlide);
    const last = n + group.length - 1;
    const ref = group.length > 1 ? `${n}-${last}` : `${n}`;
    return {
      id: `b-${bk.id}-${ch}-${n}-${perSlide}`,
      title: `${bk.name} ${ch}:${ref}`,
      body: group.join(' '),
    };
  }

  function project(bk, ch, n) {
    setBookId(bk.id);
    setChapter(ch);
    setVerse(n);
    store.set('bible.book', bk.id);
    store.set('bible.chapter', ch);
    onShow(slideFor(bk, ch, n));
  }

  function step(delta) {
    if (!book) return;
    if (verse == null) return project(book, chapter, 1);
    const next = verse + delta * perSlide;
    if (next >= 1 && next <= verses.length) return project(book, chapter, next);
    if (next > verses.length && chapter < chapterCount) return project(book, chapter + 1, 1);
    if (next < 1 && chapter > 1) {
      const prev = book.chapters[chapter - 2];
      return project(book, chapter - 1, Math.max(1, prev.length - perSlide + 1));
    }
  }

  // Setas ← → trocam de versículo durante o culto
  useEffect(() => {
    function onKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  function handleGoTo(e) {
    if (e.key !== 'Enter' || !bible) return;
    try {
      const ref = parseReference(bible, goTo);
      const bk = bible.books.find((b) => b.id === ref.bookId);
      project(bk, ref.chapter, ref.verse);
      setGoTo('');
      setError('');
    } catch (err) {
      setError(err.message);
    }
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
          <select value={translation} onChange={(e) => { setTranslation(e.target.value); e.target.blur(); }}>
            {bibles.map((b) => <option key={b.path} value={b.path}>{b.id}</option>)}
          </select>
        </Field>
        <Field label="2. Livro">
          <select
            value={book?.id || ''}
            onChange={(e) => { setBookId(e.target.value); setChapter(1); setVerse(null); e.target.blur(); }}
          >
            {bible?.books.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>
        <Field label="3. Capítulo">
          <select
            value={chapter}
            onChange={(e) => { setChapter(Number(e.target.value)); setVerse(null); e.target.blur(); }}
          >
            {Array.from({ length: chapterCount }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </Field>
        <Field label="Versículos por slide">
          <select
            value={perSlide}
            onChange={(e) => { setPerSlide(Number(e.target.value)); store.set('bible.perSlide', Number(e.target.value)); setVerse(null); e.target.blur(); }}
          >
            <option value={1}>1 versículo</option>
            <option value={2}>2 versículos</option>
            <option value={3}>3 versículos</option>
          </select>
        </Field>
        <Field label="Ir direto para" hint="Digite e aperte Enter. Ex.: Jo 3:16">
          <input
            value={goTo}
            placeholder="Jo 3:16"
            onChange={(e) => setGoTo(e.target.value)}
            onKeyDown={handleGoTo}
          />
        </Field>
      </div>

      {error && <div className="alert">{error}</div>}

      {book && (
        <div className="panel">
          <div className="panel-head">
            <h2>{book.name} {chapter}</h2>
            <div className="row">
              <button className="secondary" onClick={() => step(-1)}>◀ Anterior</button>
              <button onClick={() => step(1)}>Próximo ▶</button>
            </div>
          </div>
          <p className="hint">Clique em um versículo para projetar. Use as setas ← → do teclado para avançar.</p>
          <ol className="verses">
            {verses.map((text, i) => {
              const n = i + 1;
              const active = verse != null && n >= verse && n < verse + perSlide;
              return (
                <li key={n}>
                  <button
                    className={`verse ${active ? 'active' : ''}`}
                    onClick={() => project(book, chapter, n)}
                    title={currentId ? undefined : 'Projetar'}
                  >
                    <span className="verse-n">{n}</span>
                    <span className="verse-t">{text}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}
