// Temas de exibição dos slides
export const THEMES = {
  classico: { name: 'Clássico', background: '#000000', text: '#ffffff', title: '#93c5fd', overlay: '0,0,0' },
  azul: { name: 'Azul', background: 'linear-gradient(160deg,#0b1d3a,#1d4ed8)', text: '#ffffff', title: '#bfdbfe', overlay: '0,0,0' },
  vinho: { name: 'Vinho', background: 'linear-gradient(160deg,#2a0a14,#7f1d3a)', text: '#fff7ed', title: '#fda4af', overlay: '0,0,0' },
  floresta: { name: 'Floresta', background: 'linear-gradient(160deg,#052e1b,#166534)', text: '#f0fdf4', title: '#86efac', overlay: '0,0,0' },
  claro: { name: 'Claro', background: '#f8fafc', text: '#0f172a', title: '#1d4ed8', overlay: '255,255,255' },
};

export const FONTS = {
  sans: { name: 'Sem serifa (moderna)', css: "'Segoe UI', Arial, sans-serif" },
  serif: { name: 'Com serifa (clássica)', css: "Georgia, 'Times New Roman', serif" },
};

export const DEFAULT_SETTINGS = {
  idleMode: 'black', // black | wallpaper | image
  idleImage: null,
  themeId: 'classico',
  fontFamily: 'sans',
  showTitle: true,
  slideBgImage: null,
  overlay: 0.55,
};
