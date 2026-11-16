import { esc, num } from '../../core/formatters.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderOrdenesCompra(container, ocs) {
  const filas = ocs.map(oc => {
    const enProceso = oc.pendiente > 0;
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-weight: bold;">${esc(oc.oc)}</td>
        <td style="padding: 10px 12px;">${esc(oc.proveedor)}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(oc.fecha).toLocaleDateString('es-CO')}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: ${enProceso ? 'var(--warning)' : 'var(--success)'};">
          ${enProceso ? num(oc.pendiente) : 'Completada'}
        </td>
        <td style="padding: 10px 12px; text-align: right;">
          <button data-ver="${oc.oc}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Ver Detalle</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Órdenes de Compra</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Seguimiento de saldos pendientes por proveedor.</p>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">N° OC</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Proveedor</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Último Movimiento</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Saldo Pendiente</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>${ocs.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay OCs registradas.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-ver]').forEach(btn => {
    btn.onclick = () => {
      const ocData = ocs.find(o => o.oc === btn.dataset.ver);
      const filasDetalle = ocData.items.map(i => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 8px; color: var(--text-secondary); font-size: 12px;">${new Date(i.fecha).toLocaleDateString('es-CO')}</td>
          <td style="padding: 8px;">${esc(i.insumos?.nombre)}</td>
          <td style="padding: 8px; text-align: right; font-weight: 600;">+${num(i.cantidad)}</td>
          <td style="padding: 8px; text-align: right; font-size: 12px;">${esc(i.observaciones || '')}</td>
        </tr>
      `).join('');

      abrirModal({
        title: `Historial de Entregas · OC ${ocData.oc}`,
        body: `
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead><tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 8px; color: var(--text-secondary);">Fecha</th>
              <th style="padding: 8px; color: var(--text-secondary);">Insumo</th>
              <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Recibido</th>
              <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Ref</th>
            </tr></thead>
            <tbody>${filasDetalle}</tbody>
          </table>
        `,
        footer: `<button id="btn-close" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
        onOpen: (overlay) => { overlay.querySelector('#btn-close').onclick = cerrarModal; }
      });
    };
  });
}