import { esc, num } from '../../core/formatters.js';

export function renderBackup(container, logs, onGenerar) {
  const filas = logs.map(l => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(l.fecha).toLocaleString('es-CO')}</td>
      <td style="padding: 10px 12px; font-size: 12px;">${esc(l.usuario_email || '—')}</td>
      <td style="padding: 10px 12px; font-size: 12px;">${esc(l.rango_movimientos)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${num(l.total_registros)}</td>
      <td style="padding: 10px 12px; text-align: right; font-size: 12px;">${l.tamano_bytes ? (l.tamano_bytes / 1024).toFixed(1) + ' KB' : '—'}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Backup de Datos</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Exporta toda la información del sistema en formato CSV (comprimido en ZIP).</p>

    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start;">
      
      <!-- Panel de Generación -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 14px;">Generar Nuevo Backup</h3>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Rango de Movimientos</label>
          <select id="bk-rango" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            <option value="30d">Últimos 30 días</option>
            <option value="6m" selected>Últimos 6 meses</option>
            <option value="1a">Último año</option>
            <option value="todo">Todo el histórico</option>
          </select>
        </div>

        <button id="btn-generar" style="width: 100%; background: var(--accent); color: var(--accent-ink); border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer;">Descargar Backup (.zip)</button>
        
        <div style="margin-top: 16px; font-size: 11px; color: var(--text-muted); line-height: 1.4;">
          El archivo ZIP contendrá los datos de insumos, productos, BOMs, órdenes, movimientos y lotes en formato CSV listo para Excel.
        </div>
      </div>

      <!-- Panel de Historial -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
          <h3 style="margin: 0; font-size: 14px;">Historial de Backups</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Usuario</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Rango</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Registros</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Tamaño</th>
            </tr>
          </thead>
          <tbody>${logs.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay backups generados.</td></tr>' : filas}</tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btn-generar').onclick = () => {
    const rango = container.querySelector('#bk-rango').value;
    onGenerar(rango);
  };
}