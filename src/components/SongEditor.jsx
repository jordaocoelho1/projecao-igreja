import { useState } from 'react';
import Field from './Field.jsx';
import { parseVerses, parseOrder, lyricsToParts } from '../lib/songs.js';

// Formulário de cadastro: as partes da música são digitadas em blocos com [rótulo]
export default function SongEditor({ song, onSave, onCancel }) {
  const [title, setTitle] = useState(song.title);
  const [author, setAuthor] = useState(song.author);
  const [ccli, setCcli] = useState(song.ccli_number);
  const [text, setText] = useState(
    Object.entries(song.verses || {})
      .map(([label, body]) => `[${label}]\n${body}`)
      .join('\n\n')
  );
  const [order, setOrder] = useState((song.order || []).join(', '));

  // Insere uma nova parte numerada no fim do texto: [V1], [V2]... ou [R]
  function addPart(prefix) {
    const existing = Object.keys(parseVerses(text)).filter((l) => l.startsWith(prefix));
    const label = prefix === 'R' && existing.length === 0 ? 'R' : `${prefix}${existing.length + 1}`;
    const sep = text.trim() ? '\n\n' : '';
    setText(`${text.trimEnd()}${sep}[${label}]\n`);
  }

  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

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

  function useResult(r) {
    const parts = lyricsToParts(r.lyrics);
    if (text.trim() && !confirm('Substituir a letra atual pela letra encontrada?')) return;
    if (!title.trim()) setTitle(r.title);
    if (!author.trim()) setAuthor(r.artist);
    setText(parts.text);
    setOrder(parts.order);
    setResults(null);
  }

  function handleSave() {
    const verses = parseVerses(text);
    onSave({
      ...song,
      title: title.trim(),
      author: author.trim(),
      ccli_number: ccli.trim(),
      verses,
      order: parseOrder(order, verses),
    });
  }

  const parts = Object.keys(parseVerses(text));

  return (
    <div className="panel stack">
      <div className="panel-head">
        <h2>{song.title ? 'Editar música' : 'Nova música'}</h2>
      </div>

      <div className="grid-3">
        <Field label="Título *"><input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus /></Field>
        <Field label="Autor"><input value={author} onChange={(e) => setAuthor(e.target.value)} /></Field>
        <Field label="Número CCLI" hint="Opcional, para controle da licença">
          <input value={ccli} onChange={(e) => setCcli(e.target.value)} />
        </Field>
      </div>

      <div className="panel stack">
        <Field label="Buscar letra na internet (opcional)" hint="Busca no LRCLIB. Confira a letra antes de salvar: pode haver erros e nem toda música existe lá.">
          <div className="row">
            <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} placeholder="Título e/ou artista" />
            <button onClick={search} disabled={searching}>{searching ? 'Buscando...' : 'Buscar'}</button>
          </div>
        </Field>
        {searchError && <div className="alert">{searchError}</div>}
        {results && results.length === 0 && <p className="muted">Nenhuma letra encontrada. Digite manualmente abaixo.</p>}
        {results && results.length > 0 && (
          <ul className="song-list">
            {results.map((r) => (
              <li key={r.id}>
                <button className="song-item" onClick={() => useResult(r)}>
                  <strong>{r.title}</strong><span className="muted">{r.artist}{r.album ? ` · ${r.album}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Field label="Letra, dividida em partes" hint="Cada parte começa com o nome entre colchetes, como [V1] ou [R], e termina com uma linha em branco.">
        <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>

      <div className="row">
        <span className="muted">Adicionar parte:</span>
        <button className="secondary" onClick={() => addPart('V')}>+ Verso</button>
        <button className="secondary" onClick={() => addPart('R')}>+ Refrão</button>
        <button className="secondary" onClick={() => addPart('P')}>+ Ponte</button>
      </div>

      <Field
        label="Ordem em que as partes aparecem"
        hint={parts.length ? `Partes disponíveis: ${parts.join(', ')}. Ex.: V1, R, V2, R` : 'Preencha a letra primeiro.'}
      >
        <input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="V1, R, V2, R" />
      </Field>

      <div className="row">
        <button onClick={handleSave} disabled={!title.trim() || parts.length === 0}>Salvar música</button>
        <button className="secondary" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
