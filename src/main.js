import './styles/tokens.css';
import './styles/base.css';
import { initSession, setupAuthListener } from './shared/auth/session.js';
import { renderLogin } from './shared/auth/login.js';
import { renderLayout } from './shared/ui/layout.js';
import { initRouter, registerRoute, navigate } from './shared/router.js';
import { toast } from './shared/ui/toast.js';
import { abrirModal, cerrarModal } from './shared/ui/modal.js';
import { moduloProveedores } from './modules/proveedores/index.js';
import { moduloProductos } from './modules/productos/index.js';
import { moduloEntradas } from './modules/entradas/index.js';
import { moduloOrdenes } from './modules/ordenes/index.js';
import { moduloCentral } from './modules/central/index.js';
import { moduloDespachos } from './modules/despachos/index.js';
import { moduloKardex } from './modules/kardex/index.js';

// Importamos el nuevo módulo
import { moduloInsumos } from './modules/insumos/index.js';

const app = document.getElementById('app');
let mainContentContainer = null;

// --- Módulo de prueba (Dashboard) ---
const dummyDashboard = {
  mount(container) {
    container.innerHTML = `
      <h2 style="font-size: 20px; margin: 0 0 4px;">Dashboard</h2>
      <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Fase 2 en progreso.</p>
      
      <div class="panel" style="padding: 24px;">
        <h3 style="margin-top: 0;">Prueba de componentes UI</h3>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button id="btn-toast" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Lanzar Toast</button>
          <button id="btn-modal" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Abrir Modal</button>
        </div>
      </div>
    `;

    container.querySelector('#btn-toast').onclick = () => toast('Operación exitosa de prueba', 'success');
    container.querySelector('#btn-modal').onclick = () => {
      abrirModal({
        title: 'Modal de prueba',
        body: '<p>Este es un modal genérico con animación y cierre con Escape.</p>',
        footer: `<button id="btn-cerrar-modal" style="padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
        onOpen: (overlay) => {
          overlay.querySelector('#btn-cerrar-modal').onclick = cerrarModal;
        }
      });
    };
  }
};

// Registro de Rutas
registerRoute('dashboard', dummyDashboard);
registerRoute('insumos', moduloInsumos);
registerRoute('proveedores', moduloProveedores);
registerRoute('productos', moduloProductos);
registerRoute('entradas', moduloEntradas);
registerRoute('ordenes', moduloOrdenes);
registerRoute('central', moduloCentral);
registerRoute('despachos', moduloDespachos);
registerRoute('kardex', moduloKardex);

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