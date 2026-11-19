import { getProfile, logout } from '../auth/session.js';
import { SVG_SPRITE } from './icons.js';
import { initNotifications } from './notifications.js';

export function renderLayout(container, onLogout) {
  const profile = getProfile();

  if (!document.getElementById('svg-sprite-container')) {
    const div = document.createElement('div');
    div.id = 'svg-sprite-container';
    div.innerHTML = SVG_SPRITE;
    document.body.prepend(div);
  }

  const isCollapsed = localStorage.getItem('aseptiq_sidebar_collapsed') === '1';
  const collapsedClass = isCollapsed ? 'collapsed' : '';

  container.innerHTML = `
    <header class="mobile-header" style="display:none; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--surface-1); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100;">
      <button class="mobile-menu-btn" id="btn-mobile-menu" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; font-size: 18px; cursor: pointer;">☰</button>
      <div style="font-size: 14px; font-weight: 700; color: var(--accent);">AseptiQ</div>
      <div style="width: 32px;"></div>
    </header>

    <div class="sidebar-overlay" id="sidebar-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999; opacity:0; pointer-events:none; transition:opacity 0.3s ease;"></div>

    <div class="layout-wrapper" style="display: flex; min-height: 100vh; background: var(--bg);">
      
      <aside class="sidebar ${collapsedClass}" id="sidebar">
        
        <div class="sidebar-top">
          <div class="sidebar-top-row">
            <div class="brand">
              <svg class="brand-logo" viewBox="0 0 32 32" fill="none" style="width:22px;height:22px;color:var(--accent);flex-shrink:0;">
                <circle cx="14" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/>
                <rect x="9.5" y="9.5" width="9" height="9" rx="1.5" fill="currentColor"/>
                <line x1="21" y1="21" x2="27" y2="27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              <span class="brand-text">Asepti<span style="color:var(--accent);">Q</span> <small style="font-size:9.5px;color:var(--text-muted);font-weight:500;user-select:none;">v0.5.0</small></span>
            </div>
            
            <button id="btn-campana" class="sidebar-bell" title="Notificaciones" aria-label="Notificaciones">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M10.5 21a2 2 0 0 0 3 0"/>
              </svg>
              <span id="campana-badge" class="sidebar-bell-badge" style="display:none;">0</span>
            </button>
            
            <button id="btn-toggle-sidebar" class="sidebar-toggle" title="Minimizar menú">◀</button>
          </div>
          
          <div class="sidebar-search" id="sidebarSearchWrap">
            <svg class="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="sidebarSearch" placeholder="Buscar módulo…" autocomplete="off" spellcheck="false">
            <button class="sidebar-search-clear" id="sidebarSearchClear" title="Limpiar búsqueda" style="display:none;">×</button>
          </div>
        </div>

        <nav class="sidebar-nav" id="sidebarNav">
          
          <div class="nav-group open" data-group="operacion">
            <button class="nav-group-title" type="button">
              <span>Operación</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/dashboard" data-tab="dashboard" class="nav-item" title="Ir al Dashboard general">Dashboard</a>
              <a href="#/ordenes" data-tab="ordenes" class="nav-item" title="Crear y gestionar órdenes de producción">Cargar orden</a>
              <a href="#/novedades" data-tab="novedades" class="nav-item" title="Historial de órdenes activas">Novedades</a>
              <a href="#/entradas" data-tab="entradas" class="nav-item" title="Registrar recepción de mercancía">Entrada mercancía</a>
              <a href="#/devoluciones" data-tab="devoluciones" class="nav-item" title="Devoluciones a proveedor">Devoluciones</a>
              <a href="#/despachos" data-tab="despachos" class="nav-item" title="Salidas a clientes y entregas diarias">Despachos</a>
              <a href="#/bodega" data-tab="bodega" class="nav-item" title="Escanear y ubicar cajas en bodega">Bodega PT</a>
            </div>
          </div>

          <div class="nav-group" data-group="catalogo">
            <button class="nav-group-title" type="button">
              <span>Catálogo</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/insumos" data-tab="insumos" class="nav-item" title="Materia prima y material de empaque">Insumos</a>
              <a href="#/productos" data-tab="productos" class="nav-item" title="Subproductos y paquetes con BOM">Productos & BOM</a>
              <a href="#/subproductos" data-tab="subproductos" class="nav-item" title="Productos en proceso intermedios">Subproductos</a>
              <a href="#/proveedores" data-tab="proveedores" class="nav-item" title="Maestro de proveedores">Proveedores</a>
              <a href="#/produccion" data-tab="produccion" class="nav-item" title="Fabricar subproductos para stock">Producción Subprod.</a>
            </div>
          </div>

          <div class="nav-group" data-group="analisis">
            <button class="nav-group-title" type="button">
              <span>Logística y Calidad</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/programacion" data-tab="programacion" class="nav-item" title="Programación semanal de producción">Programación</a>
              <a href="#/consolidado" data-tab="consolidado" class="nav-item" title="Consolidado de materias primas">Consolidado MP</a>
              <a href="#/ordenes_compra" data-tab="ordenes_compra" class="nav-item" title="Seguimiento de Órdenes de Compra">Órdenes de Compra</a>
              <a href="#/trazabilidad" data-tab="trazabilidad" class="nav-item" title="Trazabilidad de lotes end-to-end (INVIMA)">Trazabilidad</a>
              <a href="#/auditoria" data-tab="auditoria" class="nav-item" title="Informes y conteo físico">Auditoría</a>
              <a href="#/evaluacion_prov" data-tab="evaluacion_prov" class="nav-item" title="Evaluación y desempeño de proveedores">Evaluación Prov.</a>
              <a href="#/kardex" data-tab="kardex" class="nav-item" title="Historial de movimientos por insumo">Kardex</a>
              <a href="#/compras" data-tab="compras" class="nav-item" title="Compras por proveedor">Compras</a>
              <a href="#/mermas" data-tab="mermas" class="nav-item" title="Mermas y ajustes de inventario">Mermas</a>
              <a href="#/historico" data-tab="historico" class="nav-item" title="Gráficos y tendencias">Histórico</a>
              <a href="#/costos" data-tab="costos" class="nav-item" title="Costo real vs teórico por OP">Costos OP</a>
              <a href="#/rentabilidad" data-tab="rentabilidad" class="nav-item" title="Margen y rentabilidad por producto">Rentabilidad</a>
            </div>
          </div>

          <div class="nav-group" data-group="sistema">
            <button class="nav-group-title" type="button">
              <span>Sistema</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/configuracion" data-tab="configuracion" class="nav-item" title="Configuración global del sistema">Configuración</a>
              ${profile.role === 'admin' ? `<a href="#/usuarios" data-tab="usuarios" class="nav-item" title="Gestión de usuarios y roles">Usuarios</a>` : ''}
              ${profile.role === 'admin' ? `<a href="#/backup" data-tab="backup" class="nav-item" title="Backup y exportación de datos">Backup</a>` : ''}
            </div>
          </div>

        </nav>

        <div class="sidebar-footer">
          <div class="user-info">
            <div id="sidebarUserEmail" class="user-email">${profile.email}</div>
            <div class="user-role-row">
              <span class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--success);flex-shrink:0;"></span>
              <span class="badge neutral" id="sidebarUserRole" style="font-size:10.5px; background: var(--warning-bg); color: var(--warning); padding: 2px 6px; border-radius: 4px;">${profile.role}</span>
            </div>
          </div>
        </div>
        <button class="ghost small" id="btn-logout" title="Cerrar sesión">Cerrar sesión</button>
      </aside>

      <!-- OVERLAY DE NOTIFICACIONES -->
      <div class="notif-overlay" id="notifOverlay">
        <div class="notif-panel" role="dialog" aria-label="Notificaciones">
          <div class="notif-header">
            <h4>Notificaciones</h4>
            <span class="notif-total" id="notifHeaderMeta"></span>
          </div>
          <div class="notif-body" id="notifBody"></div>
        </div>
      </div>

      <main style="flex: 1; min-width: 0; padding: 28px 36px; max-width: 1280px;">

      <main style="flex: 1; min-width: 0; padding: 28px 36px; max-width: 1280px;">
        <div id="main-content"></div>
      </main>
    </div>
  `;

  // --- LÓGICA ---

  const sidebar = container.querySelector('#sidebar');
  const overlay = container.querySelector('#sidebar-overlay');
  const btnMobileMenu = container.querySelector('#btn-mobile-menu');
  const btnToggleSidebar = container.querySelector('#btn-toggle-sidebar');

  btnToggleSidebar.onclick = () => {
    sidebar.classList.toggle('collapsed');
    const isNowCollapsed = sidebar.classList.contains('collapsed');
    localStorage.setItem('aseptiq_sidebar_collapsed', isNowCollapsed ? '1' : '0');
    btnToggleSidebar.style.transform = isNowCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  };

  if (sidebar.classList.contains('collapsed')) {
    btnToggleSidebar.style.transform = 'rotate(180deg)';
  }

  btnMobileMenu.onclick = () => {
    sidebar.style.transform = 'translateX(0)';
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'auto';
  };

  const cerrarDrawer = () => {
    sidebar.style.transform = 'translateX(-100%)';
    overlay.style.opacity = '0';
    overlay.style.pointerEvents = 'none';
  };

  overlay.onclick = cerrarDrawer;

  container.querySelectorAll('.nav-group-title').forEach(btn => {
    btn.onclick = () => {
      if (sidebar.classList.contains('collapsed')) return;
      const grupo = btn.closest('.nav-group');
      const estabaAbierto = grupo.classList.contains('open');
      container.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
      if (!estabaAbierto) grupo.classList.add('open');
    };
  });

  const inputSearch = container.querySelector('#sidebarSearch');
  const btnClear = container.querySelector('#sidebarSearchClear');
  const nav = container.querySelector('#sidebarNav');

  inputSearch.oninput = () => {
    const q = inputSearch.value.trim().toLowerCase();
    if (!q) {
      btnClear.style.display = 'none';
      nav.classList.remove('searching');
      container.querySelectorAll('.nav-item').forEach(el => el.classList.remove('hidden'));
      container.querySelectorAll('.nav-group').forEach(el => el.classList.remove('hidden'));
      return;
    }
    btnClear.style.display = 'flex';
    nav.classList.add('searching');

    let totalVisibles = 0;
    container.querySelectorAll('.nav-group').forEach(grupo => {
      let visiblesGrupo = 0;
      grupo.querySelectorAll('.nav-item').forEach(item => {
        const txt = item.textContent.toLowerCase();
        if (txt.includes(q)) { item.classList.remove('hidden'); visiblesGrupo++; }
        else { item.classList.add('hidden'); }
      });
      if (visiblesGrupo > 0) { grupo.classList.remove('hidden'); totalVisibles += visiblesGrupo; }
      else { grupo.classList.add('hidden'); }
    });

    let noResults = nav.querySelector('.sidebar-no-results');
    if (totalVisibles === 0) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'sidebar-no-results';
        nav.appendChild(noResults);
      }
      noResults.textContent = `Sin resultados para "${inputSearch.value}".`;
    } else if (noResults) {
      noResults.remove();
    }
  };

  btnClear.onclick = () => { inputSearch.value = ''; inputSearch.oninput(); };

  container.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) cerrarDrawer();
    });
  });

  // Inicializar notificaciones (pasar config actual)
  const config = JSON.parse(localStorage.getItem('inv_config') || '{"umbralUrgente":30,"umbralReorden":60}');
  initNotifications(container, config);

  container.querySelector('#btn-logout').addEventListener('click', async () => {
    await logout();
    onLogout();
  });

  document.addEventListener('route:change', (e) => {
    const route = e.detail;
    container.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('href') === `#/${route}`) {
        el.classList.add('active');
        const grupo = el.closest('.nav-group');
        if (grupo) {
          container.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
          grupo.classList.add('open');
        }
      } else {
        el.classList.remove('active');
      }
    });
  });

  return container.querySelector('#main-content');
}