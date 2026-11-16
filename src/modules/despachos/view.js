import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderDespachos(container, data, handlers) {
  const { despachos } = data;

  const filas = despachos.map(d => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO')}</td>
      <td style="padding: 10px 12px; font-weight: 500;">${esc(d.cliente)}</td>
      <td style="padding: 10px 12px;">${esc(d.codigo_pt)}</td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--danger);">-${num(d.cantidad)}</td>
      <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(d.lote_op)}</td>
      <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(d.lote_eo || '—')}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Despachos</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Salida de producto terminado a clientes.</p>
      </div>
      <button id="btn-nuevo-desp" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Registrar Despacho</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Cliente</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote OP</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote EO</th>
          </tr>
        </thead>
        <tbody>
          ${despachos.length === 0 ? '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay despachos registrados.</td></tr>' : filas}
        </tbody>
      </table>
    </div>
  `;

  container.querySelector('#btn-nuevo-desp').onclick = () => handlers.onNuevo(data.productos);
}

export function abrirModalDespacho(productos, onGetLotes, onSave) {
  const opcionesProds = productos
    .filter(p => p.existencia_actual > 0)
    .map(p => `<option value="${p.codigo_pt}" data-stock="${p.existencia_actual}">${esc(p.nombre)} (Stock: ${num(p.existencia_actual)})</option>`)
    .join('');

  abrirModal({
    title: 'Registrar Despacho',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="grid-column: 1 / -1;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cliente</label>
          <input type="text" id="desp-cliente" placeholder="Nombre del cliente" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        
        <div style="grid-column: 1 / -1;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Producto</label>
          <select id="desp-pt" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            <option value="">— Seleccionar —</option>
            ${opcionesProds}
          </select>
        </div>

        <div style="grid-column: 1 / -1;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote Disponible (FIFO sugerido)</label>
          <select id="desp-lote" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;" disabled>
            <option value="">— Selecciona un producto primero —</option>
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Despachar</label>
          <input type="number" id="desp-cant" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha Despacho</label>
          <input type="date" id="desp-fecha" value="${new Date().toISOString().slice(0,10)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Despachar</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      const selPT = overlay.querySelector('#desp-pt');
      const selLote = overlay.querySelector('#desp-lote');
      const inpCant = overlay.querySelector('#desp-cant');

      // Al cambiar el producto, cargar sus lotes FIFO
      selPT.onchange = async () => {
        const pt = selPT.value;
        if (!pt) {
          selLote.innerHTML = '<option value="">— Selecciona un producto primero —</option>';
          selLote.disabled = true;
          return;
        }

        selLote.innerHTML = '<option value="">Cargando lotes...</option>';
        selLote.disabled = true;

        try {
          const lotes = await onGetLotes(pt);
          if (lotes.length === 0) {
            selLote.innerHTML = '<option value="">Sin stock disponible en bodega</option>';
            return;
          }

          // Renderizar lotes (ya vienen ordenados por FIFO desde el repositorio)
          selLote.innerHTML = lotes.map((l, i) => `
            <option value="${l.id}" data-op="${l.lote_op}" data-eo="${l.lote_eo || ''}" data-max="${l.cantidad_actual}">
              ${i === 0 ? '⭐ ' : ''}Lote OP: ${l.lote_op} ${l.lote_eo ? `| EO: ${l.lote_eo}` : ''} (Disp: ${num(l.cantidad_actual)})
            </option>
          `).join('');
          selLote.disabled = false;

          // Auto-seleccionar el más antiguo y poner el máximo en cantidad
          if (lotes.length > 0) {
            inpCant.value = lotes[0].cantidad_actual;
            inpCant.max = lotes[0].cantidad_actual;
          }
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      // Actualizar el max del input cantidad al cambiar de lote
      selLote.onchange = () => {
        const opt = selLote.options[selLote.selectedIndex];
        if (opt && opt.dataset.max) {
          inpCant.max = opt.dataset.max;
          if (parseFloat(inpCant.value) > parseFloat(opt.dataset.max)) {
            inpCant.value = opt.dataset.max;
          }
        }
      };

      overlay.querySelector('#btn-save').onclick = async () => {
        const cliente = overlay.querySelector('#desp-cliente').value.trim();
        const cant = parseFloat(inpCant.value);
        const selOpt = selLote.options[selLote.selectedIndex];

        if (!cliente) return toast('El nombre del cliente es obligatorio', 'error');
        if (!selPT.value || !selOpt.value) return toast('Selecciona un producto y un lote', 'error');
        if (!cant || cant <= 0 || cant > parseFloat(selOpt.dataset.max)) return toast('Cantidad inválida o excede el stock del lote', 'error');

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Despachando...';

        try {
          await onSave({
            codigo_pt: selPT.value,
            cantidad: cant,
            cliente,
            lote_op: selOpt.dataset.op,
            lote_eo: selOpt.dataset.eo,
            fecha: overlay.querySelector('#desp-fecha').value
          });
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Despachar';
        }
      };
    }
  });
}