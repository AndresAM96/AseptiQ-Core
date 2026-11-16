import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';

export function renderDevoluciones(container, data, onSave) {
  const { insumos, proveedores, devoluciones } = data;

  const filasHistorial = devoluciones.map(d => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(d.fecha).toLocaleDateString('es-CO')}</td>
      <td style="padding: 10px 12px; font-weight: 500;">${esc(d.insumos?.nombre || '—')}</td>
      <td style="padding: 10px 12px; text-align: right; color: var(--danger); font-weight: 600;">-${num(d.cantidad)}</td>
      <td style="padding: 10px 12px; font-size: 12px;">${esc(d.sys_proveedores?.razon_social || '—')}</td>
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${esc(d.observaciones || '')}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Devoluciones a Proveedor</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Registra la salida de insumos defectuosos o sobrantes.</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start;">
      <!-- Formulario -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 14px;">Nueva Devolución</h3>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumo a Devolver</label>
            <select id="dev-insumo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
              <option value="">— Seleccionar —</option>
              ${insumos.map(i => `<option value="${i.id}">${esc(i.nombre)} (${esc(i.codigo)})</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Proveedor</label>
            <select id="dev-proveedor" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
              <option value="">— Seleccionar —</option>
              ${proveedores.map(p => `<option value="${p.id}">${esc(p.razon_social)}</option>`).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad</label>
              <input type="number" id="dev-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote (Opcional)</label>
              <input type="text" id="dev-lote" placeholder="Ej: L-100" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo</label>
            <input type="text" id="dev-motivo" placeholder="Ej: Producto defectuoso" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          </div>

          <button id="btn-guardar-dev" style="margin-top: 8px; background: var(--accent); color: var(--accent-ink); border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">Registrar Devolución</button>
        </div>
      </div>

      <!-- Historial -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
          <h3 style="margin: 0; font-size: 14px;">Últimas Devoluciones</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Proveedor</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Motivo</th>
            </tr>
          </thead>
          <tbody>${devoluciones.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay devoluciones.</td></tr>' : filasHistorial}</tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btn-guardar-dev').onclick = async () => {
    const insumo_id = container.querySelector('#dev-insumo').value;
    const proveedor_id = container.querySelector('#dev-proveedor').value;
    const cantidad = parseFloat(container.querySelector('#dev-cant').value);

    if (!insumo_id || !proveedor_id || !cantidad || cantidad <= 0) {
      return toast('Completa todos los campos obligatorios.', 'error');
    }

    if(!confirm('¿Confirmas la devolución de este inventario?')) return;

    const btn = container.querySelector('#btn-guardar-dev');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      await onSave({
        insumo_id,
        proveedor_id,
        cantidad,
        lote: container.querySelector('#dev-lote').value.trim(),
        motivo: container.querySelector('#dev-motivo').value.trim()
      });
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Registrar Devolución';
    }
  };
}