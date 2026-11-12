import { useMemo, useState } from 'react';
import Field from './Field.jsx';
import SlideView from './SlideView.jsx';
import { songToSlides } from '../lib/songs.js';
import { parseReference, rangeLabel, rangeSlides } from '../lib/bible.js';
import { useArrowKeys } from '../lib/useArrowKeys.js';

const ICONS = { song: '🎵', bible: '📖', text: '📝', image: '🖼' };

// Slides de um item do culto
function itemSlides(item, songs, bible) {
  if (item.type === 'song') {
    const song = songs.find((s) => s.id === item.songId);
    return song ? songToSlides(song) : [];
  }
  if (item.type === 'bible') {
    return rangeSlides(bible, item).map((s) => ({ ...s, label: s.title }));
  }
  if (item.type === 'text') {
    // Cada bloco separado por linha em branco vira um slide
    const blocks = String(item.body || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    const parts = blocks.length ? blocks : [''];
    return parts.map((body, i) => ({
      id: `t-${item.id}-${i}`,
      label: parts.length > 1 ? `${item.title || 'Texto'} (${i + 1}/${parts.length})` : item.title || 'Texto',
      title: item.title || '',
      body,
    }));
  }
  if (item.type === 'image') {
    return [{ id: `i-${item.id}`, label: item.name || 'Imagem', title: '', body: '', image: item.path }];
  }
  return [];
}

function itemName(item, songs, bible) {
  if (item.type === 'song') return songs.find((s) => s.id === item.songId)?.title || 'Música removida';
  if (item.type === 'bible') return rangeLabel(bible, item);
  if (item.type === 'text') return item.title || 'Texto livre';
  return item.name || 'Imagem';
}

// Ordem do culto: monta a lista antes e percorre tudo com as setas durante o culto
export default function ServicePanel({ service, onChange, songs, bible, settings, media, onShow, currentId, onAdd }) {
  const [selected, setSelected] = useState(0);
  const [songToAdd, setSongToAdd] = useState('');
  const [refText, setRefText] = useState('');
  const [refError, setRefError] = useState('');
  const [textForm, setTextForm] = useState(null); // { id?, title, body }

  const slidesByItem = useMemo(
    () => service.map((item) => itemSlides(item, songs, bible)),
    [service, songs, bible]
  );
  const sortedSongs = useMemo(() => [...songs].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')), [songs]);

  const sel = Math.min(selected, Math.max(0, service.length - 1));
  const item = service[sel];
  const slides = slidesByItem[sel] || [];

  // Posição do slide que está no ar, para continuar dali com as setas
  const live = useMemo(() => {
    for (let i = 0; i < slidesByItem.length; i++) {
      const j = slidesByItem[i].findIndex((s) => s.id === currentId);
      if (j >= 0) return { i, j };
    }
    return null;
  }, [slidesByItem, currentId]);

  function project(i, j) {
    const s = slidesByItem[i]?.[j];
    if (!s) return;
    setSelected(i);
    onShow(s);
  }

  function step(delta) {
    if (!service.length) return;
    if (!live) {
      // Nada no ar: começa pelo item selecionado
      const first = delta > 0 ? 0 : (slidesByItem[sel]?.length || 1) - 1;
      return project(sel, first);
    }
    let { i, j } = live;
    j += delta;
    while (i >= 0 && i < service.length) {
      const len = slidesByItem[i].length;
      if (j >= 0 && j < len) return project(i, j);
      i += delta;
      if (i < 0 || i >= service.length) return undefined;
      j = delta > 0 ? 0 : slidesByItem[i].length - 1;
    }
    return undefined;
  }
  useArrowKeys(step, !textForm);

  function update(next) {
    onChange(next);
  }

  function move(i, delta) {
    const j = i + delta;
    if (j < 0 || j >= service.length) return;
    const next = [...service];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
    setSelected(j);
  }

  function remove(i) {
    update(service.filter((_, k) => k !== i));
    if (sel >= i && sel > 0) setSelected(sel - 1);
  }

  function addSong() {
    if (!songToAdd) return;
    onAdd({ type: 'song', songId: songToAdd });
    setSongToAdd('');
  }

  function addBible(e) {
    if (e && e.key && e.key !== 'Enter') return;
    if (!bible || !refText.trim()) return;
    try {
      const r = parseReference(bible, refText);
      onAdd({
        type: 'bible',
        bookId: r.bookId,
        chapter: r.chapter,
        from: r.hasVerse ? r.verse : 1,
        to: r.to ?? (r.hasVerse ? r.verse : null),
        perSlide: 1,
      });
      setRefText('');
      setRefError('');
    } catch (err) {
      setRefError(err.message);
    }
  }

  async function addImage() {
    const file = await window.api.pickImage();
    if (!file) return;
    onAdd({ type: 'image', path: file, name: 'Imagem' });
  }

  function saveText() {
    if (!textForm.body.trim() && !textForm.title.trim()) return;
    if (textForm.id) {
      update(service.map((it) => (it.id === textForm.id ? { ...it, title: textForm.title, body: textForm.body } : it)));
    } else {
      onAdd({ type: 'text', title: textForm.title, body: textForm.body });
    }
    setTextForm(null);
  }

  return (
    <div className="stack">
      <div className="toolbar">
        <Field label="Adicionar música">
          <div className="row nowrap">
            <select value={songToAdd} onChange={(e) => setSongToAdd(e.target.value)}>
              <option value="">Escolha…</option>
              {sortedSongs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <button onClick={addSong} disabled={!songToAdd}>+</button>
          </div>
        </Field>
        <Field label="Adicionar leitura bíblica" hint="Ex.: Sl 23 (capítulo todo) ou Jo 3:16-18. Enter adiciona.">
          <div className="row nowrap">
            <input value={refText} onChange={(e) => setRefText(e.target.value)} onKeyDown={addBible} placeholder="Jo 3:16-18" disabled={!bible} />
            <button onClick={() => addBible()} disabled={!bible || !refText.trim()}>+</button>
          </div>
        </Field>
        <Field label="Outros">
          <div className="row nowrap">
            <button className="secondary" onClick={() => setTextForm({ title: '', body: '' })}>📝 Texto / aviso</button>
            <button className="secondary" onClick={addImage}>🖼 Imagem</button>
          </div>
        </Field>
      </div>

      {refError && <div className="alert">{refError}</div>}

      {textForm && (
        <div className="panel stack">
          <h2>{textForm.id ? 'Editar texto' : 'Novo texto ou aviso'}</h2>
          <Field label="Título" hint="Aparece embaixo, no lugar da referência. Pode deixar vazio.">
            <input value={textForm.title} onChange={(e) => setTextForm({ ...textForm, title: e.target.value })} autoFocus placeholder="Avisos" />
          </Field>
          <Field label="Texto" hint="Uma linha em branco separa um slide do outro.">
            <textarea rows={8} value={textForm.body} onChange={(e) => setTextForm({ ...textForm, body: e.target.value })} />
          </Field>
          <div className="row">
            <button onClick={saveText}>Salvar</button>
            <button className="secondary" onClick={() => setTextForm(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <div className="service-layout">
        <div className="panel stack">
          <div className="panel-head">
            <h2>Ordem do culto</h2>
            {service.length > 0 && (
              <button className="link" onClick={() => { if (confirm('Apagar toda a ordem do culto?')) { update([]); setSelected(0); } }}>
                limpar tudo
              </button>
            )}
          </div>
          {service.length === 0 && (
            <p className="muted">Adicione músicas, leituras, avisos e imagens na ordem em que vão acontecer. Também dá para adicionar pelas abas Bíblia e Músicas.</p>
          )}
          <ol className="service-list">
            {service.map((it, i) => {
              const isLive = live?.i === i;
              const broken = it.type === 'song' && !songs.some((s) => s.id === it.songId);
              return (
                <li key={it.id} className={`service-item ${i === sel ? 'active' : ''} ${isLive ? 'live' : ''}`}>
                  <button className="service-main" onClick={() => setSelected(i)}>
                    <span className="service-n">{i + 1}</span>
                    <span>{ICONS[it.type]}</span>
                    <span className={broken ? 'muted' : ''}>{itemName(it, songs, bible)}</span>
                    {isLive && <span className="badge">no ar</span>}
                  </button>
                  <div className="service-actions">
                    {it.type === 'text' && <button className="icon" title="Editar" onClick={() => setTextForm({ id: it.id, title: it.title, body: it.body })}>✎</button>}
                    <button className="icon" title="Subir" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
                    <button className="icon" title="Descer" onClick={() => move(i, 1)} disabled={i === service.length - 1}>↓</button>
                    <button className="icon" title="Remover" onClick={() => remove(i)}>✕</button>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="panel stack">
          {!item ? (
            <p className="muted">Os slides do item escolhido aparecem aqui.</p>
          ) : (
            <>
              <div className="panel-head">
                <h2>{ICONS[item.type]} {itemName(item, songs, bible)}</h2>
                <div className="row">
                  <button className="secondary" onClick={() => step(-1)}>◀ Anterior</button>
                  <button onClick={() => step(1)}>Próximo ▶</button>
                </div>
              </div>
              <p className="hint">Clique num slide para projetar. As setas ← → seguem para o próximo item do culto automaticamente.</p>
              {slides.length === 0 && <p className="muted">Este item não tem slides (a música foi excluída ou a Bíblia não carregou).</p>}
              <ol className="slides">
                {slides.map((s, j) => (
                  <li key={s.id}>
                    <button className={`slide-card ${currentId === s.id ? 'active' : ''}`} onClick={() => project(sel, j)}>
                      <span className="slide-label">{s.label}</span>
                      {s.image ? (
                        <span className="mini"><SlideView slide={s} settings={settings} media={media} /></span>
                      ) : (
                        <span className="slide-text">{s.body}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
