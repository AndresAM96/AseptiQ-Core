import { esc, num } from '../../core/formatters.js';

export function renderNovedades(container, ordenes) {
  const filas = ordenes.map(op => {
    const prog = op.cantidad_producida;
    const total = op.cantidad_proyectada;
    const pct = total > 0 ? Math.round((prog / total) * 100) : 0;

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-weight: 600;">${esc(op.numero_op)}</td>
        <td style="padding: 10px 12px;">${esc(op.codigo_pt)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(prog)} / ${num(total)}</td>
        <td style="padding: 10px 12px; width: 150px;">
          <div style="background: var(--surface-3); height: 6px; border-radius: 3px; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${pct === 100 ? 'var(--success)' : 'var(--info)'};"></div>
          </div>
          <div style="font-size: 10px; color: var(--text-muted); text-align: right; margin-top: 2px;">${pct}%</div>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="background: ${op.estado_op === 'Pendiente' ? 'var(--warning-bg)' : 'var(--info-bg)'}; color: ${op.estado_op === 'Pendiente' ? 'var(--warning)' : 'var(--info)'}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">
            ${op.estado_op}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Novedades</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Órdenes de producción activas (Pendientes y En Proceso).</p>
      </div>
      <a href="#/ordenes" style="background: var(--accent); color: var(--accent-ink); text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 13px;">+ Ir a Cargar Orden</a>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">N° OP</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código PT</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Progreso</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Barra</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Estado</th>
          </tr>
        </thead>
        <tbody>${ordenes.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay órdenes activas.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;
}