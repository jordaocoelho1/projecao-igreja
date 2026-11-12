import { useEffect, useRef, useState } from 'react';
import pkg from '../package.json';
import BibleBrowser from './components/BibleBrowser.jsx';
import SongsPanel from './components/SongsPanel.jsx';
import ServicePanel from './components/ServicePanel.jsx';
import Appearance from './components/Appearance.jsx';
import SlideView from './components/SlideView.jsx';
import { DEFAULT_SETTINGS, FONT_SCALE_MAX, FONT_SCALE_MIN } from './lib/themes.js';
import { useMedia } from './lib/useMedia.js';
import { adaptBible } from './lib/bible.js';
import { mergeSongs, parseSongFiles } from './lib/songs.js';
import { store } from './lib/storage.js';

const BLACK = { id: '__black', black: true };

export default function App() {
  const [tab, setTab] = useState('culto');
  const [songs, setSongs] = useState([]);
  const [service, setService] = useState([]);
  const [bibles, setBibles] = useState([]);
  const [translation, setTranslation] = useState(store.get('bible.translation', ''));
  const [bible, setBible] = useState(null);
  const [bibleError, setBibleError] = useState('');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const media = useMedia(settings);

  const [current, setCurrent] = useState(null); // slide escolhido no painel
  const [onScreen, setOnScreen] = useState(null); // o que está de fato na projeção
  const [blackout, setBlackout] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [projectionOpen, setProjectionOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const onScreenRef = useRef(null);
  onScreenRef.current = onScreen;

  // ---------- Carregamento ----------
  useEffect(() => {
    window.api.loadSongs().then(setSongs);
    window.api.loadService().then((s) => setService(Array.isArray(s) ? s : []));
    window.api.listBibles().then(setBibles);
    window.api.loadSettings().then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }));
    const offStatus = window.api.onProjectionStatus(setProjectionOpen);
    // Quando a projeção termina de abrir, reenvia o que deve estar na tela
    const offReady = window.api.onProjectionReady(() => window.api.showSlide(onScreenRef.current));
    return () => { offStatus(); offReady(); };
  }, []);

  useEffect(() => {
    if (!bibles.length) return;
    if (!bibles.some((b) => b.path === translation)) setTranslation(bibles[0].path);
  }, [bibles, translation]);

  useEffect(() => {
    if (!translation) return;
    window.api
      .loadBible(translation)
      .then((raw) => {
        setBible(adaptBible(raw));
        setBibleError('');
        store.set('bible.translation', translation);
      })
      .catch((e) => setBibleError(`Não consegui abrir esta tradução: ${e.message}`));
  }, [translation]);

  // ---------- O que vai para a tela ----------
  // Congelada: nada muda na projeção. Tela preta: tem prioridade sobre o slide.
  useEffect(() => {
    if (frozen) return;
    const out = blackout ? BLACK : current;
    setOnScreen(out);
    window.api.showSlide(out);
  }, [current, blackout, frozen]);

  function show(slide) {
    setCurrent(slide);
  }

  function clear() {
    setCurrent(null);
    setBlackout(false);
  }

  function notify(message, kind = 'ok') {
    setToast({ message, kind });
    setTimeout(() => setToast((t) => (t && t.message === message ? null : t)), 4000);
  }

  // Atalhos: Esc limpa, B tela preta, F congela
  const keyActions = useRef({});
  keyActions.current = {
    Escape: clear,
    b: () => setBlackout((v) => !v),
    f: () => setFrozen((v) => !v),
  };
  useEffect(() => {
    function onKey(e) {
      if (e.key !== 'Escape' && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const action = keyActions.current[e.key.length === 1 ? e.key.toLowerCase() : e.key];
      if (action) { e.preventDefault(); action(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ---------- Dados ----------
  function saveSongs(next) {
    setSongs(next);
    window.api.saveSongs(next);
  }

  function saveSong(song) {
    saveSongs(songs.some((s) => s.id === song.id) ? songs.map((s) => (s.id === song.id ? song : s)) : [...songs, song]);
  }

  function updateService(next) {
    setService(next);
    window.api.saveService(next);
  }

  function addToService(item) {
    updateService([...service, { ...item, id: crypto.randomUUID() }]);
    notify('Adicionado à ordem do culto');
  }

  function changeSettings(patch) {
    const next = { ...settings, ...patch };
    setSettings(next);
    window.api.saveSettings(next);
  }

  function changeFontScale(delta) {
    const v = Math.round(Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, (settings.fontScale || 1) + delta)) * 10) / 10;
    changeSettings({ fontScale: v });
  }

  async function importSongs() {
    const files = await window.api.importSongFiles();
    if (!files.length) return;
    const { songs: incoming, errors } = parseSongFiles(files);
    const { songs: merged, added, skipped } = mergeSongs(songs, incoming);
    if (added) saveSongs(merged);
    const parts = [`${added} música(s) importada(s)`];
    if (skipped) parts.push(`${skipped} já existiam`);
    if (errors.length) parts.push(`${errors.length} com erro: ${errors.slice(0, 3).join('; ')}`);
    notify(parts.join(' · '), errors.length && !added ? 'error' : 'ok');
  }

  async function exportSongs() {
    const file = await window.api.exportSongs(songs);
    if (file) notify(`Backup salvo em ${file}`);
  }

  const tabs = [
    ['culto', '📋 Culto'],
    ['biblia', '📖 Bíblia'],
    ['musicas', '🎵 Músicas'],
    ['aparencia', '🎨 Aparência'],
  ];

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">Projeção Igreja <span className="version">v{pkg.version}</span></div>
        <nav className="tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>{label}</button>
          ))}
        </nav>
      </header>

      <main className="content">
        {tab === 'culto' && (
          <ServicePanel
            service={service}
            onChange={updateService}
            songs={songs}
            bible={bible}
            settings={settings}
            media={media}
            onShow={show}
            currentId={current?.id}
            onAdd={addToService}
          />
        )}
        {tab === 'biblia' && (
          <BibleBrowser
            bibles={bibles}
            translation={translation}
            onTranslation={setTranslation}
            bible={bible}
            loadError={bibleError}
            onShow={show}
            onAddToService={addToService}
          />
        )}
        {tab === 'musicas' && (
          <SongsPanel
            songs={songs}
            onSaveSong={saveSong}
            onDeleteSong={(id) => saveSongs(songs.filter((s) => s.id !== id))}
            onShow={show}
            currentId={current?.id}
            onAddToService={addToService}
            onImport={importSongs}
            onExport={exportSongs}
          />
        )}
        {tab === 'aparencia' && <Appearance settings={settings} media={media} onChange={changeSettings} />}
      </main>

      <aside className="screen-panel">
        <h3>Na tela agora</h3>
        <div className={`preview ${frozen ? 'frozen' : ''}`}>
          <SlideView slide={onScreen} settings={settings} media={media} />
        </div>
        {frozen && <div className="notice">❄ Tela congelada: o que você clicar não vai para a projeção até descongelar.</div>}
        {blackout && !frozen && <div className="notice">■ Tela preta ligada.</div>}

        <div className="control-grid">
          <button className="secondary" onClick={clear}>Limpar <kbd>Esc</kbd></button>
          <button className={blackout ? 'danger' : 'secondary'} onClick={() => setBlackout((v) => !v)}>
            {blackout ? 'Tirar preta' : 'Tela preta'} <kbd>B</kbd>
          </button>
          <button className={frozen ? 'warn' : 'secondary'} onClick={() => setFrozen((v) => !v)}>
            {frozen ? 'Descongelar' : 'Congelar'} <kbd>F</kbd>
          </button>
        </div>

        <div className="field">
          <span className="field-label">Tamanho da letra</span>
          <div className="row nowrap">
            <button className="secondary" onClick={() => changeFontScale(-0.1)} disabled={settings.fontScale <= FONT_SCALE_MIN}>A−</button>
            <button className="secondary grow" onClick={() => changeSettings({ fontScale: 1 })} title="Voltar ao tamanho padrão">
              {Math.round((settings.fontScale || 1) * 100)}%
            </button>
            <button className="secondary" onClick={() => changeFontScale(0.1)} disabled={settings.fontScale >= FONT_SCALE_MAX}>A+</button>
          </div>
        </div>

        <div className="status">
          <span className={projectionOpen ? 'dot on' : 'dot'} />
          {projectionOpen ? 'Projeção aberta' : 'Projeção fechada'}
        </div>
        {projectionOpen ? (
          <button className="secondary" onClick={() => window.api.closeProjection()}>Fechar projeção</button>
        ) : (
          <button className="big" onClick={() => window.api.openProjection()}>Abrir projeção</button>
        )}
        <p className="hint">
          Com um segundo monitor ou projetor conectado, a projeção abre nele em tela cheia. F11 alterna a tela cheia.
          Setas ← → avançam os slides.
        </p>
      </aside>

      {toast && <div className={`toast ${toast.kind}`}>{toast.message}</div>}
    </div>
  );
}
