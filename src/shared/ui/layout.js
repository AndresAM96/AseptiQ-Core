import { getProfile, logout } from '../auth/session.js';
import { SVG_SPRITE, icono } from './icons.js';

export function renderLayout(container, onLogout) {
  const profile = getProfile();

  // Inyectar el sprite de iconos al body si no existe
  if (!document.getElementById('svg-sprite-container')) {
    const div = document.createElement('div');
    div.id = 'svg-sprite-container';
    div.innerHTML = SVG_SPRITE;
    document.body.prepend(div);
  }

  container.innerHTML = `
    <header class="mobile-header" style="display:none; align-items: center; justify-content: space-between; padding: 10px 16px; background: var(--surface-1); border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100;">
      <button class="mobile-menu-btn" id="btn-mobile-menu" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; font-size: 18px; cursor: pointer;">☰</button>
      <div style="font-size: 14px; font-weight: 700; color: var(--accent);">AseptiQ</div>
      <div style="width: 32px;"></div>
    </header>

    <div class="sidebar-overlay" id="sidebar-overlay" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:999; opacity:0; pointer-events:none; transition:opacity 0.3s ease;"></div>

    <div class="layout-wrapper" style="display: flex; min-height: 100vh; background: var(--bg);">
      <aside class="sidebar" id="sidebar" style="width: 220px; flex-shrink: 0; background: var(--surface-1); border-right: 1px solid var(--border); padding: 20px 12px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 10; transition: transform 0.3s ease;">
        
        <div class="sidebar-top" style="display: flex; flex-direction: column; gap: 10px; padding: 0 4px 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; color: var(--text-primary);">
              <svg style="width: 22px; height: 22px; color: var(--accent);" viewBox="0 0 32 32" fill="none">
                <circle cx="14" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/>
                <rect x="9.5" y="9.5" width="9" height="9" rx="1.5" fill="currentColor"/>
                <line x1="21" y1="21" x2="27" y2="27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
              </svg>
              AseptiQ
            </div>
            <button id="btn-campana" style="background: transparent; border: 1px solid var(--border); border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--text-secondary); position: relative;">
              ${icono('info', 'sm')}
              <span id="campana-badge" style="display: none; position: absolute; top: -4px; right: -4px; background: var(--danger); color: white; font-size: 9px; font-weight: bold; min-width: 14px; height: 14px; border-radius: 7px; padding: 0 3px; align-items: center; justify-content: center;">0</span>
            </button>
          </div>
          <div class="sidebar-search" id="sidebarSearchWrap">
            <svg class="sidebar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="text" id="sidebarSearch" placeholder="Buscar módulo…" autocomplete="off" spellcheck="false">
            <button class="sidebar-search-clear" id="sidebarSearchClear" title="Limpiar búsqueda" style="display:none;">×</button>
          </div>
        </div>

        <nav class="sidebar-nav" id="sidebarNav" style="flex: 1; overflow-y: auto; overflow-x: hidden; padding-right: 4px;">
          
          <div class="nav-group open" data-group="operacion">
            <button class="nav-group-title" type="button">
              <span>Operación</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/dashboard" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('chart-line','sm')} Dashboard</a>
              <a href="#/ordenes" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('plus','sm')} Cargar orden</a>
              <a href="#/novedades" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('clock','sm')} Novedades</a>
              <a href="#/entradas" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('download','sm')} Entrada Mercancía</a>
              <a href="#/bodega" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('box','sm')} Bodega PT</a>
              <a href="#/produccion" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('wrench','sm')} Producción Subprod.</a>
              <a href="#/central" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('info','sm')} Central EO</a>
              <a href="#/despachos" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('truck','sm')} Despachos</a>
              <a href="#/devoluciones" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('eye-off','sm')} Devoluciones</a>
            </div>
          </div>

          <div class="nav-group" data-group="catalogo">
            <button class="nav-group-title" type="button">
              <span>Catálogo</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/insumos" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('box','sm')} Insumos</a>
              <a href="#/productos" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('package','sm')} Productos & BOM</a>
              <a href="#/subproductos" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('wrench','sm')} Subproductos</a>
              <a href="#/proveedores" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('truck','sm')} Proveedores</a>
            </div>
          </div>

          <div class="nav-group" data-group="analisis">
            <button class="nav-group-title" type="button">
              <span>Análisis y Logística</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/kardex" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('clock','sm')} Kardex</a>
              <a href="#/trazabilidad" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('tag','sm')} Trazabilidad</a>
              <a href="#/auditoria" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('eye','sm')} Auditoría</a>
              <a href="#/programacion" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('clock','sm')} Programación</a>
              <a href="#/consolidado" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('box','sm')} Consolidado MP</a>
              <a href="#/compras" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('truck','sm')} Compras</a>
              <a href="#/mermas" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('alert-triangle','sm')} Mermas</a>
              <a href="#/historico" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('chart-line','sm')} Histórico</a>
              <a href="#/costos" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('dollar','sm')} Costos OP</a>
              <a href="#/rentabilidad" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('chart-line','sm')} Rentabilidad</a>
              <a href="#/ordenes_compra" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('clipboard','sm')} Órdenes de Compra</a>
              <a href="#/evaluacion_prov" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('users','sm')} Evaluación Prov.</a>
            </div>
          </div>

          <div class="nav-group" data-group="sistema">
            <button class="nav-group-title" type="button">
              <span>Sistema</span>
              <span class="nav-group-arrow">▾</span>
            </button>
            <div class="nav-group-items">
              <a href="#/configuracion" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('gear','sm')} Configuración</a>
              ${profile.role === 'admin' ? `<a href="#/usuarios" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('users','sm')} Usuarios</a>` : ''}
              ${profile.role === 'admin' ? `<a href="#/backup" class="nav-item" style="display: flex; align-items: center; padding: 7px 10px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 1px;">${icono('download','sm')} Backup</a>` : ''}
            </div>
          </div>

        </nav>

        <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;">${profile.email}</div>
          <div style="display: inline-block; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: var(--surface-3); color: var(--text-primary); margin-bottom: 8px;">${profile.role}</div>
          <button id="btn-logout" style="width: 100%; background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 8px; border-radius: 6px; cursor: pointer; font-family: inherit;">Cerrar sesión</button>
        </div>
      </aside>

      <main style="flex: 1; min-width: 0; padding: 28px 36px; max-width: 1280px;">
        <div id="main-content"></div>
      </main>
    </div>
  `;

  // --- LÓGICA DEL SIDEBAR ---

  // 1. Hover en items
  const style = document.createElement('style');
  style.textContent = `
    .nav-item:hover, .nav-item.active { background: var(--surface-2) !important; color: var(--text-primary) !important; }
    .nav-item .icon { margin-right: 8px; color: var(--text-muted); }
    .nav-item.active .icon { color: var(--accent); }
  `;
  document.head.appendChild(style);

  // 2. Acordeón de grupos
  container.querySelectorAll('.nav-group-title').forEach(btn => {
    btn.onclick = () => {
      const grupo = btn.closest('.nav-group');
      const estabaAbierto = grupo.classList.contains('open');
      container.querySelectorAll('.nav-group').forEach(g => g.classList.remove('open'));
      if (!estabaAbierto) grupo.classList.add('open');
    };
  });

  // 3. Buscador del sidebar
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

    // Lógica para mostrar/ocultar el mensaje de "Sin resultados"
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

  // 4. Lógica del Drawer Móvil
  const sidebar = container.querySelector('#sidebar');
  const overlay = container.querySelector('#sidebar-overlay');
  const btnMobileMenu = container.querySelector('#btn-mobile-menu');

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

  container.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) cerrarDrawer();
    });
  });

  // 5. Campana
  container.querySelector('#btn-campana').onclick = () => {
    const badge = container.querySelector('#campana-badge');
    badge.style.display = 'flex';
    badge.textContent = '3';
    alert('Tienes 3 alertas de stock crítico.');
  };

  // 6. Logout
  container.querySelector('#btn-logout').addEventListener('click', async () => {
    await logout();
    onLogout();
  });

  // 7. Estado activo según ruta
  document.addEventListener('route:change', (e) => {
    const route = e.detail;
    container.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('href') === `#/${route}`) {
        el.classList.add('active');
        // Abrir el grupo del item activo
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