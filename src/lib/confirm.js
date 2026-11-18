// Caixa de confirmação própria. O confirm() nativo do navegador, no Electron/Windows,
// deixa a janela sem foco de teclado e os campos param de aceitar digitação.
let listener = null;

export function setConfirmListener(fn) {
  listener = fn;
}

// Uso: if (await ask('Excluir?', { danger: true, okLabel: 'Excluir' })) { ... }
export function ask(message, options = {}) {
  return new Promise((resolve) => {
    if (!listener) return resolve(window.confirm(message));
    listener({ message, ...options, resolve });
  });
}
