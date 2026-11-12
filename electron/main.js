const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let controlWin = null;
let projectionWin = null;

// Músicas ficam na pasta de dados do usuário, para persistir entre execuções
const songsFile = () => path.join(app.getPath('userData'), 'songs.json');
// Bíblias: arquivos JSON na pasta de dados do usuário (importados) ou embutidos no app
const userBibleDir = () => path.join(app.getPath('userData'), 'bible');
const bundledBibleDir = () =>
  app.isPackaged
    ? path.join(process.resourcesPath, 'bible')
    : path.join(__dirname, '..', 'data', 'bible');

function loadUrl(win, hash = '') {
  if (isDev) {
    win.loadURL(`http://localhost:5173/${hash}`);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { hash: hash.replace('#', '') });
  }
}

function createControlWindow() {
  controlWin = new BrowserWindow({
    width: 1100,
    height: 720,
    title: 'Projeção Igreja: painel',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  loadUrl(controlWin);
  controlWin.on('closed', () => {
    controlWin = null;
    if (projectionWin) projectionWin.close();
  });
}

// Abre a janela de projeção no monitor externo, se existir, senão no principal
function openProjection() {
  if (projectionWin) {
    projectionWin.focus();
    return;
  }
  const displays = screen.getAllDisplays();
  const primary = screen.getPrimaryDisplay();
  const external = displays.find((d) => d.id !== primary.id) || primary;

  projectionWin = new BrowserWindow({
    x: external.bounds.x,
    y: external.bounds.y,
    width: external.bounds.width,
    height: external.bounds.height,
    fullscreen: external.id !== primary.id,
    backgroundColor: '#000000',
    title: 'Projeção',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  loadUrl(projectionWin, '#projection');
  projectionWin.on('closed', () => {
    projectionWin = null;
  });
}

// ---------- IPC ----------

ipcMain.handle('songs:load', () => {
  if (!fs.existsSync(songsFile())) return [];
  return JSON.parse(fs.readFileSync(songsFile(), 'utf8'));
});

ipcMain.handle('songs:save', (_e, songs) => {
  fs.writeFileSync(songsFile(), JSON.stringify(songs, null, 2), 'utf8');
  return true;
});

// Uma tradução pode ser um arquivo único (com "books") ou uma pasta com um arquivo por livro
// Lista as traduções disponíveis (embutidas + importadas)
ipcMain.handle('bible:list', () => {
  const roots = [bundledBibleDir(), userBibleDir()].filter((d) => fs.existsSync(d));
  return roots.flatMap((root) =>
    fs.readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory() || (e.isFile() && e.name.endsWith('.json')))
      .map((e) => ({
        id: e.isFile() ? path.basename(e.name, '.json') : e.name,
        path: path.join(root, e.name),
      }))
  );
});

ipcMain.handle('bible:load', (_e, target) => {
  // Arquivo único: { name, books: [...] } ou só a lista de livros na raiz
  if (fs.statSync(target).isFile()) {
    // Remove o BOM que alguns editores (ex.: Bloco de Notas) gravam no início do arquivo
    const text = fs.readFileSync(target, 'utf8').replace(/^﻿/, '');
    const raw = JSON.parse(text);
    if (Array.isArray(raw)) {
      return { name: path.basename(target, '.json'), books: raw };
    }
    return raw;
  }
  // Pasta: lê um arquivo por livro, na ordem dos nomes (ex.: 01-gn.json, 02-ex.json)
  const books = fs.readdirSync(target)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(target, f), 'utf8').replace(/^﻿/, '')));
  return { name: path.basename(target), books };
});

ipcMain.handle('projection:open', () => {
  openProjection();
  return true;
});

// Envia um slide para a janela de projeção
ipcMain.on('projection:show', (_e, slide) => {
  if (projectionWin) projectionWin.webContents.send('projection:slide', slide);
});

ipcMain.on('projection:clear', () => {
  if (projectionWin) projectionWin.webContents.send('projection:slide', null);
});

app.whenReady().then(() => {
  createControlWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
