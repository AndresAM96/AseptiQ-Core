import { getProfile, logout } from '../auth/session.js';

export function renderLayout(container, onLogout) {
  const profile = getProfile();

  container.innerHTML = `
    <div style="display: flex; min-height: 100vh;">
      <!-- Sidebar -->
      <aside style="width: 220px; flex-shrink: 0; background: var(--surface-1); border-right: 1px solid var(--border); padding: 20px 12px; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh;">
        <div style="display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700; margin-bottom: 20px; padding: 0 8px; color: var(--text-primary);">
          <svg style="width: 22px; height: 22px; color: var(--accent);" viewBox="0 0 32 32" fill="none">
            <circle cx="14" cy="14" r="10" stroke="currentColor" stroke-width="2.5"/>
            <rect x="9.5" y="9.5" width="9" height="9" rx="1.5" fill="currentColor"/>
            <line x1="21" y1="21" x2="27" y2="27" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
          </svg>
          AseptiQ <small style="font-size: 9.5px; color: var(--text-muted);">v1.0</small>
        </div>

        <nav style="flex: 1; overflow-y: auto;">
          <!-- Dashboard -->
          <a href="#/dashboard" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Dashboard</a>
          
          <!-- Operación -->
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin: 16px 0 6px; padding: 0 12px;">Operación</div>
          <a href="#/ordenes" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Cargar orden</a>
          <a href="#/novedades" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Novedades</a>
          <a href="#/devoluciones" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Devoluciones</a>
          <a href="#/central" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Central EO</a>
          <a href="#/despachos" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Despachos</a>
          <a href="#/entradas" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Entrada Mercancía</a>
          
          <!-- Catálogo -->
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin: 16px 0 6px; padding: 0 12px;">Catálogo</div>
          <a href="#/insumos" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Insumos</a>
          <a href="#/productos" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Productos & BOM</a>
          <a href="#/subproductos" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Subproductos</a>
          <a href="#/produccion" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Producción Subproducto</a>
          <a href="#/proveedores" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Proveedores</a>
                    
          <!-- Análisis -->
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin: 16px 0 6px; padding: 0 12px;">Análisis</div>
          <a href="#/kardex" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Kardex</a>
          <a href="#/trazabilidad" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Trazabilidad</a>
          <a href="#/auditoria" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Auditoría</a>
          <a href="#/compras" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Compras</a>
          <a href="#/mermas" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Mermas</a>
          <a href="#/costos" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Costos OP</a>
          <a href="#/rentabilidad" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Rentabilidad</a>

          <!-- Sistema -->
          <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin: 16px 0 6px; padding: 0 12px;">Sistema</div>
          <a href="#/configuracion" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Configuración</a>
          ${profile.role === 'admin' ? `<a href="#/usuarios" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Usuarios</a>` : ''}
          ${profile.role === 'admin' ? `<a href="#/backup" class="nav-item" style="display: block; padding: 8px 12px; border-radius: 8px; color: var(--text-secondary); text-decoration: none; font-size: 13.5px; font-weight: 500; margin-bottom: 2px;">Backup</a>` : ''}
        </nav>

        <div style="margin-top: auto; padding-top: 16px; border-top: 1px solid var(--border);">
          <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis;">${profile.email}</div>
          <div style="display: inline-block; font-size: 10.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; background: var(--surface-3); color: var(--text-primary); margin-bottom: 8px;">${profile.role}</div>
          <button id="btn-logout" style="width: 100%; background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 8px; border-radius: 6px; cursor: pointer; font-family: inherit;">Cerrar sesión</button>
        </div>
      </aside>

      <!-- Contenido -->
      <main style="flex: 1; min-width: 0; padding: 28px 36px; max-width: 1280px;">
        <div id="main-content"></div>
      </main>
    </div>
  `;

  // Estilos dinámicos para el hover de los items del menú
  const style = document.createElement('style');
  style.textContent = `
    .nav-item:hover, .nav-item.active {
      background: var(--surface-2) !important;
      color: var(--text-primary) !important;
    }
  `;
  document.head.appendChild(style);

  container.querySelector('#btn-logout').addEventListener('click', async () => {
    await logout();
    onLogout();
  });

  // Escuchar cambios de ruta para marcar el item activo en el menú
  document.addEventListener('route:change', (e) => {
    const route = e.detail;
    container.querySelectorAll('.nav-item').forEach(el => {
      if (el.getAttribute('href') === `#/${route}`) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  });

  return container.querySelector('#main-content');
}