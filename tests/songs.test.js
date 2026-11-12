import { describe, it, expect } from 'vitest';
import { parseVerses, lyricsToParts, labelName, parseSongTxt, mergeSongs, songToSlides, parseSongFiles } from '../src/lib/songs.js';

describe('partes da letra', () => {
  it('lê partes com rótulo', () => {
    expect(parseVerses('[V1]\na\nb\n\n[R]\nc')).toEqual({ V1: 'a\nb', R: 'c' });
  });
  it('estrofe repetida vira refrão', () => {
    expect(lyricsToParts('a\n\nr\n\nb\n\nr').order).toBe('V1, R, V2, R');
  });
  it('nomes amigáveis', () => {
    expect(labelName('V2')).toBe('Verso 2');
    expect(labelName('R')).toBe('Refrão');
    expect(labelName('PC')).toBe('Pré-refrão');
    expect(labelName('Coro')).toBe('Coro');
  });
});

describe('importação TXT', () => {
  it('com cabeçalho e rótulos', () => {
    const s = parseSongTxt('Título: Canção\nAutor: Ana\nCCLI: 9\nOrdem: V1, R, R\n\n[V1]\nlinha\n\n[R]\nrefrão', 'x.txt');
    expect(s).toMatchObject({ title: 'Canção', author: 'Ana', ccli_number: '9', order: ['V1', 'R', 'R'] });
    expect(songToSlides(s)).toHaveLength(3);
  });
  it('letra simples usa o nome do arquivo', () => {
    const s = parseSongTxt('﻿a\r\n\r\nb', 'Minha musica.txt');
    expect(s.title).toBe('Minha musica');
    expect(s.order).toEqual(['V1', 'V2']);
  });
  it('arquivo vazio dá erro', () => {
    expect(() => parseSongTxt('Título: X', 'x.txt')).toThrow();
  });
});

describe('backup e mesclagem', () => {
  it('ignora títulos repetidos (sem diferenciar acento)', () => {
    const a = [{ id: '1', title: 'Canção', verses: {}, order: [] }];
    const r = mergeSongs(a, [{ id: '1', title: 'cancao', verses: {}, order: [] }, { id: '1', title: 'Outra', verses: {}, order: [] }]);
    expect(r.added).toBe(1);
    expect(r.skipped).toBe(1);
    expect(new Set(r.songs.map((s) => s.id)).size).toBe(2);
  });
  it('lê backup JSON e informa erros', () => {
    const files = [
      { name: 'b.json', ext: '.json', content: JSON.stringify({ songs: [{ title: 'A', verses: { V1: 'x' }, order: ['V1'] }] }) },
      { name: 'ruim.json', ext: '.json', content: '{' },
    ];
    const r = parseSongFiles(files);
    expect(r.songs).toHaveLength(1);
    expect(r.errors[0]).toMatch('ruim.json');
  });
});
