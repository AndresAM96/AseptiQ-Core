import './styles/tokens.css';
import './styles/base.css';
import { initSession, setupAuthListener } from './shared/auth/session.js';
import { renderLogin } from './shared/auth/login.js';
import { renderLayout } from './shared/ui/layout.js';
import { initRouter, registerRoute, navigate } from './shared/router.js';
import { moduloProveedores } from './modules/proveedores/index.js';
import { moduloProductos } from './modules/productos/index.js';
import { moduloEntradas } from './modules/entradas/index.js';
import { moduloOrdenes } from './modules/ordenes/index.js';
import { moduloCentral } from './modules/central/index.js';
import { moduloDespachos } from './modules/despachos/index.js';
import { moduloKardex } from './modules/kardex/index.js';
import { moduloTrazabilidad } from './modules/trazabilidad/index.js';
import { moduloAuditoria } from './modules/auditoria/index.js';
import { moduloDashboard } from './modules/dashboard/index.js';
import { moduloConfiguracion } from './modules/configuracion/index.js';
import { moduloUsuarios } from './modules/usuarios/index.js';
import { moduloBackup } from './modules/backup/index.js';
import { moduloNovedades } from './modules/novedades/index.js';
import { moduloDevoluciones } from './modules/devoluciones/index.js';
import { moduloProduccion } from './modules/produccion/index.js';
import { moduloCompras } from './modules/compras/index.js';
import { moduloMermas } from './modules/mermas/index.js';
import { moduloSubproductos } from './modules/subproductos/index.js';
import { moduloCostos } from './modules/costos/index.js';
import { moduloRentabilidad } from './modules/rentabilidad/index.js';
import { moduloConsolidado } from './modules/consolidado/index.js';
import { moduloProgramacion } from './modules/programacion/index.js';

// Importamos el nuevo módulo
import { moduloInsumos } from './modules/insumos/index.js';

const app = document.getElementById('app');
let mainContentContainer = null;

// Registro de Rutas
registerRoute('dashboard', moduloDashboard);
registerRoute('insumos', moduloInsumos);
registerRoute('proveedores', moduloProveedores);
registerRoute('productos', moduloProductos);
registerRoute('entradas', moduloEntradas);
registerRoute('ordenes', moduloOrdenes);
registerRoute('central', moduloCentral);
registerRoute('despachos', moduloDespachos);
registerRoute('kardex', moduloKardex);
registerRoute('trazabilidad', moduloTrazabilidad);
registerRoute('auditoria', moduloAuditoria);
registerRoute('configuracion', moduloConfiguracion);
registerRoute('usuarios', moduloUsuarios);
registerRoute('backup', moduloBackup);
registerRoute('novedades', moduloNovedades);
registerRoute('devoluciones', moduloDevoluciones);
registerRoute('produccion', moduloProduccion);
registerRoute('compras', moduloCompras);
registerRoute('mermas', moduloMermas);
registerRoute('subproductos', moduloSubproductos);
registerRoute('costos', moduloCostos);
registerRoute('rentabilidad', moduloRentabilidad);
registerRoute('consolidado', moduloConsolidado);
registerRoute('programacion', moduloProgramacion);

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