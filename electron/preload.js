const { contextBridge, ipcRenderer } = require('electron');

// Expõe apenas as funções necessárias para a interface React
contextBridge.exposeInMainWorld('api', {
  loadSongs: () => ipcRenderer.invoke('songs:load'),
  saveSongs: (songs) => ipcRenderer.invoke('songs:save', songs),
  listBibles: () => ipcRenderer.invoke('bible:list'),
  loadBible: (file) => ipcRenderer.invoke('bible:load', file),
  openProjection: () => ipcRenderer.invoke('projection:open'),
  showSlide: (slide) => ipcRenderer.send('projection:show', slide),
  clearSlide: () => ipcRenderer.send('projection:clear'),
  onSlide: (callback) => {
    const listener = (_e, slide) => callback(slide);
    ipcRenderer.on('projection:slide', listener);
    return () => ipcRenderer.removeListener('projection:slide', listener);
  },
});
