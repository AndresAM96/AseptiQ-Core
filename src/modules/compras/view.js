import { esc, num, money } from '../../core/formatters.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderCompras(container, movimientos) {
  // Agrupar por proveedor
  const porProv = {};
  let totalGlobal = 0;
  let totalEntradas = 0;

  movimientos.forEach(m => {
    const provId = m.insumo_lotes.proveedor_id; // <-- CAMBIO AQUÍ
    const costo = Number(m.costo_unitario_momento) || 0;
    const cant = Number(m.cantidad) || 0;
    const subtotal = costo * cant;

    totalGlobal += subtotal;
    totalEntradas++;

    if (!porProv[provId]) {
      porProv[provId] = {
        id: provId,
        nombre: m.insumo_lotes.sys_proveedores.razon_social,
        total: 0,
        entradas: 0,
        movs: []
      };
    }
    porProv[provId].total += subtotal;
    porProv[provId].entradas++;
    porProv[provId].movs.push(m);
  });

  const proveedores = Object.values(porProv).sort((a, b) => b.total - a.total);

  const filas = proveedores.map(p => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; font-weight: 500;">${esc(p.nombre)}</td>
      <td style="padding: 10px 12px; text-align: right; color: var(--accent); font-weight: 600;">${money(p.total)}</td>
      <td style="padding: 10px 12px; text-align: right;">${p.entradas}</td>
      <td style="padding: 10px 12px; text-align: right;">
        <button data-ver="${p.id}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Ver Detalle</button>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Compras por Proveedor</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Análisis de todas las entradas de mercancía agrupadas por proveedor.</p>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Total Comprado</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${money(totalGlobal)}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Entradas Registradas</div>
        <div style="font-size: 24px; font-weight: 700;">${totalEntradas}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase; font-weight: 600; margin-bottom: 8px;">Proveedores Activos</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--info);">${proveedores.length}</div>
      </div>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Proveedor</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Total Comprado</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Entradas</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>${proveedores.length === 0 ? '<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay compras registradas.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;

  // Drill-down (Modal)
  container.querySelectorAll('[data-ver]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.ver;
      const p = proveedores.find(x => x.id === id);

      const filasDetalle = p.movs.map(m => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 8px; color: var(--text-secondary); font-size: 12px;">${new Date(m.fecha).toLocaleDateString('es-CO')}</td>
          <td style="padding: 8px;">${num(m.cantidad)} ${esc(m.unidad_compra || '')}</td>
          <td style="padding: 8px; text-align: right;">${money(m.costo_unitario_momento)}</td>
          <td style="padding: 8px; text-align: right; font-weight: 600;">${money(m.costo_unitario_momento * m.cantidad)}</td>
        </tr>
      `).join('');

      abrirModal({
        title: `Detalle de Compras: ${p.nombre}`,
        body: `
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead><tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 8px; color: var(--text-secondary);">Fecha</th>
              <th style="padding: 8px; color: var(--text-secondary);">Cantidad</th>
              <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Costo U.</th>
              <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Total</th>
            </tr></thead>
            <tbody>${filasDetalle}</tbody>
          </table>
        `,
        footer: `<button id="btn-close" style="padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
        onOpen: (overlay) => {
          overlay.querySelector('#btn-close').onclick = cerrarModal;
        }
      });
    };
  });
}