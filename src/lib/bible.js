// Carregamento e busca de versículos.
//
// Formato de cada livro: { id, name, chapters: [[ "versículo 1", "versículo 2", ... ], ...] }
// Uma tradução é { name, books: [...] }.
// Se um arquivo licenciado vier com outra estrutura, ajuste só a função adaptBible().

export const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Ponto de adaptação: valida a tradução e converte para o formato interno.
export function adaptBible(translation) {
  if (!translation || !Array.isArray(translation.books)) {
    throw new Error('Tradução fora do formato esperado (faltou "books").');
  }
  for (const book of translation.books) {
    if (!book.name || !Array.isArray(book.chapters)) {
      throw new Error(`Livro fora do formato esperado: ${book.id || book.name || '?'}`);
    }
  }
  return translation;
}

export function findBook(bible, query) {
  const q = normalize(query);
  return bible.books.find((b) => normalize(b.name) === q || normalize(b.id) === q);
}

// Retorna [{ reference, text }] para o intervalo pedido.
export function getVerses(bible, bookQuery, chapter, fromVerse, toVerse = fromVerse) {
  const book = findBook(bible, bookQuery);
  if (!book) throw new Error(`Livro não encontrado: ${bookQuery}`);
  if (chapter < 1 || chapter > book.chapters.length) {
    throw new Error(`${book.name} tem ${book.chapters.length} capítulos.`);
  }
  const verses = book.chapters[chapter - 1];
  if (fromVerse < 1 || toVerse > verses.length || fromVerse > toVerse) {
    throw new Error(`${book.name} ${chapter} tem ${verses.length} versículos.`);
  }
  const out = [];
  for (let v = fromVerse; v <= toVerse; v++) {
    out.push({ reference: `${book.name} ${chapter}:${v}`, text: verses[v - 1] });
  }
  return out;
}

// Um slide com `perSlide` versículos a partir do versículo n
export function verseSlide(book, chapter, n, perSlide = 1) {
  const list = book.chapters[chapter - 1] || [];
  const group = list.slice(n - 1, n - 1 + perSlide);
  const last = n + group.length - 1;
  return {
    id: `b-${book.id}-${chapter}-${n}-${group.length}`,
    title: `${book.name} ${chapter}:${group.length > 1 ? `${n}-${last}` : n}`,
    body: group.join(' '),
    ref: { bookId: book.id, chapter, verse: n, perSlide },
  };
}

// Slides de um trecho: { bookId, chapter, from, to (opcional = fim do capítulo), perSlide }
export function rangeSlides(bible, { bookId, chapter, from = 1, to, perSlide = 1 }) {
  const book = bible?.books.find((b) => b.id === bookId);
  if (!book) return [];
  const list = book.chapters[chapter - 1] || [];
  const end = Math.min(to || list.length, list.length);
  const out = [];
  for (let n = from; n <= end; n += perSlide) {
    out.push(verseSlide(book, chapter, n, Math.min(perSlide, end - n + 1)));
  }
  return out;
}

// Abreviações em português que diferem do id usado nos arquivos (ids no estilo gn, jud, 1kgs...)
const PT_ABBREV = {
  jz: 'jud', '1rs': '1kgs', '2rs': '2kgs', '1cr': '1ch', '2cr': '2ch', ed: 'ezr',
  sl: 'ps', pv: 'prv', ct: 'so', os: 'ho', mq: 'mi', hc: 'hk', sf: 'zp', ag: 'hg',
  mc: 'mk', lc: 'lk', at: 'act', ef: 'eph', fp: 'ph', fm: 'phm', tg: 'jm', ap: 're',
};

// Procura o livro pelo texto digitado: nome exato (com acento, para separar "Jó" de "João"),
// abreviação em português, id do arquivo, nome sem acento e início do nome.
export function findBookByText(bible, text) {
  const raw = String(text).trim().toLowerCase();
  const q = normalize(text);
  const compact = q.replace(/ /g, '');

  const byRawName = bible.books.find((b) => b.name.toLowerCase() === raw);
  if (byRawName) return byRawName;

  const abbrevId = PT_ABBREV[compact];
  if (abbrevId) {
    const b = bible.books.find((x) => x.id === abbrevId);
    if (b) return b;
  }

  const byId = bible.books.find((b) => normalize(b.id) === compact);
  if (byId) return byId;

  const byName = bible.books.filter((b) => normalize(b.name) === q);
  if (byName.length === 1) return byName[0];

  const starts = bible.books.filter((b) => normalize(b.name).startsWith(q));
  return starts.length === 1 ? starts[0] : null;
}

// Interpreta "Jo 3:16", "joao 3 16", "1 co 13" ou "Jo 3:16-18".
// Retorna { bookId, chapter, verse, to } — `to` é null quando não foi pedido intervalo
// e `verse` só vem preenchido de verdade quando foi digitado (senão é 1 e hasVerse = false).
export function parseReference(bible, text) {
  const match = String(text || '')
    .trim()
    .match(/^(.+?)\s+(\d+)(?:\s*[:.,\s]\s*(\d+)(?:\s*-\s*(\d+))?)?$/);
  if (!match) throw new Error('Use o formato "Livro capítulo:versículo", por exemplo Jo 3:16.');

  const found = findBookByText(bible, match[1]);
  if (!found) throw new Error(`Não encontrei o livro "${match[1]}".`);

  const chapter = Number(match[2]);
  if (chapter < 1 || chapter > found.chapters.length) {
    throw new Error(`${found.name} tem ${found.chapters.length} capítulos.`);
  }
  const count = found.chapters[chapter - 1].length;
  const verse = match[3] ? Number(match[3]) : 1;
  if (verse < 1 || verse > count) {
    throw new Error(`${found.name} ${chapter} tem ${count} versículos.`);
  }
  let to = null;
  if (match[4]) {
    to = Number(match[4]);
    if (to < verse || to > count) throw new Error(`Intervalo inválido: ${found.name} ${chapter} tem ${count} versículos.`);
  }
  return { bookId: found.id, chapter, verse, to, hasVerse: Boolean(match[3]) };
}

// Texto curto para mostrar um trecho: "João 3:16-18" ou "Salmos 23"
export function rangeLabel(bible, { bookId, chapter, from, to }) {
  const book = bible?.books.find((b) => b.id === bookId);
  const name = book ? book.name : bookId;
  if (!from && !to) return `${name} ${chapter}`;
  return `${name} ${chapter}:${from}${to && to > from ? `-${to}` : ''}`;
}
