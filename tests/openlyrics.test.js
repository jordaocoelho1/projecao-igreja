// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseOpenLyrics } from '../src/lib/songs.js';

// Exemplo no formato OpenLyrics 0.8/0.9 (o que o OpenLP exporta), com texto inventado
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<song xmlns="http://openlyrics.info/namespace/2009/song" version="0.8">
  <properties>
    <titles><title>Canção de Teste</title></titles>
    <authors><author>Fulano</author><author>Beltrana</author></authors>
    <ccliNo>12345</ccliNo>
    <verseOrder>v1 c v2 c b</verseOrder>
  </properties>
  <lyrics>
    <verse name="v1"><lines>Primeira linha<br/>Segunda <chord name="G"/>linha</lines></verse>
    <verse name="c"><lines>Refrão aqui<br/>
      outra linha</lines></verse>
    <verse name="v2"><lines>Verso dois</lines><lines>continua<comment>baixo</comment></lines></verse>
    <verse name="b"><lines>Ponte</lines></verse>
  </lyrics>
</song>`;

describe('OpenLyrics', () => {
  it('lê título, autores, CCLI, partes e ordem', () => {
    const s = parseOpenLyrics(xml, 'teste.xml');
    expect(s.title).toBe('Canção de Teste');
    expect(s.author).toBe('Fulano, Beltrana');
    expect(s.ccli_number).toBe('12345');
    expect(s.verses).toEqual({
      V1: 'Primeira linha\nSegunda linha',
      R: 'Refrão aqui\noutra linha',
      V2: 'Verso dois\ncontinua',
      P: 'Ponte',
    });
    expect(s.order).toEqual(['V1', 'R', 'V2', 'R', 'P']);
  });
  it('recusa XML que não é OpenLyrics', () => {
    expect(() => parseOpenLyrics('<a/>')).toThrow('OpenLyrics');
    expect(() => parseOpenLyrics('<a')).toThrow();
  });
});
