import { useEffect, useState } from 'react';
import SongEditor from './components/SongEditor.jsx';
import { emptySong, songToSlides } from './lib/songs.js';
import { adaptBible, getVerses, versesToSlides } from './lib/bible.js';

export default function App() {
  const [tab, setTab] = useState('painel');
  const [songs, setSongs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [bibles, setBibles] = useState([]);
  const [bible, setBible] = useState(null);
  const [ref, setRef] = useState({ book: 'João', chapter: 3, from: 16, to: 16 });
  const [slides, setSlides] = useState([]);
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    window.api.loadSongs().then(setSongs);
    window.api.listBibles().then(setBibles);
  }, []);

  async function saveSong(song) {
    const next = songs.some((s) => s.id === song.id)
      ? songs.map((s) => (s.id === song.id ? song : s))
      : [...songs, song];
    setSongs(next);
    await window.api.saveSongs(next);
    setEditing(null);
  }

  async function removeSong(id) {
    if (!confirm('Excluir esta música?')) return;
    const next = songs.filter((s) => s.id !== id);
    setSongs(next);
    await window.api.saveSongs(next);
  }

  async function pickBible(file) {
    const raw = await window.api.loadBible(file);
    setBible(adaptBible(raw));
    setError('');
  }

  function searchVerses() {
    try {
      const verses = getVerses(bible, ref.book, Number(ref.chapter), Number(ref.from), Number(ref.to));
      setSlides(versesToSlides(verses, 2));
      setError('');
    } catch (e) {
      setSlides([]);
      setError(e.message);
    }
  }

  function show(slide) {
    setCurrent(slide);
    window.api.showSlide(slide);
  }

  function clear() {
    setCurrent(null);
    window.api.clearSlide();
  }

  return (
    <div className="app">
      <header>
        <nav>
          <button className={tab === 'painel' ? 'active' : ''} onClick={() => setTab('painel')}>Painel</button>
          <button className={tab === 'musicas' ? 'active' : ''} onClick={() => setTab('musicas')}>Músicas</button>
          <button className={tab === 'biblia' ? 'active' : ''} onClick={() => setTab('biblia')}>Bíblia</button>
        </nav>
        <div className="row">
          <button onClick={() => window.api.openProjection()}>Abrir projeção</button>
          <button className="ghost" onClick={clear}>Limpar tela</button>
        </div>
      </header>

      {tab === 'painel' && (
        <section>
          <p>Escolha um versículo ou uma música e clique no slide para projetar.</p>
          <div className="preview">
            {current ? (
              <>
                <div className="preview-title">{current.title}</div>
                <div className="preview-body">{current.body}</div>
              </>
            ) : (
              <div className="muted">Nenhum slide na tela</div>
            )}
          </div>
        </section>
      )}

      {tab === 'musicas' && (
        <section>
          {editing ? (
            <SongEditor song={editing} onSave={saveSong} onCancel={() => setEditing(null)} />
          ) : (
            <>
              <button onClick={() => setEditing(emptySong())}>Nova música</button>
              <ul className="list">
                {songs.map((s) => (
                  <li key={s.id}>
                    <div>
                      <strong>{s.title}</strong> <span className="muted">{s.author}</span>
                    </div>
                    <div className="row">
                      {songToSlides(s).map((slide, i) => (
                        <button key={i} className="chip" onClick={() => show(slide)}>
                          {s.order[i]}
                        </button>
                      ))}
                      <button className="ghost" onClick={() => setEditing(s)}>Editar</button>
                      <button className="ghost" onClick={() => removeSong(s.id)}>Excluir</button>
                    </div>
                  </li>
                ))}
              </ul>
              {songs.length === 0 && <p className="muted">Nenhuma música cadastrada.</p>}
            </>
          )}
        </section>
      )}

      {tab === 'biblia' && (
        <section>
          <div className="row">
            <select onChange={(e) => e.target.value && pickBible(e.target.value)} defaultValue="">
              <option value="">Escolha a tradução</option>
              {bibles.map((b) => (
                <option key={b.path} value={b.path}>{b.id}</option>
              ))}
            </select>
          </div>
          <div className="row">
            <input value={ref.book} onChange={(e) => setRef({ ...ref, book: e.target.value })} placeholder="Livro" />
            <input type="number" min="1" value={ref.chapter} onChange={(e) => setRef({ ...ref, chapter: e.target.value })} placeholder="Capítulo" />
            <input type="number" min="1" value={ref.from} onChange={(e) => setRef({ ...ref, from: e.target.value })} placeholder="De" />
            <input type="number" min="1" value={ref.to} onChange={(e) => setRef({ ...ref, to: e.target.value })} placeholder="Até" />
            <button onClick={searchVerses} disabled={!bible}>Buscar</button>
          </div>
          {error && <p className="error">{error}</p>}
          <ul className="list">
            {slides.map((slide, i) => (
              <li key={i} onClick={() => show(slide)} className="clickable">
                <strong>{slide.title}</strong>
                <p>{slide.body}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
