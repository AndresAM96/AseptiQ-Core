import './styles/tokens.css';
import './styles/base.css';
import { initSession, setupAuthListener, logout } from './shared/auth/session.js';
import { renderLogin } from './shared/auth/login.js';

const app = document.getElementById('app');

async function bootstrap() {
  // Intentar recuperar sesión existente
  const session = await initSession();

  if (session) {
    renderMainApp();
  } else {
    renderLoginScreen();
  }

  // Listener para cuando la sesión expire
  setupAuthListener(() => {
    renderLoginScreen();
  });
}

function renderLoginScreen() {
  renderLogin(app, () => {
    renderMainApp();
  });
}

function renderMainApp() {
  // Este es el layout principal temporal (Fase 1)
  app.innerHTML = `
    <div style="display: flex; min-height: 100vh;">
      <aside style="width: 220px; background: var(--surface-1); border-right: 1px solid var(--border); padding: 20px; display: flex; flex-direction: column;">
        <div style="font-size: 18px; font-weight: 700; color: var(--accent); margin-bottom: 24px;">AseptiQ v1.0</div>
        <div style="font-size: 13px; color: var(--text-secondary); flex: 1;">Menú en construcción (Fase 2)</div>
        <button id="btn-logout" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px; border-radius: 6px; cursor: pointer;">Cerrar sesión</button>
      </aside>
      <main style="flex: 1; padding: 32px;">
        <h1 style="margin-top: 0;">¡Bienvenido a AseptiQ!</h1>
        <p style="color: var(--text-secondary);">Has iniciado sesión correctamente. La Fase 1 (Core y Auth) está completa.</p>
      </main>
    </div>
  `;

  app.querySelector('#btn-logout').addEventListener('click', async () => {
    await logout();
    renderLoginScreen();
  });
}

bootstrap();