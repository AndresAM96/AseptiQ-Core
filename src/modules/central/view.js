import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderCentral(container, data, handlers) {
  const { enCentral } = data;

  const filas = enCentral.map(lote => {
    const badgeReproceso = lote.estado === 'en_reproceso'
      ? ' <span style="color:var(--danger); font-size:10px; font-weight:bold;">(REPROCESO)</span>'
      : '';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px;"><input type="checkbox" class="chk-ciclo" value="${lote.id}" data-cant="${lote.cantidad_actual}" data-nombre="${esc(lote.productos_terminados?.nombre)}" data-op="${esc(lote.ordenes_semanales?.numero_op)}" style="cursor: pointer;"></td>
        <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(lote.ordenes_semanales?.numero_op)}${badgeReproceso}</td>
        <td style="padding: 10px 12px;">${esc(lote.productos_terminados?.nombre)}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${num(lote.cantidad_actual)}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Central de Esterilización</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Selecciona las cajas que entrarán al ciclo de esterilización.</p>
      </div>
      <button id="btn-ciclo" style="background: var(--success); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Registrar Ciclo EO</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; width: 40px;"></th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">OP (Lote)</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Disponible</th>
          </tr>
        </thead>
        <tbody>${enCentral.length === 0 ? '<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay producto pendiente de esterilizar.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;

  container.querySelector('#btn-ciclo').onclick = () => {
    const checkboxes = container.querySelectorAll('.chk-ciclo:checked');
    if (checkboxes.length === 0) return toast('Selecciona al menos un lote para esterilizar.', 'error');

    // Enviamos los lotes seleccionados con su info
    const items = Array.from(checkboxes).map(chk => ({
      lote_pt_id: chk.value,
      max_disponible: parseFloat(chk.dataset.cant),
      nombre: chk.dataset.nombre,
      op: chk.dataset.op
    }));

    handlers.onCiclo(items);
  };
}

export function abrirModalCicloEO(itemsSeleccionados, onSave) {
  // Generar inputs para cada lote seleccionado
  const filasItems = itemsSeleccionados.map((item, idx) => `
    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; align-items: center; border-bottom: 1px solid var(--border); padding: 8px 0;">
      <div>
        <div style="font-weight: 600; font-size: 12.5px; font-family: var(--font-mono);">${item.op}</div>
        <div style="font-size: 11.5px; color: var(--text-secondary);">${item.nombre}</div>
      </div>
      <div>
        <label style="display: block; font-size: 10px; color: var(--success);">A Esterilizar</label>
        <input type="number" class="inp-rec" data-idx="${idx}" value="${item.max_disponible}" max="${item.max_disponible}" min="0" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 6px; font-size: 12px; background: var(--surface-2); color: var(--text-primary);">
      </div>
      <div>
        <label style="display: block; font-size: 10px; color: var(--danger);">Rechazado</label>
        <input type="number" class="inp-rech" data-idx="${idx}" value="0" max="${item.max_disponible}" min="0" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; padding: 6px; font-size: 12px; background: var(--surface-2); color: var(--text-primary);">
      </div>
    </div>
  `).join('');

  abrirModal({
    title: 'Registrar Ciclo de Esterilización',
    body: `
      <div style="margin-bottom: 16px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote de Carga EO</label>
        <input type="text" id="eo-numero" placeholder="Ej: EO-100" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      
      <div style="margin-top: 16px;">
        <h4 style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px;">Ajusta las cantidades a procesar en este ciclo:</h4>
        <div style="max-height: 200px; overflow-y: auto; padding-right: 4px;">
          ${filasItems}
        </div>
      </div>
    `,
    size: 'md',
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--success); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Confirmar Ciclo</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      overlay.querySelector('#btn-save').onclick = async () => {
        const numero_carga = overlay.querySelector('#eo-numero').value.trim();
        if (!numero_carga) return toast('El Lote EO es obligatorio', 'error');

        const payload = [];
        let error = false;

        itemsSeleccionados.forEach((item, idx) => {
          const rec = parseFloat(overlay.querySelector(`.inp-rec[data-idx="${idx}"]`).value) || 0;
          const rech = parseFloat(overlay.querySelector(`.inp-rech[data-idx="${idx}"]`).value) || 0;

          if (rec < 0 || rech < 0) {
            toast('Las cantidades no pueden ser negativas', 'error');
            error = true;
          }
          if (rec + rech === 0) {
             // Ignoramos este item si no se procesa nada
             return;
          }
          if (rec + rech > item.max_disponible) {
            toast(`La suma de procesadas y rechazadas supera el disponible para ${item.op}`, 'error');
            error = true;
          }

          payload.push({
            lote_pt_id: item.lote_pt_id,
            cantidad_recibida: rec,
            cantidad_rechazada: rech
          });
        });

        if (error) return;
        if (payload.length === 0) return toast('Debes procesar al menos una caja.', 'error');

        await onSave(numero_carga, payload);
        cerrarModal();
      };
    }
  });
}