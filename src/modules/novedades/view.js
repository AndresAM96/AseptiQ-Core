import { esc, num } from '../../core/formatters.js';
import { icono } from '../../shared/ui/icons.js';

export function renderNovedades(container, ordenes, handlers) {
  const filas = ordenes.map(o => {
    const prod = o.productos_terminados?.nombre || o.codigo_pt;
    const producida = Number(o.cantidad_producida) || 0;
    const proyectada = Number(o.cantidad_proyectada) || 0;
    const pct = proyectada > 0 ? Math.round((producida / proyectada) * 100) : 0;

    const progresoTxt = proyectada > 0 && producida > 0
      ? `<br><span style="color:var(--info); font-size:11px;">${producida}/${proyectada} entregado</span>`
      : '';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px;" class="mono">${esc(o.numero_op || '—')}</td>
        <td style="padding: 10px 12px;">${esc(prod)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(proyectada)}${progresoTxt}</td>
        <td style="padding: 10px 12px; width: 150px;">
          <div style="background: var(--surface-3); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${pct === 100 ? 'var(--success)' : 'var(--info)'};"></div>
          </div>
          <div style="font-size: 10px; color: var(--text-muted); text-align: right; margin-top: 2px;">${pct}%</div>
        </td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(o.fecha_creacion).toLocaleDateString('es-CO')}</td>
        <td style="padding: 10px 12px;">
          <span class="badge ${o.estado_cobertura === 'Cubierto' || o.estado_cobertura === 'Cubierta' ? 'success' : (o.estado_cobertura === 'Urgente' ? 'danger' : 'warning')}">
            ${esc(o.estado_cobertura)}
          </span>
        </td>
        <td style="padding: 10px 12px;">
          <span class="badge ${o.estado_op === 'Pendiente' ? 'neutral' : 'info'}">${esc(o.estado_op)}</span>
        </td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-detalle="${o.id}" title="Ver el detalle completo de esta OP" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Ver detalle</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Novedades de órdenes</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Historial de órdenes activas (pendientes y en proceso).</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-novedades" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-novedades" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Órdenes activas</h3>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button id="btn-refresh-nov" title="Actualizar la lista" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">
            ${icono('clock','sm')}
          </button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; flex-wrap: wrap;">
            <input type="text" id="buscar_novedades" placeholder="Buscar por OP o producto..." style="flex: 1 1 220px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
          </div>
          
          <div style="overflow-x: auto;">
            <table id="tablaNovedades" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">N° OP</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cantidad</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Progreso</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Cobertura</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${ordenes.length === 0 ? '<tr><td colspan="8" style="padding: 32px; text-align: center; color: var(--text-muted);">No hay órdenes activas actualmente.</td></tr>' : filas}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // --- LÓGICA ---

  // Buscador
  const inputBuscar = container.querySelector('#buscar_novedades');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaNovedades tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  // Botón Refrescar
  container.querySelector('#btn-refresh-nov').onclick = (e) => {
    const btn = e.currentTarget;
    btn.style.transform = 'rotate(360deg)';
    btn.style.transition = 'transform 0.5s ease';
    setTimeout(() => {
      btn.style.transform = 'rotate(0deg)';
      btn.style.transition = 'none';
    }, 500);
    handlers.onRefrescar();
  };

  // Botón Detalle
  container.querySelectorAll('[data-detalle]').forEach(btn => {
    btn.onclick = () => handlers.onVerDetalle(btn.dataset.detalle);
  });

  // Panel Colapsable
  const panel = container.querySelector('#panel-novedades');
  const header = container.querySelector('#header-novedades');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };
}