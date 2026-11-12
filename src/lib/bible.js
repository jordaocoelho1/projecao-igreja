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
