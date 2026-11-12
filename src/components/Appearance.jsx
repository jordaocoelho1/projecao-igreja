import Field from './Field.jsx';
import SlideView from './SlideView.jsx';
import { THEMES, FONTS } from '../lib/themes.js';

const SAMPLE = { body: 'Texto de exemplo do versículo\nou da letra da música', title: 'Livro 1:1' };

// Escolha da tela de descanso e do visual dos slides
export default function Appearance({ settings, media, onChange }) {
  async function pick(field) {
    const file = await window.api.pickImage();
    if (file) onChange({ [field]: file, ...(field === 'idleImage' ? { idleMode: 'image' } : {}) });
  }

  return (
    <div className="stack">
      <div className="panel stack">
        <h2>Tela de descanso</h2>
        <p className="hint">O que aparece na projeção quando não há versículo nem música na tela.</p>
        <div className="appearance-grid">
          <div className="stack">
            <label className="radio"><input type="radio" checked={settings.idleMode === 'black'} onChange={() => onChange({ idleMode: 'black' })} /> Tela preta</label>
            <label className="radio"><input type="radio" checked={settings.idleMode === 'wallpaper'} onChange={() => onChange({ idleMode: 'wallpaper' })} /> Papel de parede do computador <span className="muted">(Windows)</span></label>
            <label className="radio"><input type="radio" checked={settings.idleMode === 'image'} onChange={() => onChange({ idleMode: 'image' })} disabled={!settings.idleImage} /> Imagem escolhida</label>
            <div className="row"><button className="secondary" onClick={() => pick('idleImage')}>Escolher imagem...</button></div>
            {settings.idleMode === 'wallpaper' && !media.idleUrl && <div className="alert">Não encontrei o papel de parede deste computador. Escolha uma imagem.</div>}
          </div>
          <div className="mini"><SlideView slide={null} settings={settings} media={media} /></div>
        </div>
      </div>

      <div className="panel stack">
        <h2>Visual dos slides</h2>
        <div className="themes">
          {Object.entries(THEMES).map(([id, t]) => (
            <button key={id} className={`theme-card ${settings.themeId === id ? 'active' : ''}`} onClick={() => onChange({ themeId: id })}>
              <span className="theme-swatch" style={{ background: t.background, color: t.text }}>Aa</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
        <div className="grid-3">
          <Field label="Tipo de letra">
            <select value={settings.fontFamily} onChange={(e) => onChange({ fontFamily: e.target.value })}>
              {Object.entries(FONTS).map(([id, f]) => <option key={id} value={id}>{f.name}</option>)}
            </select>
          </Field>
          <Field label="Referência / título do slide">
            <select value={settings.showTitle ? 'sim' : 'nao'} onChange={(e) => onChange({ showTitle: e.target.value === 'sim' })}>
              <option value="sim">Mostrar (ex.: João 3:16)</option>
              <option value="nao">Esconder</option>
            </select>
          </Field>
          <Field label="Imagem de fundo dos slides">
            <div className="row">
              <button className="secondary" onClick={() => pick('slideBgImage')}>Escolher...</button>
              {settings.slideBgImage && <button className="secondary" onClick={() => onChange({ slideBgImage: null })}>Remover</button>}
            </div>
          </Field>
        </div>
        {settings.slideBgImage && (
          <Field label={`Escurecer a imagem para a letra ficar legível: ${Math.round(settings.overlay * 100)}%`}>
            <input type="range" min="0" max="0.9" step="0.05" value={settings.overlay} onChange={(e) => onChange({ overlay: Number(e.target.value) })} />
          </Field>
        )}
        <div className="mini wide"><SlideView slide={SAMPLE} settings={settings} media={media} /></div>
      </div>
    </div>
  );
}
