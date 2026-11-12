# Projeção Igreja

Programa para projetar versículos, letras de músicas, avisos e imagens no culto. React + Electron, para Windows.

## Usar

- **Culto:** monte a ordem do culto (músicas, leituras, avisos, imagens) e percorra tudo com as setas ← →.
- **Bíblia:** escolha tradução, livro e capítulo e clique no versículo. Favoritos e recentes ficam na lateral.
- **Músicas:** cadastro, busca, importação (TXT, OpenLyrics/OpenLP `.xml`, backup `.json`) e backup.
- **Aparência:** tela de descanso, temas, fonte e imagem de fundo.

Atalhos: `←` `→` avançar/voltar, `Esc` limpar a tela, `B` tela preta, `F` congelar a tela.

### Formato TXT para importar músicas

```
Título: Nome da música
Autor: Fulano
CCLI: 1234567
Ordem: V1, R, V2, R

[V1]
linha 1
linha 2

[R]
refrão
```

Sem os rótulos `[V1]`, `[R]`, o programa divide a letra pelas linhas em branco e transforma estrofes repetidas em refrão.

## Desenvolver

Use o Node 22 LTS.

```
npm install
npm start      # compila e abre o programa
npm test       # testes
npm run dist   # gera o instalador em release/
```

Se o Electron não abrir ("Electron failed to install correctly"), rode `node node_modules/electron/install.js`.

## Instalador

Cada push na `main` gera o instalador em **Actions → Build Windows → Artifacts**.
Para publicar uma versão com link fixo, crie uma tag: `git tag v0.2.0 && git push origin v0.2.0`. O instalador aparece em **Releases**.

## Bíblias

Veja `data/bible/README.md`. Só inclua traduções cuja licença permita o uso.
