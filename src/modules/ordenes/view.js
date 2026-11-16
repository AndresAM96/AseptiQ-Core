import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderOrdenes(container, data, handlers) {
  const { productos, ordenes } = data;

  // Badges de estado
  const getEstadoBadge = (estado) => {
    const colores = { 'Pendiente': 'warning', 'En proceso': 'info', 'Terminada': 'success', 'Cancelada': 'danger' };
    const color = colores[estado] || 'neutral';
    return `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: var(--${color}-bg, var(--surface-3)); color: var(--${color}, var(--text-primary));">${estado}</span>`;
  };

  const filas = ordenes.map(op => {
    const fechaProg = op.fecha_programada ? new Date(op.fecha_programada + 'T12:00:00').toLocaleDateString('es-CO') : '—';
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-weight: 600;">${esc(op.numero_op || 'S/N')}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--text-secondary);">${esc(op.lote)}</td>
        <td style="padding: 10px 12px;">${esc(op.codigo_pt)}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 500;">${num(op.cantidad_proyectada)}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--success);">${num(op.cantidad_producida)}</td>
        <td style="padding: 10px 12px; text-align: center;">${fechaProg}</td>
        <td style="padding: 10px 12px; text-align: center;">${getEstadoBadge(op.estado_op)}</td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          ${op.estado_op !== 'Terminada' && op.estado_op !== 'Cancelada'
            ? `<button data-entregar="${op.id}" data-pendiente="${op.cantidad_proyectada - op.cantidad_producida}" data-nombre="${esc(op.numero_op)}" style="background: var(--success); color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Entregar</button>`
            : ''}
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Cargar Orden (OP)</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Planifica la producción y calcula la cobertura de insumos.</p>
      </div>
      <button id="btn-nueva-op" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Nueva OP</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">N° OP</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código PT</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Proyectado</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Producido</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">F. Programada</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Estado</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${ordenes.length === 0 ? '<tr><td colspan="8" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay órdenes registradas.</td></tr>' : filas}
        </tbody>
      </table>
    </div>
  `;

  // Bindings
  container.querySelector('#btn-nueva-op').onclick = () => handlers.onNueva(productos);

  container.querySelectorAll('[data-entregar]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.entregar;
      const pendiente = parseFloat(btn.dataset.pendiente);
      const nombre = btn.dataset.nombre;
      handlers.onEntregar(id, pendiente, nombre);
    };
  });
}

export function abrirModalNuevaOP(productos, sugerido, onCalcular) {
  const opcionesProds = productos.map(p =>
    `<option value="${p.codigo_pt}" data-caja="${p.unidades_por_caja}">${esc(p.nombre)}</option>`
  ).join('');

  const body = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Número de OP</label>
        <div style="display: flex;">
          <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">OP-</span>
          <input type="text" id="op-numero" value="${sugerido}" style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px;">
        </div>
      </div>
      
      <div style="grid-column: 1 / -1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Producto Terminado</label>
        <select id="op-pt" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="">— Seleccionar —</option>
          ${opcionesProds}
        </select>
      </div>

      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Producir</label>
        <input type="number" id="op-cant" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        <div id="op-cant-hint" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;"></div>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Prioridad</label>
        <select id="op-prioridad" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="3">Normal</option>
          <option value="1">Muy Alta</option>
          <option value="2">Alta</option>
          <option value="4">Baja</option>
        </select>
      </div>

      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha Inicio (Opcional)</label>
        <input type="date" id="op-fecha" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha Fin (Opcional)</label>
        <input type="date" id="op-fecha-fin" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>
  `;

  abrirModal({
    title: 'Nueva Orden de Producción',
    body,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-calcular" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Calcular Cobertura</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      // Preview de cajas
      const selPT = overlay.querySelector('#op-pt');
      const inpCant = overlay.querySelector('#op-cant');
      const hint = overlay.querySelector('#op-cant-hint');

      const updateHint = () => {
        const opt = selPT.options[selPT.selectedIndex];
        if (!opt || !opt.dataset.caja) { hint.textContent = ''; return; }
        const caja = parseInt(opt.dataset.caja) || 1;
        const cant = parseFloat(inpCant.value) || 0;
        hint.textContent = (cant > 0 && caja > 1) ? `≈ ${Math.ceil(cant / caja)} cajas` : '';
      };
      selPT.onchange = updateHint;
      inpCant.oninput = updateHint;

      const btnCalcular = overlay.querySelector('#btn-calcular');
      btnCalcular.onclick = () => {
        const codigo_pt = selPT.value;
        const cantidad = parseFloat(inpCant.value);
        const numero_op = overlay.querySelector('#op-numero').value.trim();

        if (!codigo_pt || !cantidad || cantidad <= 0) return toast('Selecciona producto y cantidad válida.', 'error');
        if (!numero_op) return toast('El Número de OP es obligatorio.', 'error');

        const data = {
          codigo_pt,
          cantidad,
          numero_op: 'OP-' + numero_op.replace('OP-', ''),
          prioridad: parseInt(overlay.querySelector('#op-prioridad').value),
          fecha_programada: overlay.querySelector('#op-fecha').value,
          fecha_fin_programada: overlay.querySelector('#op-fecha-fin').value
        };

        onCalcular(data);
      };
    }
  });
}

export function abrirModalCobertura(data, simulacion, insumos, onConfirmar) {
  // Cruzar requerimientos con stock real
  const reqs = simulacion.insumo_req || {};
  let hayFaltantes = false;

  const filas = Object.keys(reqs).map(ins_id => {
    const ins = insumos.find(i => i.id === ins_id);
    if (!ins) return '';

    const requerido = reqs[ins_id];
    const stock = ins.existencia_actual;
    const faltante = Math.max(0, requerido - stock);
    if (faltante > 0) hayFaltantes = true;

    const color = faltante > 0 ? 'var(--danger)' : 'var(--success)';
    const badge = faltante > 0
      ? '<span style="color: var(--danger); font-weight: 600;">Faltan</span>'
      : '<span style="color: var(--success);">OK</span>';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-weight: 500;">${esc(ins.nombre)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(requerido)} ${esc(ins.unidad_consumo)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(stock)} ${esc(ins.unidad_consumo)}</td>
        <td style="padding: 10px 12px; text-align: right; color: ${color}; font-weight: 600;">${faltante > 0 ? num(faltante) : '—'}</td>
        <td style="padding: 10px 12px; text-align: center;">${badge}</td>
      </tr>
    `;
  }).join('');

  const body = `
    <div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background: var(--${hayFaltantes ? 'danger' : 'success'}-bg); border: 1px solid var(--${hayFaltantes ? 'danger' : 'success'}); color: var(--${hayFaltantes ? 'danger' : 'success'}); font-weight: 500;">
      ${hayFaltantes ? '⚠ Hay insumos faltantes. Puedes confirmar la orden, pero quedará en estado Pendiente.' : '✓ Todos los insumos están cubiertos. Listo para producir.'}
    </div>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Requerido</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">En Stock</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Faltante</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Estado</th>
        </tr>
      </thead>
      <tbody>${filas || '<tr><td colspan="5" style="padding: 16px; text-align: center;">Esta receta no requiere insumos.</td></tr>'}</tbody>
    </table>
  `;

  abrirModal({
    title: 'Cobertura de Insumos',
    subtitle: `OP: ${data.numero_op} | Producto: ${data.codigo_pt} | Cant: ${data.cantidad}`,
    body,
    size: 'md',
    footer: `
      <button id="btn-cancel-cob" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Volver</button>
      <button id="btn-confirmar" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Confirmar Orden</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel-cob').onclick = cerrarModal;

      const btnConf = overlay.querySelector('#btn-confirmar');
      btnConf.onclick = async () => {
        btnConf.textContent = 'Confirmando...';
        btnConf.disabled = true;
        try {
          data.estado_cobertura = hayFaltantes ? 'Urgente' : 'Cubierto';
          data.detalle = simulacion;
          await onConfirmar(data);
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          // Esto asegura que el modal se cierre SIEMPRE, incluso si la base de datos falla
          cerrarModal();
        }
      };
    }
  });
}

export function abrirModalEntrega(numero_op, pendiente, onSave) {
  const body = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Entregar (Pendiente: ${pendiente})</label>
        <input type="number" id="ent-cant" value="${pendiente}" min="0.0001" max="${pendiente}" step="0.0001" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <!-- El lote se asigna automáticamente desde la OP -->
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo / Observaciones (Opcional)</label>
        <input type="text" id="ent-motivo" placeholder="Ej: Entrega parcial" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>
  `;

  abrirModal({
    title: `Registrar Entrega - ${numero_op}`,
    body,
    footer: `
      <button id="btn-cancel-ent" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save-ent" style="background: var(--success); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Confirmar Entrega</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel-ent').onclick = cerrarModal;

      overlay.querySelector('#btn-save-ent').onclick = async () => {
        const cant = parseFloat(overlay.querySelector('#ent-cant').value);
        if (!cant || cant <= 0 || cant > pendiente) return toast('Cantidad inválida', 'error');

        const btn = overlay.querySelector('#btn-save-ent');
        btn.disabled = true;
        btn.textContent = 'Entregando...';

        try {
          await onSave(cant, overlay.querySelector('#ent-motivo').value.trim());
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Confirmar Entrega';
        }
      };
    }
  });
}