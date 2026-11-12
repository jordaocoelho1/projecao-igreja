const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;
let controlWin = null;
let projectionWin = null;

// Músicas ficam na pasta de dados do usuário, para persistir entre execuções
const songsFile = () => path.join(app.getPath('userData'), 'songs.json');
// Bíblias: na pasta de dados do usuário (importadas) ou embutidas no app
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

function sendToControl(channel, payload) {
  if (controlWin && !controlWin.isDestroyed()) controlWin.webContents.send(channel, payload);
}

function createControlWindow() {
  controlWin = new BrowserWindow({
    width: 1240,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'Projeção Igreja',
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  controlWin.setMenuBarVisibility(false);
  loadUrl(controlWin);
  controlWin.on('closed', () => {
    controlWin = null;
    if (projectionWin) projectionWin.close();
  });
}

// Abre a janela de projeção: sem barra de menus, em tela cheia no monitor externo
function openProjection() {
  if (projectionWin) {
    projectionWin.focus();
    return;
  }
  const primary = screen.getPrimaryDisplay();
  const external = screen.getAllDisplays().find((d) => d.id !== primary.id);
  const target = external || primary;

  const options = {
    backgroundColor: '#000000',
    title: 'Projeção',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  };

  if (external) {
    // Monitor externo: tela cheia, sem moldura
    Object.assign(options, {
      x: target.bounds.x,
      y: target.bounds.y,
      width: target.bounds.width,
      height: target.bounds.height,
      frame: false,
      fullscreen: true,
    });
  } else {
    // Só um monitor: janela comum para teste (F11 alterna tela cheia)
    Object.assign(options, { width: 1024, height: 576, frame: true });
  }

  projectionWin = new BrowserWindow(options);
  projectionWin.setMenuBarVisibility(false);
  loadUrl(projectionWin, '#projection');

  projectionWin.webContents.on('before-input-event', (_e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') {
      projectionWin.setFullScreen(!projectionWin.isFullScreen());
    }
  });

  projectionWin.on('closed', () => {
    projectionWin = null;
    sendToControl('projection:status', false);
  });
  sendToControl('projection:status', true);
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
  // Pasta: um arquivo por livro, na ordem dos nomes (ex.: 01-gn.json, 02-ex.json)
  const books = fs.readdirSync(target)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(target, f), 'utf8').replace(/^﻿/, '')));
  return { name: path.basename(target), books };
});

// Busca de letras no LRCLIB (API pública). Feita no processo principal para evitar bloqueio de CORS.
ipcMain.handle('lyrics:search', async (_e, query) => {
  const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'projecao-igreja/0.1.0' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Serviço de letras respondeu ${res.status}`);
  const list = await res.json();
  return list
    .filter((r) => r.plainLyrics)
    .slice(0, 15)
    .map((r) => ({ id: r.id, title: r.trackName, artist: r.artistName, album: r.albumName, lyrics: r.plainLyrics }));
});

ipcMain.handle('projection:open', () => {
  openProjection();
  return true;
});

ipcMain.handle('projection:close', () => {
  if (projectionWin) projectionWin.close();
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
  // Remove o menu padrão (Arquivo, Editar, Exibir...) de todas as janelas
  Menu.setApplicationMenu(null);
  createControlWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createControlWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
