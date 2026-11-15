import { login } from './session.js';
import { traducirError } from '../http/errores.js';

/**
 * Renderiza la pantalla de login en el contenedor.
 * @param {HTMLElement} container
 * @param {Function} onSuccess - Callback a ejecutar cuando el login sea exitoso.
 */
export function renderLogin(container, onSuccess) {
  container.innerHTML = `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px;">
      <div class="panel" style="width: 100%; max-width: 400px; padding: 32px; margin: 0;">
        
        <div style="width: 56px; height: 56px; border-radius: 14px; background: var(--surface-3); color: var(--accent); display: flex; align-items: center; justify-content: center; margin: 0 0 20px;">
          <svg viewBox="0 0 32 32" fill="none" style="width: 32px; height: 32px;">
            <circle cx="14" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/>
            <rect x="9.5" y="9.5" width="9" height="9" rx="1.5" fill="currentColor"/>
            <line x1="21" y1="21" x2="27" y2="27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
        </div>
        
        <h1 style="font-size: 20px; margin: 0 0 4px; letter-spacing: -.01em;">AseptiQ</h1>
        <p style="color: var(--text-secondary); font-size: 13.5px; line-height: 1.5; margin: 0 0 24px;">Ingresa tus credenciales para acceder al sistema.</p>
        
        <div id="login-error" class="error-msg" style="display: none; background: var(--danger-bg); color: var(--danger); font-size: 12.5px; padding: 10px 12px; border-radius: 8px; margin-bottom: 16px;"></div>
        
        <form id="login-form">
          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Correo electrónico</label>
            <input type="email" id="login-email" required autocomplete="username" placeholder="usuario@empresa.com" style="width: 100%; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-primary); padding: 10px 12px; border-radius: 8px; font-size: 13.5px; font-family: inherit;">
          </div>
          
          <div style="margin-bottom: 24px;">
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Contraseña</label>
            <input type="password" id="login-password" required autocomplete="current-password" placeholder="••••••••" style="width: 100%; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-primary); padding: 10px 12px; border-radius: 8px; font-size: 13.5px; font-family: inherit;">
          </div>
          
          <button type="submit" id="login-btn" style="width: 100%; font-family: inherit; font-size: 13.5px; font-weight: 600; border: none; border-radius: 8px; padding: 10px 16px; cursor: pointer; background: var(--accent); color: var(--accent-ink);">
            Conectar
          </button>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const btn = container.querySelector('#login-btn');
  const errBox = container.querySelector('#login-error');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = container.querySelector('#login-email').value;
    const password = container.querySelector('#login-password').value;

    errBox.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Validando...';

    try {
      await login(email, password);
      onSuccess();
    } catch (error) {
      errBox.textContent = traducirError(error.message);
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Conectar';
    }
  });
}