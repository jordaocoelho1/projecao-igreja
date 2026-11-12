// Músicas: { id, title, author, ccli_number, verses: { V1: "...", R: "..." }, order: ["V1","R"] }
//
// No editor, a letra é digitada em partes:
//   [V1]
//   linha 1
//
//   [R]
//   refrão
// As partes são separadas por linha em branco, e o rótulo fica entre colchetes.

const plain = (s) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

export function parseVerses(text) {
  const verses = {};
  const blocks = String(text || '').replace(/\r/g, '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    while (lines.length && !lines[0].trim()) lines.shift();
    const match = lines[0]?.trim().match(/^\[(.+)\]$/);
    if (!match) continue;
    const label = match[1].trim();
    verses[label] = lines.slice(1).join('\n').trim();
  }
  return verses;
}

export function parseOrder(text, verses) {
  const labels = (Array.isArray(text) ? text : String(text || '').split(','))
    .map((s) => String(s).trim())
    .filter(Boolean);
  const valid = labels.filter((l) => verses[l] !== undefined);
  return valid.length ? valid : Object.keys(verses);
}

const LABEL_NAMES = { V: 'Verso', R: 'Refrão', P: 'Ponte', B: 'Ponte', PC: 'Pré-refrão', F: 'Final', I: 'Introdução', O: 'Outro' };

// Nome amigável para o rótulo: V1 → "Verso 1", R → "Refrão", PC → "Pré-refrão"
export function labelName(label) {
  const m = String(label).toUpperCase().match(/^(PC|V|R|P|B|F|I|O)(\d*)([A-Z]?)$/);
  if (!m) return label;
  return [LABEL_NAMES[m[1]], m[2], m[3]].filter(Boolean).join(' ');
}

export function songToSlides(song) {
  return song.order.map((label, i) => ({
    id: `${song.id}-${i}`,
    label: labelName(label),
    title: `${song.title} · ${labelName(label)}`,
    body: song.verses[label] || '',
  }));
}

export const emptySong = () => ({
  id: crypto.randomUUID(),
  title: '',
  author: '',
  ccli_number: '',
  verses: {},
  order: [],
});

// Letra simples (estrofes separadas por linha em branco) → partes [V1], [R]...
// Estrofes idênticas que se repetem viram o refrão.
export function lyricsToParts(text) {
  const stanzas = String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const key = (t) => t.toLowerCase().replace(/\s+/g, ' ');
  const counts = {};
  stanzas.forEach((t) => { counts[key(t)] = (counts[key(t)] || 0) + 1; });
  const labels = {};
  const verses = {};
  const order = [];
  let v = 0;
  let r = 0;
  for (const t of stanzas) {
    const k = key(t);
    if (!labels[k]) {
      if (counts[k] > 1) { r += 1; labels[k] = r === 1 ? 'R' : `R${r}`; }
      else { v += 1; labels[k] = `V${v}`; }
      verses[labels[k]] = t;
    }
    order.push(labels[k]);
  }
  const partsText = Object.entries(verses).map(([l, b]) => `[${l}]\n${b}`).join('\n\n');
  return { text: partsText, order: order.join(', ') };
}

// ---------- Importação ----------

// Arquivo .txt:
//   Título: Nome
//   Autor: Fulano
//   CCLI: 123
//   Ordem: V1, R, V2, R
//   [V1] ... (ou a letra simples, sem rótulos)
export function parseSongTxt(content, fileName = '') {
  const meta = {};
  const body = [];
  for (const line of String(content || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n')) {
    const m = line.match(/^\s*(t[íi]tulo|autor|ccli|ordem)\s*:\s*(.*)$/i);
    if (m) meta[plain(m[1])] = m[2].trim();
    else body.push(line);
  }
  let text = body.join('\n').trim();
  let orderText = meta.ordem || '';
  if (!/^\s*\[.+\]\s*$/m.test(text)) {
    const parts = lyricsToParts(text);
    text = parts.text;
    if (!orderText) orderText = parts.order;
  }
  const verses = parseVerses(text);
  if (!Object.keys(verses).length) throw new Error('arquivo sem letra');
  return {
    ...emptySong(),
    title: meta.titulo || fileName.replace(/\.[^.]+$/, '') || 'Sem título',
    author: meta.autor || '',
    ccli_number: meta.ccli || '',
    verses,
    order: parseOrder(orderText, verses),
  };
}

// Rótulo OpenLyrics (v1, c, c2, b, p, e...) → rótulo do app (V1, R, R2, P, PC, F...)
function openLyricsLabel(name) {
  const m = String(name).toLowerCase().match(/^([a-z]+?)(\d*)([a-z]?)$/);
  if (!m) return name.toUpperCase();
  const map = { v: 'V', c: 'R', b: 'P', p: 'PC', e: 'F', i: 'I', o: 'O' };
  const prefix = map[m[1]] || m[1].toUpperCase();
  let num = m[2];
  if (prefix === 'R' && num === '1') num = '';
  return `${prefix}${num}${m[3].toUpperCase()}`;
}

// Texto de um elemento <lines>: <br/> vira quebra de linha; comentários são ignorados
function linesText(node) {
  let out = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) out += c.nodeValue.replace(/\s+/g, ' ');
    else if (c.nodeType === 1) {
      const tag = c.localName;
      if (tag === 'br') out += '\n';
      else if (tag !== 'comment') out += linesText(c);
    }
  }
  return out;
}

const cleanLines = (t) => t.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).join('\n').trim();

// Arquivo OpenLyrics (.xml), o formato usado pelo OpenLP
export function parseOpenLyrics(xml, fileName = '', Parser = globalThis.DOMParser) {
  const doc = new Parser().parseFromString(String(xml).replace(/^﻿/, ''), 'application/xml');
  if (doc.getElementsByTagName('parsererror').length) throw new Error('XML inválido');
  const all = (tag, root = doc) => Array.from(root.getElementsByTagName(tag));
  if (!all('lyrics').length) throw new Error('não é um arquivo OpenLyrics');

  const title = all('title')[0]?.textContent.trim();
  const author = all('author').map((a) => a.textContent.trim()).filter(Boolean).join(', ');
  const ccli = all('ccliNo')[0]?.textContent.trim() || '';

  const verses = {};
  const labelOf = {};
  for (const v of all('verse')) {
    const name = (v.getAttribute('name') || '').toLowerCase();
    if (!name || labelOf[name]) continue; // mesma parte em outro idioma: fica a primeira
    const text = cleanLines(all('lines', v).map(linesText).join('\n'));
    if (!text) continue;
    const label = openLyricsLabel(name);
    labelOf[name] = label;
    verses[label] = text;
  }
  if (!Object.keys(verses).length) throw new Error('música sem letra');

  const orderNames = (all('verseOrder')[0]?.textContent || '').trim().split(/\s+/).filter(Boolean);
  const order = orderNames.map((n) => labelOf[n.toLowerCase()]).filter(Boolean);

  return {
    ...emptySong(),
    title: title || fileName.replace(/\.[^.]+$/, '') || 'Sem título',
    author,
    ccli_number: ccli,
    verses,
    order: order.length ? order : Object.keys(verses),
  };
}

// Converte arquivos escolhidos ({ name, ext, content }) em músicas
export function parseSongFiles(files, Parser) {
  const songs = [];
  const errors = [];
  for (const f of files) {
    try {
      if (f.ext === '.json') {
        const data = JSON.parse(String(f.content).replace(/^﻿/, ''));
        const list = Array.isArray(data) ? data : data.songs;
        if (!Array.isArray(list)) throw new Error('não é um backup de músicas');
        for (const s of list) {
          if (s && s.title && s.verses && typeof s.verses === 'object') {
            songs.push({ ...emptySong(), ...s, order: parseOrder(s.order, s.verses) });
          }
        }
      } else if (f.ext === '.xml') {
        songs.push(parseOpenLyrics(f.content, f.name, Parser));
      } else {
        songs.push(parseSongTxt(f.content, f.name));
      }
    } catch (e) {
      errors.push(`${f.name}: ${e.message}`);
    }
  }
  return { songs, errors };
}

// Junta músicas novas às existentes, ignorando títulos repetidos
export function mergeSongs(existing, incoming) {
  const titles = new Set(existing.map((s) => plain(s.title)));
  const ids = new Set(existing.map((s) => s.id));
  const result = [...existing];
  let added = 0;
  let skipped = 0;
  for (const s of incoming) {
    const t = plain(s.title);
    if (!t || titles.has(t)) { skipped += 1; continue; }
    const song = ids.has(s.id) || !s.id ? { ...s, id: crypto.randomUUID() } : s;
    titles.add(t);
    ids.add(song.id);
    result.push(song);
    added += 1;
  }
  return { songs: result, added, skipped };
}
