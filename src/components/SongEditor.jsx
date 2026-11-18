import { useState } from 'react';
import Field from './Field.jsx';
import { labelName, lyricsToParts, parseVerses } from '../lib/songs.js';
import { ask } from '../lib/confirm.js';

// Tipos de parte e o prefixo do rótulo
const KINDS = [
  { prefix: 'V', name: 'Verso' },
  { prefix: 'R', name: 'Refrão' },
  { prefix: 'PC', name: 'Pré-refrão' },
  { prefix: 'P', name: 'Ponte' },
  { prefix: 'F', name: 'Final' },
];

const kindOf = (label) => KINDS.find((k) => new RegExp(`^${k.prefix}\\d*$`, 'i').test(label))?.prefix || 'V';
let seq = 0;
const uid = () => `p${Date.now()}-${seq++}`;

// Renumera os rótulos (V1, V2..., R, R2...) na ordem em que as partes aparecem
function relabel(parts) {
  const count = {};
  const total = {};
  parts.forEach((p) => { total[p.kind] = (total[p.kind] || 0) + 1; });
  return parts.map((p) => {
    count[p.kind] = (count[p.kind] || 0) + 1;
    const label = p.kind === 'V' || total[p.kind] > 1 ? `${p.kind}${count[p.kind]}` : p.kind;
    return { ...p, label };
  });
}

// Partes + sequência (como ids das partes) a partir de { verses, order }
function fromVerses(verses, order) {
  const parts = relabel(Object.entries(verses || {}).map(([label, text]) => ({ id: uid(), kind: kindOf(label), text, old: label })));
  const byOld = Object.fromEntries(parts.map((p) => [p.old, p.id]));
  return { parts, sequence: (order || []).map((l) => byOld[l]).filter(Boolean) };
}

// Editor de músicas: 1) informações, 2) letra em partes, 3) ordem em que é cantada
export default function SongEditor({ song, onSave, onCancel }) {
  const [initial] = useState(() => fromVerses(song.verses, song.order));
  const [title, setTitle] = useState(song.title);
  const [author, setAuthor] = useState(song.author);
  const [ccli, setCcli] = useState(song.ccli_number);
  const [parts, setPartsRaw] = useState(initial.parts);
  const [sequence, setSequence] = useState(initial.sequence); // ids das partes
  const [paste, setPaste] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const setParts = (next) => setPartsRaw(relabel(next));
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]));

  function addPart(kind) {
    const part = { id: uid(), kind, text: '' };
    setParts([...parts, part]);
    setSequence((s) => [...s, part.id]);
    setTimeout(() => document.getElementById(`part-${part.id}`)?.focus(), 0);
  }

  function updatePart(id, patch) {
    setParts(parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function removePart(p) {
    if (p.text.trim() && !(await ask(`Remover “${labelName(p.label)}”?`, { danger: true, okLabel: 'Remover' }))) return;
    setParts(parts.filter((x) => x.id !== p.id));
    setSequence((s) => s.filter((id) => id !== p.id));
  }

  function moveInSequence(pos, delta) {
    const j = pos + delta;
    if (j < 0 || j >= sequence.length) return;
    const next = [...sequence];
    [next[pos], next[j]] = [next[j], next[pos]];
    setSequence(next);
  }

  // Preenche a partir de uma letra colada ou buscada: divide em estrofes e acha o refrão
  async function fillFromLyrics(text, meta = {}) {
    if (parts.some((p) => p.text.trim()) && !(await ask('Substituir a letra atual?', { okLabel: 'Substituir' }))) return;
    const r = lyricsToParts(text);
    const next = fromVerses(parseVerses(r.text), r.order.split(',').map((s) => s.trim()));
    setPartsRaw(next.parts);
    setSequence(next.sequence);
    if (meta.title && !title.trim()) setTitle(meta.title);
    if (meta.author && !author.trim()) setAuthor(meta.author);
    setShowPaste(false);
    setPaste('');
    setResults(null);
  }

  async function search() {
    if (!q.trim()) return;
    setSearching(true);
    setSearchError('');
    try {
      setResults(await window.api.searchLyrics(q.trim()));
    } catch {
      setResults(null);
      setSearchError('Não consegui buscar. Verifique a internet.');
    }
    setSearching(false);
  }

  const canSave = title.trim() && parts.some((p) => p.text.trim());

  function handleSave() {
    const verses = {};
    parts.forEach((p) => { if (p.text.trim()) verses[p.label] = p.text.trim(); });
    let order = sequence.map((id) => byId[id]?.label).filter((l) => l && verses[l]);
    if (!order.length) order = Object.keys(verses);
    onSave({ ...song, title: title.trim(), author: author.trim(), ccli_number: ccli.trim(), verses, order });
  }

  return (
    <div className="stack editor">
      <div className="panel-head">
        <h2>{song.title ? `Editar: ${song.title}` : 'Nova música'}</h2>
        <div className="row">
          <button className="secondary" onClick={onCancel}>Cancelar</button>
          <button onClick={handleSave} disabled={!canSave}>Salvar música</button>
        </div>
      </div>

      <section className="panel stack">
        <h3 className="step"><span>1</span> Informações</h3>
        <div className="grid-3">
          <Field label="Título *"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="Nome da música" /></Field>
          <Field label="Autor / ministério"><input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
          <Field label="Número CCLI" hint="Opcional"><input value={ccli} onChange={(e) => setCcli(e.target.value)} /></Field>
        </div>
      </section>

      <section className="panel stack">
        <div className="panel-head">
          <h3 className="step"><span>2</span> Letra</h3>
          <button className="secondary small" onClick={() => setShowPaste((v) => !v)}>📋 Colar letra inteira</button>
        </div>

        <div className="search-box stack">
          <Field label="Buscar a letra na internet" hint="Busca no LRCLIB. Nem toda música existe lá; confira antes de salvar.">
            <div className="row nowrap">
              <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Título e/ou artista" />
              <button onClick={search} disabled={searching || !q.trim()}>{searching ? 'Buscando…' : 'Buscar'}</button>
            </div>
          </Field>
          {searchError && <div className="alert">{searchError}</div>}
          {results && results.length === 0 && <p className="muted">Nada encontrado. Cole a letra ou adicione as partes abaixo.</p>}
          {results && results.length > 0 && (
            <ul className="result-list">
              {results.map((r) => (
                <li key={r.id}>
                  <button className="song-item" onClick={() => fillFromLyrics(r.lyrics, { title: r.title, author: r.artist })}>
                    <strong>{r.title}</strong><span className="muted">{r.artist}{r.album ? ` · ${r.album}` : ''}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {showPaste && (
          <div className="paste-box stack">
            <Field label="Cole a letra completa" hint="Deixe uma linha em branco entre as estrofes. Estrofes repetidas viram refrão automaticamente.">
              <textarea rows={10} value={paste} onChange={(e) => setPaste(e.target.value)} autoFocus />
            </Field>
            <div className="row">
              <button onClick={() => fillFromLyrics(paste)} disabled={!paste.trim()}>Separar em partes</button>
              <button className="secondary" onClick={() => setShowPaste(false)}>Fechar</button>
            </div>
          </div>
        )}

        {parts.length === 0 && <p className="muted">Nenhuma parte ainda. Busque, cole a letra ou adicione as partes com os botões abaixo.</p>}

        <div className="parts">
          {parts.map((p) => (
            <div key={p.id} className={`part kind-${p.kind}`}>
              <div className="part-head">
                <span className="part-tag">{p.label}</span>
                <select value={p.kind} onChange={(e) => updatePart(p.id, { kind: e.target.value })} aria-label="Tipo da parte">
                  {KINDS.map((k) => <option key={k.prefix} value={k.prefix}>{k.name}</option>)}
                </select>
                <span className="grow" />
                <button className="icon" title="Remover parte" onClick={() => removePart(p)}>✕</button>
              </div>
              <textarea
                id={`part-${p.id}`}
                rows={Math.max(3, p.text.split('\n').length + 1)}
                value={p.text}
                onChange={(e) => updatePart(p.id, { text: e.target.value })}
                placeholder="Uma linha por linha cantada"
              />
            </div>
          ))}
        </div>

        <div className="row">
          <span className="muted">Adicionar parte:</span>
          {KINDS.map((k) => (
            <button key={k.prefix} className="secondary small" onClick={() => addPart(k.prefix)}>+ {k.name}</button>
          ))}
        </div>
      </section>

      <section className="panel stack">
        <h3 className="step"><span>3</span> Ordem em que é cantada</h3>
        <p className="hint">Clique nas partes para colocá-las na sequência, repetindo o refrão quantas vezes ele for cantado. Se ficar vazia, usa a ordem da letra.</p>
        <div className="row">
          {parts.map((p) => (
            <button key={p.id} className={`chip add kind-${p.kind}`} onClick={() => setSequence((s) => [...s, p.id])} disabled={!p.text.trim()}>
              + {labelName(p.label)}
            </button>
          ))}
        </div>
        <ol className="order-list">
          {sequence.length === 0 && <li className="muted">Sequência vazia.</li>}
          {sequence.map((id, pos) => {
            const p = byId[id];
            if (!p) return null;
            return (
              <li key={`${pos}-${id}`} className={`order-item kind-${p.kind}`}>
                <span className="order-n">{pos + 1}</span>
                <strong>{labelName(p.label)}</strong>
                <span className="order-preview">{p.text.split('\n')[0]}</span>
                <button className="icon" title="Mover para antes" onClick={() => moveInSequence(pos, -1)} disabled={pos === 0}>↑</button>
                <button className="icon" title="Mover para depois" onClick={() => moveInSequence(pos, 1)} disabled={pos === sequence.length - 1}>↓</button>
                <button className="icon" title="Tirar da sequência" onClick={() => setSequence((s) => s.filter((_, k) => k !== pos))}>✕</button>
              </li>
            );
          })}
        </ol>
        {sequence.length > 0 && <div className="row"><button className="link" onClick={() => setSequence([])}>limpar sequência</button></div>}
      </section>

      <div className="row end">
        <button className="secondary" onClick={onCancel}>Cancelar</button>
        <button className="big" onClick={handleSave} disabled={!canSave}>Salvar música</button>
      </div>
    </div>
  );
}
