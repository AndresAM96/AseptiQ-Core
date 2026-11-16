import { esc, num, money } from '../../core/formatters.js';

export function renderConsolidado(container, data, onGenerar) {
  const { resultado, totalOps } = data || { resultado: [], totalOps: 0 };

  let totalCostoCompra = 0;
  let insumosFaltantes = 0;

  const filas = resultado.map(r => {
    const u = esc(r.ins.unidad_consumo);
    const colorFaltante = r.faltante > 0 ? 'var(--danger)' : 'var(--success)';

    if (r.faltante > 0) {
      insumosFaltantes++;
      totalCostoCompra += (r.faltante * r.ins.costo_unitario);
    }

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 11px;">${esc(r.ins.codigo)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(r.ins.nombre)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(r.requerido)} ${u}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--text-secondary);">${num(r.stock)} ${u}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: ${colorFaltante};">
          ${r.faltante > 0 ? num(r.faltante) + ' ' + u : '—'}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Consolidado de Materias Primas (MRP)</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Requerimiento total de insumos para las OPs pendientes.</p>
      </div>
      <button id="btn-generar-mrp" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Actualizar Datos</button>
    </div>

    <div id="mrp-panel">
      ${!data ? `
        <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 40px; text-align: center; color: var(--text-muted);">
          Presiona "Actualizar Datos" para calcular los requerimientos de compra.
        </div>
      ` : `
        <div class="grid-cols-3" style="display: grid; gap: 16px; margin-bottom: 24px;">
          <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
            <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">OPs Analizadas</div>
            <div style="font-size: 24px; font-weight: 700;">${totalOps}</div>
          </div>
          <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
            <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Insumos a Comprar</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--danger);">${insumosFaltantes}</div>
          </div>
          <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px; border-left: 4px solid var(--accent);">
            <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Costo Estimado de Compra</div>
            <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${money(totalCostoCompra)}</div>
          </div>
        </div>

        <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Requerido</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">En Stock</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">A Comprar</th>
              </tr>
            </thead>
            <tbody>${resultado.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay requerimientos pendientes.</td></tr>' : filas}</tbody>
          </table>
        </div>
      `}
    </div>
  `;

  container.querySelector('#btn-generar-mrp').onclick = () => onGenerar();
}