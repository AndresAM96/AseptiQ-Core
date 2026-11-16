import { esc, num, money } from '../../core/formatters.js';

export function renderMermas(container, movimientos) {
  let perdidaTotal = 0;
  const porInsumo = {};

  movimientos.forEach(m => {
    const costo = Number(m.costo_unitario_momento) || 0;
    const cant = Number(m.cantidad) || 0;
    const valor = costo * cant;
    perdidaTotal += valor;

    const insId = m.insumo_id;
    if (!porInsumo[insId]) {
      porInsumo[insId] = {
        nombre: m.insumos?.nombre || '?',
        codigo: m.insumos?.codigo || '',
        unidad: m.insumos?.unidad_consumo || '',
        cantidad: 0,
        valor: 0
      };
    }
    porInsumo[insId].cantidad += cant;
    porInsumo[insId].valor += valor;
  });

  const insumosArr = Object.values(porInsumo).sort((a, b) => b.valor - a.valor);

  const filas = insumosArr.map(i => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; font-weight: 500;">${esc(i.nombre)} <span class="mono" style="color:var(--text-muted); font-size:11px;">${esc(i.codigo)}</span></td>
      <td style="padding: 10px 12px; text-align: right; color: var(--danger); font-weight: 600;">${num(i.cantidad)} ${esc(i.unidad)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${money(i.valor)}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Mermas y Ajustes</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Análisis de pérdidas de inventario (excluye devoluciones).</p>

    <div class="grid-cols-3" style="display: grid; gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--danger-bg); border: 1px solid var(--danger); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--danger); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Pérdida Total (Valorizada)</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--danger);">${money(perdidaTotal)}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Movimientos</div>
        <div style="font-size: 24px; font-weight: 700;">${movimientos.length}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Insumos Afectados</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--warning);">${insumosArr.length}</div>
      </div>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cantidad Perdida</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Valor Perdido</th>
          </tr>
        </thead>
        <tbody>${insumosArr.length === 0 ? '<tr><td colspan="3" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay mermas registradas.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;
}