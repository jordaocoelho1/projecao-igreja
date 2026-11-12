const { contextBridge, ipcRenderer } = require('electron');

// Expõe apenas as funções necessárias para a interface React
contextBridge.exposeInMainWorld('api', {
  loadSongs: () => ipcRenderer.invoke('songs:load'),
  saveSongs: (songs) => ipcRenderer.invoke('songs:save', songs),
  listBibles: () => ipcRenderer.invoke('bible:list'),
  loadBible: (target) => ipcRenderer.invoke('bible:load', target),
  searchLyrics: (q) => ipcRenderer.invoke('lyrics:search', q),
  openProjection: () => ipcRenderer.invoke('projection:open'),
  closeProjection: () => ipcRenderer.invoke('projection:close'),
  showSlide: (slide) => ipcRenderer.send('projection:show', slide),
  clearSlide: () => ipcRenderer.send('projection:clear'),
  onSlide: (callback) => {
    const listener = (_e, slide) => callback(slide);
    ipcRenderer.on('projection:slide', listener);
    return () => ipcRenderer.removeListener('projection:slide', listener);
  },
  onProjectionStatus: (callback) => {
    const listener = (_e, open) => callback(open);
    ipcRenderer.on('projection:status', listener);
    return () => ipcRenderer.removeListener('projection:status', listener);
  },
});
