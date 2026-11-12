import { useState } from 'react';
import { parseVerses, parseOrder } from '../lib/songs.js';

// Formulário de cadastro: o usuário digita as partes separadas por linha em branco
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

  return (
    <div className="editor">
      <label>Título<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Autor<input value={author} onChange={(e) => setAuthor(e.target.value)} /></label>
      <label>Nº CCLI<input value={ccli} onChange={(e) => setCcli(e.target.value)} /></label>
      <label>
        Partes (use [V1], [R], separando por linha em branco)
        <textarea rows={14} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <label>
        Ordem de exibição (ex.: V1, R, V2, R)
        <input value={order} onChange={(e) => setOrder(e.target.value)} />
      </label>
      <div className="row">
        <button onClick={handleSave} disabled={!title.trim()}>Salvar</button>
        <button className="ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}
