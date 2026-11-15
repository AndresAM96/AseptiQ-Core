let _modalCounter = 0;
const _modalStack = [];

/**
 * Abre un modal genérico.
 * @param {Object} opts
 * @param {string} opts.title - Título del modal.
 * @param {string} opts.body - HTML del cuerpo.
 * @param {string} [opts.footer] - HTML del pie (botones).
 * @param {Function} [opts.onOpen] - Callback al abrir (recibe el contenedor).
 * @param {Function} [opts.onClose] - Callback al cerrar.
 * @param {'sm'|'md'|'lg'} [opts.size='md'] - Tamaño del modal.
 */
export function abrirModal(opts) {
  const id = `modal_${++_modalCounter}`;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = id;

  // Tamaños
  const maxWidths = { sm: '480px', md: '640px', lg: '920px' };
  const maxW = maxWidths[opts.size] || maxWidths.md;

  overlay.innerHTML = `
    <div class="modal-box" style="max-width: ${maxW};">
      <div class="modal-header" style="display: flex; justify-content: space-between; align-items: flex-start; padding: 22px 24px 16px; border-bottom: 1px solid var(--border);">
        <div>
          <h3 style="margin: 0; font-size: 16px; font-weight: 600;">${opts.title}</h3>
          ${opts.subtitle ? `<p style="margin: 4px 0 0; font-size: 13px; color: var(--text-secondary);">${opts.subtitle}</p>` : ''}
        </div>
        <button class="btn-close" style="background: transparent; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer;">&times;</button>
      </div>
      <div class="modal-body" style="padding: 24px; overflow-y: auto; max-height: 70vh;">
        ${opts.body}
      </div>
      ${opts.footer ? `<div class="modal-footer" style="padding: 14px 24px 20px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--border);">${opts.footer}</div>` : ''}
    </div>
  `;

  // Estilos base del modal
  Object.assign(overlay.style, {
    position: 'fixed', inset: 0, background: 'rgba(8,10,14,.6)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 + _modalCounter, padding: '24px',
    opacity: '0', transition: 'opacity 0.2s ease'
  });

  const box = overlay.querySelector('.modal-box');
  Object.assign(box.style, {
    background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px',
    width: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,.5)',
    transform: 'translateY(20px) scale(0.98)', transition: 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)'
  });

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.transform = 'translateY(0) scale(1)';
  });

  const close = () => {
    overlay.style.opacity = '0';
    box.style.transform = 'translateY(20px) scale(0.98)';
    setTimeout(() => {
      overlay.remove();
      _modalStack.splice(_modalStack.indexOf(id), 1);
      if (opts.onClose) opts.onClose();
    }, 200);
  };

  overlay.querySelector('.btn-close').onclick = close;

  // Guardar en el stack
  _modalStack.push({ id, close });

  // Escape para cerrar el modal superior
  const handleEsc = (e) => {
    if (e.key === 'Escape' && _modalStack[_modalStack.length - 1].id === id) {
      close();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);

  if (opts.onOpen) opts.onOpen(overlay);
  return id;
}

/**
 * Cierra el modal superior.
 */
export function cerrarModal() {
  if (_modalStack.length > 0) {
    _modalStack[_modalStack.length - 1].close();
  }
}