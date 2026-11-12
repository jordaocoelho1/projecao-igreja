import { describe, it, expect } from 'vitest';
import { parseReference, rangeSlides, verseSlide, rangeLabel, adaptBible } from '../src/lib/bible.js';

// Bíblia de teste, com texto inventado
const bible = adaptBible({
  name: 'teste',
  books: [
    { id: 'job', name: 'Jó', chapters: [['j1', 'j2']] },
    { id: 'ps', name: 'Salmos', chapters: [['s1'], ['s2a', 's2b', 's2c']] },
    { id: 'jo', name: 'João', chapters: [['a'], ['b'], ['c1', 'c2', 'c3', 'c4', 'c5']] },
    { id: '1co', name: '1 Coríntios', chapters: [['x1', 'x2']] },
  ],
});

describe('parseReference', () => {
  it('separa Jó de João', () => {
    expect(parseReference(bible, 'Jo 3:2').bookId).toBe('jo');
    expect(parseReference(bible, 'Jó 1:1').bookId).toBe('job');
  });
  it('aceita abreviações em português e espaços', () => {
    expect(parseReference(bible, 'Sl 2:1').bookId).toBe('ps');
    expect(parseReference(bible, '1 Co 1').bookId).toBe('1co');
    expect(parseReference(bible, 'joao 3 4')).toMatchObject({ chapter: 3, verse: 4, hasVerse: true });
  });
  it('lê intervalos', () => {
    expect(parseReference(bible, 'Jo 3:2-4')).toMatchObject({ verse: 2, to: 4 });
  });
  it('capítulo sem versículo', () => {
    expect(parseReference(bible, 'Sl 2')).toMatchObject({ chapter: 2, verse: 1, hasVerse: false, to: null });
  });
  it('dá erros claros', () => {
    expect(() => parseReference(bible, 'xyz 1:1')).toThrow('Não encontrei');
    expect(() => parseReference(bible, 'Jo 9:1')).toThrow('3 capítulos');
    expect(() => parseReference(bible, 'Jo 3:9')).toThrow('5 versículos');
    expect(() => parseReference(bible, 'Jo 3:4-2')).toThrow('Intervalo');
    expect(() => parseReference(bible, 'Jo')).toThrow('formato');
  });
});

describe('slides', () => {
  it('agrupa versículos por slide', () => {
    const s = verseSlide(bible.books[2], 3, 2, 2);
    expect(s.title).toBe('João 3:2-3');
    expect(s.body).toBe('c2 c3');
  });
  it('trecho completo do capítulo e trecho parcial', () => {
    expect(rangeSlides(bible, { bookId: 'ps', chapter: 2 })).toHaveLength(3);
    const part = rangeSlides(bible, { bookId: 'jo', chapter: 3, from: 2, to: 5, perSlide: 3 });
    expect(part.map((x) => x.title)).toEqual(['João 3:2-4', 'João 3:5']);
  });
  it('rótulo do trecho', () => {
    expect(rangeLabel(bible, { bookId: 'jo', chapter: 3, from: 2, to: 4 })).toBe('João 3:2-4');
    expect(rangeLabel(bible, { bookId: 'ps', chapter: 2, from: 1, to: null })).toBe('Salmos 2:1');
  });
});
