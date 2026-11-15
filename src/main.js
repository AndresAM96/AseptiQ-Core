import './styles/tokens.css';
import './styles/base.css';
import { initSession, setupAuthListener } from './shared/auth/session.js';
import { renderLogin } from './shared/auth/login.js';
import { renderLayout } from './shared/ui/layout.js';
import { initRouter, registerRoute, navigate } from './shared/router.js';
import { toast } from './shared/ui/toast.js';

const app = document.getElementById('app');
let mainContentContainer = null;

// --- Módulo de prueba (Dashboard) ---
const dummyDashboard = {
  mount(container) {
    container.innerHTML = `
      <h2 style="font-size: 20px; margin: 0 0 4px;">Dashboard</h2>
      <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Fase 1 completada.</p>
      
      <div class="panel" style="padding: 24px;">
        <h3 style="margin-top: 0;">Prueba de componentes UI</h3>
        <p>Haz clic en los botones para probar el sistema.</p>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button id="btn-toast" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Lanzar Toast</button>
          <button id="btn-modal" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Abrir Modal</button>
        </div>
      </div>
    `;

    container.querySelector('#btn-toast').onclick = () => toast('Operación exitosa de prueba', 'success');
        container.querySelector('#btn-modal').onclick = () => {
      import('./shared/ui/modal.js').then(({ abrirModal, cerrarModal }) => {
        abrirModal({
          title: 'Modal de prueba',
          body: '<p>Este es un modal genérico con animación y cierre con Escape.</p>',
          footer: `<button id="btn-cerrar-modal" style="padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
          onOpen: (overlay) => {
            overlay.querySelector('#btn-cerrar-modal').onclick = cerrarModal;
          }
        });
      });
    };
  }
};

// --- Módulo de prueba (Insumos) ---
const dummyInsumos = {
  mount(container) {
    container.innerHTML = `<h2>Insumos</h2><p>Módulo en construcción (Fase 2).</p>`;
  }
};

registerRoute('dashboard', dummyDashboard);
registerRoute('insumos', dummyInsumos);

// --- Arranque ---
async function bootstrap() {
  const session = await initSession();

  if (session) {
    bootApp();
  } else {
    renderLoginScreen();
  }

  setupAuthListener(() => {
    renderLoginScreen();
  });
}

function renderLoginScreen() {
  renderLogin(app, () => {
    bootApp();
  });
}

function bootApp() {
  mainContentContainer = renderLayout(app, () => {
    renderLoginScreen();
  });

  initRouter(mainContentContainer, 'dashboard');
  navigate('dashboard');
}

bootstrap();