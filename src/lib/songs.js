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
