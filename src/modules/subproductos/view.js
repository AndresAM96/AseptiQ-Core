import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderSubproductos(container, data, handlers) {
  const { subproductos } = data;

  const filas = subproductos.map(sub => {
    const badgeTipo = {
      intermedio: 'info',
      final: 'warning',
      ambos: 'neutral'
    }[sub.tipo] || 'neutral';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(sub.codigo)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(sub.nombre)}</td>
        <td style="padding: 10px 12px;">
          <span style="background: var(--${badgeTipo}-bg, var(--surface-3)); color: var(--${badgeTipo}, var(--text-primary)); padding: 2px 6px; border-radius: 4px; font-size: 11px; text-transform: capitalize;">
            ${esc(sub.tipo)}
          </span>
        </td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600;">${num(sub.existencia_actual)}</td>
        <td style="padding: 10px 12px; text-align: right;">
          <button data-edit="${sub.id}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px;">Editar</button>
          <button data-del="${sub.id}" data-nombre="${esc(sub.nombre)}" style="background: transparent; border: 1px solid var(--border); color: var(--danger); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Subproductos</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Piezas intermedias que se fabrican y se usan en los Paquetes (PT).</p>
      </div>
      <button id="btn-nuevo-sub" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Nuevo Subproducto</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Nombre</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Tipo</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Stock</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>${subproductos.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay subproductos registrados.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;

  container.querySelector('#btn-nuevo-sub').onclick = () => handlers.onNuevo(data.insumos);

  container.querySelectorAll('[data-edit]').forEach(btn => {
    btn.onclick = () => {
      const sub = subproductos.find(s => s.id === btn.dataset.edit);
      handlers.onEditar(sub, data.insumos);
    };
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = () => handlers.onEliminar(btn.dataset.del, btn.dataset.nombre);
  });
}

export function abrirModalSubproducto(insumos, sugerido, sub = null, onSave) {
  const isEdit = !!sub;
  const codigo = isEdit ? sub.codigo.replace('SUB-', '') : sugerido;

  // Estado local para la receta
  const receta = [];

  abrirModal({
    title: isEdit ? 'Editar Subproducto' : 'Nuevo Subproducto',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Código</label>
          <div style="display: flex;">
            <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">SUB-</span>
            <input type="text" id="sub-codigo" value="${codigo}" ${isEdit ? 'disabled' : ''} style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px;">
          </div>
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Nombre</label>
          <input type="text" id="sub-nombre" value="${isEdit ? esc(sub.nombre) : ''}" placeholder="Ej: Batón" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Tipo</label>
          <select id="sub-tipo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            <option value="intermedio" ${isEdit && sub.tipo === 'intermedio' ? 'selected' : ''}>Intermedio</option>
            <option value="final" ${isEdit && sub.tipo === 'final' ? 'selected' : ''}>Final</option>
            <option value="ambos" ${isEdit && sub.tipo === 'ambos' ? 'selected' : ''} ${!isEdit ? 'selected' : ''}>Ambos</option>
          </select>
        </div>
      </div>

      <div style="padding-top: 16px; border-top: 1px dashed var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Receta (Insumos)</h4>
          <button id="btn-add-ins" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Agregar insumo</button>
        </div>
        <div id="receta-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar</button>
    `,
    onOpen: (overlay) => {
      const contenedor = overlay.querySelector('#receta-container');

      const renderReceta = () => {
        if (receta.length === 0) {
          contenedor.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); padding: 8px;">No hay insumos en la receta.</div>';
          return;
        }

        contenedor.innerHTML = receta.map((r, i) => {
          const opciones = insumos.map(ins =>
            `<option value="${ins.id}" ${ins.id === r.insumo_id ? 'selected' : ''}>${esc(ins.nombre)} (${esc(ins.unidad_consumo)})</option>`
          ).join('');

          return `
            <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; align-items: center;">
              <select data-idx="${i}" data-field="insumo_id" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
                <option value="">— Seleccionar Insumo —</option>
                ${opciones}
              </select>
              <input type="number" data-idx="${i}" data-field="cantidad" value="${r.cantidad || ''}" step="0.0001" placeholder="Cant." style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
              <button data-remove="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
            </div>
          `;
        }).join('');

        contenedor.querySelectorAll('select, input').forEach(el => {
          el.onchange = (e) => {
            const idx = parseInt(e.target.dataset.idx);
            receta[idx][e.target.dataset.field] = e.target.dataset.field === 'cantidad' ? parseFloat(e.target.value) : e.target.value;
          };
        });

        contenedor.querySelectorAll('[data-remove]').forEach(btn => {
          btn.onclick = (e) => {
            receta.splice(parseInt(e.target.dataset.remove), 1);
            renderReceta();
          };
        });
      };

      overlay.querySelector('#btn-add-ins').onclick = () => {
        receta.push({ insumo_id: '', cantidad: '' });
        renderReceta();
      };

      renderReceta();

      overlay.querySelector('#btn-cancel').onclick = cerrarModal;
      overlay.querySelector('#btn-save').onclick = async () => {
        const nombre = overlay.querySelector('#sub-nombre').value.trim();
        if (!nombre) return toast('El nombre es obligatorio', 'error');

        // Limpiar receta
        const recetaLimpia = receta.filter(r => r.insumo_id && r.cantidad > 0);

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          await onSave({
            id: isEdit ? sub.id : null,
            codigo: 'SUB-' + overlay.querySelector('#sub-codigo').value.trim(),
            nombre,
            tipo: overlay.querySelector('#sub-tipo').value,
            receta: recetaLimpia
          });
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Guardar';
        }
      };
    }
  });
}