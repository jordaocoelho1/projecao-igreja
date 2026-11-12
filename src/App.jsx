import { useEffect, useState } from 'react';
import BibleBrowser from './components/BibleBrowser.jsx';
import SongsPanel from './components/SongsPanel.jsx';

export default function App() {
  const [tab, setTab] = useState('biblia');
  const [songs, setSongs] = useState([]);
  const [bibles, setBibles] = useState([]);
  const [current, setCurrent] = useState(null);
  const [projectionOpen, setProjectionOpen] = useState(false);

  useEffect(() => {
    window.api.loadSongs().then(setSongs);
    window.api.listBibles().then(setBibles);
    return window.api.onProjectionStatus(setProjectionOpen);
  }, []);

  // Esc limpa a tela rapidamente
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') clear();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function saveSong(song) {
    setSongs((prev) => {
      const next = prev.some((s) => s.id === song.id)
        ? prev.map((s) => (s.id === song.id ? song : s))
        : [...prev, song];
      window.api.saveSongs(next);
      return next;
    });
  }

  function deleteSong(id) {
    setSongs((prev) => {
      const next = prev.filter((s) => s.id !== id);
      window.api.saveSongs(next);
      return next;
    });
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
    <div className="shell">
      <header className="topbar">
        <div className="brand">Projeção Igreja</div>
        <nav className="tabs">
          <button className={tab === 'biblia' ? 'tab active' : 'tab'} onClick={() => setTab('biblia')}>📖 Bíblia</button>
          <button className={tab === 'musicas' ? 'tab active' : 'tab'} onClick={() => setTab('musicas')}>🎵 Músicas</button>
        </nav>
      </header>

      <main className="content">
        {tab === 'biblia' && <BibleBrowser bibles={bibles} onShow={show} currentId={current?.id} />}
        {tab === 'musicas' && (
          <SongsPanel
            songs={songs}
            onSaveSong={saveSong}
            onDeleteSong={deleteSong}
            onShow={show}
            currentId={current?.id}
          />
        )}
      </main>

      <aside className="screen-panel">
        <h3>Na tela agora</h3>
        <div className="preview">
          {current ? (
            <>
              <div className="preview-body">{current.body}</div>
              <div className="preview-title">{current.title}</div>
            </>
          ) : (
            <div className="preview-empty">Tela limpa</div>
          )}
        </div>
        <button className="danger big" onClick={clear}>Limpar tela (Esc)</button>
        <div className="status">
          <span className={projectionOpen ? 'dot on' : 'dot'} />
          {projectionOpen ? 'Projeção aberta' : 'Projeção fechada'}
        </div>
        {projectionOpen ? (
          <button className="secondary" onClick={() => window.api.closeProjection()}>Fechar projeção</button>
        ) : (
          <button className="big" onClick={() => window.api.openProjection()}>Abrir projeção</button>
        )}
        <p className="hint">Com um segundo monitor ou projetor conectado, a projeção abre nele em tela cheia. Use F11 na projeção para alternar tela cheia.</p>
      </aside>
    </div>
  );
}
