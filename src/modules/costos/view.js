import { esc, num, money } from '../../core/formatters.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderCostosOP(container, ordenes, onVerDetalle) {
  const filas = ordenes.map(op => {
    const cant = op.cantidad_proyectada;
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-weight: 600;">${esc(op.numero_op)}</td>
        <td style="padding: 10px 12px;">${esc(op.productos_terminados?.nombre || op.codigo_pt)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(cant)}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(op.fecha_completado).toLocaleDateString('es-CO')}</td>
        <td style="padding: 10px 12px; text-align: right;">
          <button data-ver="${op.id}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Comparar Costos</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Costos de Producción</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Compara el costo teórico (receta) vs el costo real (consumos) de las OPs terminadas.</p>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">N° OP</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Unidades</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha Fin</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>${ordenes.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay OPs terminadas aún.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-ver]').forEach(btn => {
    btn.onclick = () => onVerDetalle(btn.dataset.ver);
  });
}

export function mostrarDetalleCostos(op, consumosReales, insumosMaestros) {
  // 1. Agrupar consumos reales
  const reales = {};
  let costoRealTotal = 0;
  consumosReales.forEach(c => {
    const costo = Number(c.costo_unitario_momento) || 0;
    const cant = Number(c.cantidad) || 0;
    costoRealTotal += (costo * cant);

    if (!reales[c.insumo_id]) reales[c.insumo_id] = { cant: 0, costo: 0 };
    reales[c.insumo_id].cant += cant;
    reales[c.insumo_id].costo += (costo * cant);
  });

  // 2. Armar tabla comparativa (simulada para el ejemplo, cruzando con los reales)
  const filas = Object.keys(reales).map(insId => {
    const ins = insumosMaestros.find(i => i.id === insId);
    const real = reales[insId];

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 8px;">${esc(ins?.nombre || 'Insumo')}</td>
        <td style="padding: 8px; text-align: right;">${num(real.cant)} ${esc(ins?.unidad_consumo || '')}</td>
        <td style="padding: 8px; text-align: right;">${money(real.costo)}</td>
      </tr>
    `;
  }).join('');

  abrirModal({
    title: `Costos Reales - OP: ${op.numero_op}`,
    body: `
      <div style="margin-bottom: 16px; padding: 16px; background: var(--surface-2); border-radius: 8px; border: 1px solid var(--border);">
        <div style="font-size: 12px; color: var(--text-secondary); text-transform: uppercase;">Costo Real Total</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${money(costoRealTotal)}</div>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead><tr style="border-bottom: 1px solid var(--border); text-align: left;">
          <th style="padding: 8px; color: var(--text-secondary);">Insumo Consumido</th>
          <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Cantidad Real</th>
          <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Costo Total</th>
        </tr></thead>
        <tbody>${filas || '<tr><td colspan="3" style="text-align:center; padding:16px;">No hay consumos registrados.</td></tr>'}</tbody>
      </table>
    `,
    footer: `<button id="btn-close" style="padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-close').onclick = cerrarModal;
    }
  });
}