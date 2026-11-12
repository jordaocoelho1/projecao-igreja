// Converte o texto digitado no cadastro em { verses, order }.
//
// Formato do texto:
//   [V1]
//   linha 1
//   linha 2
//
//   [R]
//   refrão linha 1
//
// As partes são separadas por linha em branco, e o rótulo fica entre colchetes.

export function parseVerses(text) {
  const verses = {};
  const blocks = String(text || '').split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trimEnd());
    const match = lines[0]?.match(/^\[(.+)\]$/);
    if (!match) continue;
    const label = match[1].trim();
    verses[label] = lines.slice(1).join('\n').trim();
  }
  return verses;
}

export function parseOrder(text, verses) {
  const labels = String(text || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Se não informar a ordem, usa a ordem em que as partes aparecem
  const valid = labels.filter((l) => verses[l] !== undefined);
  return valid.length ? valid : Object.keys(verses);
}

// Nomes amigáveis para os rótulos mais comuns
export function labelName(label) {
  const l = String(label).toUpperCase();
  if (l === 'R') return 'Refrão';
  if (l.startsWith('R') && /^R\d+$/.test(l)) return `Refrão ${l.slice(1)}`;
  if (/^V\d+$/.test(l)) return `Verso ${l.slice(1)}`;
  if (l === 'P' || l === 'B') return 'Ponte';
  return label;
}

// Gera a lista de slides da música, na ordem definida
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

// Converte letra simples (estrofes separadas por linha em branco) em partes [V1], [R]...
// Estrofes idênticas que se repetem viram o refrão.
export function lyricsToParts(plain) {
  const stanzas = String(plain || '').replace(/\r/g, '').split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
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
  const text = Object.entries(verses).map(([l, b]) => `[${l}]\n${b}`).join('\n\n');
  return { text, order: order.join(', ') };
}
