import { esc, num, money } from '../../core/formatters.js';

export function renderRentabilidad(container, data) {
  const { productos, costos } = data;

  let ingresosTotales = 0;
  let costoTotal = 0;

  const filas = productos.map(p => {
    const costo = costos[p.codigo_pt] || 0;
    const precio = p.precio_venta || 0;
    const margen = precio - costo;
    const margenPct = precio > 0 ? (margen / precio) * 100 : 0;

    ingresosTotales += precio;
    costoTotal += costo;

    const color = margen >= 0 ? 'var(--success)' : 'var(--danger)';
    const colorPct = margenPct >= 0 ? 'var(--success)' : 'var(--danger)';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-weight: 500;">${esc(p.nombre)} <span class="mono" style="color:var(--text-muted); font-size:11px;">${esc(p.codigo_pt)}</span></td>
        <td style="padding: 10px 12px; text-align: right;">${money(precio)}</td>
        <td style="padding: 10px 12px; text-align: right;">${money(costo)}</td>
        <td style="padding: 10px 12px; text-align: right; color: ${color}; font-weight: 600;">${money(margen)}</td>
        <td style="padding: 10px 12px; text-align: right; color: ${colorPct}; font-weight: 600;">${num(margenPct, 1)}%</td>
      </tr>
    `;
  }).join('');

  const margenGlobal = ingresosTotales - costoTotal;
  const margenGlobalPct = ingresosTotales > 0 ? (margenGlobal / ingresosTotales) * 100 : 0;

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Rentabilidad</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Análisis de márgenes por producto basado en el costo teórico de la receta.</p>

    <div class="grid-cols-3" style="display: grid; gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Ingreso Promedio / U</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--info);">${money(ingresosTotales / (productos.length || 1))}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Costo Promedio / U</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--warning);">${money(costoTotal / (productos.length || 1))}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px; border-left: 4px solid var(--success);">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Margen Promedio Global</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--success);">${num(margenGlobalPct, 1)}%</div>
      </div>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto (PT)</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Precio Venta</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Costo Receta</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Margen ($)</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Margen (%)</th>
          </tr>
        </thead>
        <tbody>${productos.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay productos registrados.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;
}