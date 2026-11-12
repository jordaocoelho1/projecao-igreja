// Carregamento e busca de versículos.
//
// Formato de cada livro (um arquivo por livro, dentro da pasta da tradução):
// { id, name, chapters: [[ "versículo 1", "versículo 2", ... ], ...] }
//
// O app junta os livros da pasta numa tradução: { name, books: [...] }.
// Se um arquivo licenciado vier com outra estrutura, ajuste só a função adaptBible().

const normalize = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

// Ponto de adaptação: valida a tradução e converte para o formato interno.
// Se a fonte licenciada tiver outra estrutura, faça a conversão aqui.
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
  return bible.books.find(
    (b) => normalize(b.name) === q || normalize(b.id) === q
  );
}

// Retorna uma lista de { reference, text } para o intervalo pedido.
// Ex.: getVerses(bible, 'João', 3, 16)      -> [{ reference: 'João 3:16', ... }]
//      getVerses(bible, 'João', 3, 16, 18)  -> três versículos
export function getVerses(bible, bookQuery, chapter, fromVerse, toVerse = fromVerse) {
  const book = findBook(bible, bookQuery);
  if (!book) throw new Error(`Livro não encontrado: ${bookQuery}`);

  const chapters = book.chapters;
  if (chapter < 1 || chapter > chapters.length) {
    throw new Error(`${book.name} tem ${chapters.length} capítulos.`);
  }
  const verses = chapters[chapter - 1];
  if (fromVerse < 1 || toVerse > verses.length || fromVerse > toVerse) {
    throw new Error(`${book.name} ${chapter} tem ${verses.length} versículos.`);
  }

  const out = [];
  for (let v = fromVerse; v <= toVerse; v++) {
    out.push({
      reference: `${book.name} ${chapter}:${v}`,
      text: verses[v - 1],
    });
  }
  return out;
}

// Quebra a lista em slides de no máximo `perSlide` versículos, para caber na tela
export function versesToSlides(verses, perSlide = 2) {
  const slides = [];
  for (let i = 0; i < verses.length; i += perSlide) {
    const group = verses.slice(i, i + perSlide);
    slides.push({
      title: group.length > 1
        ? `${group[0].reference} – ${group[group.length - 1].reference.split(' ').pop()}`
        : group[0].reference,
      body: group.map((v) => v.text).join(' '),
    });
  }
  return slides;
}

// Abreviações em português que diferem do id usado nos arquivos (ids no estilo gn, jud, 1kgs...)
const PT_ABBREV = {
  jz: 'jud', '1rs': '1kgs', '2rs': '2kgs', '1cr': '1ch', '2cr': '2ch', ed: 'ezr',
  sl: 'ps', pv: 'prv', ct: 'so', os: 'ho', mq: 'mi', hc: 'hk', sf: 'zp', ag: 'hg',
  mc: 'mk', lc: 'lk', at: 'act', ef: 'eph', fp: 'ph', fm: 'phm', tg: 'jm', ap: 're',
};

// Procura o livro pelo texto digitado, na ordem: nome exato (com acento, para separar
// "Jó" de "João"), abreviação em português, id do arquivo, nome sem acento e início do nome.
function findBookByText(bible, text) {
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

// Interpreta uma referência digitada, como "Jo 3:16", "joao 3 16" ou "1 co 13".
// Retorna { bookId, chapter, verse } ou lança erro com mensagem clara.
export function parseReference(bible, text) {
  const match = String(text || '')
    .trim()
    .match(/^(.+?)\s+(\d+)(?:\s*[:.,\s]\s*(\d+))?$/);
  if (!match) throw new Error('Use o formato "Livro capítulo:versículo", por exemplo Jo 3:16.');

  const found = findBookByText(bible, match[1]);
  if (!found) throw new Error(`Não encontrei o livro "${match[1]}".`);

  const chapter = Number(match[2]);
  if (chapter < 1 || chapter > found.chapters.length) {
    throw new Error(`${found.name} tem ${found.chapters.length} capítulos.`);
  }
  const verse = match[3] ? Number(match[3]) : 1;
  if (verse < 1 || verse > found.chapters[chapter - 1].length) {
    throw new Error(`${found.name} ${chapter} tem ${found.chapters[chapter - 1].length} versículos.`);
  }
  return { bookId: found.id, chapter, verse };
}
