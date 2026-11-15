/**
 * Muestra una notificación flotante (Toast).
 * @param {string} msg - Mensaje a mostrar.
 * @param {'success'|'error'|'info'} [type='info'] - Tipo de notificación.
 */
export function toast(msg, type = 'info') {
  const area = document.getElementById('toast-root');
  if (!area) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;

  const icons = { success: '✓', error: '✕', info: 'ⓘ' };

  el.innerHTML = `
    <span class="ic" style="font-size: 16px; line-height: 1; font-weight: bold; margin-top: 1px;">${icons[type]}</span>
    <span class="msg" style="line-height: 1.35;">${msg}</span>
  `;

  // Estilos inline temporales para el toast (luego los movemos a base.css)
  Object.assign(el.style, {
    background: 'var(--surface-3)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 18px',
    fontSize: '14px',
    fontWeight: '500',
    maxWidth: '400px',
    boxShadow: '0 10px 28px rgba(0,0,0,.4)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    animation: 'slideIn 0.25s ease-out',
    color: type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--text-primary)'),
    borderColor: type === 'error' ? 'var(--danger)' : (type === 'success' ? 'var(--success)' : 'var(--border)')
  });

  area.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }, type === 'error' ? 6000 : 4000);
}