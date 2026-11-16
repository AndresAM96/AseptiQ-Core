import { esc, money } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderProductos(container, data) {
  const { productos, bom } = data;

  const filas = productos.map(prod => {
    // Contar cuántos insumos tiene la receta
    const receta = bom.filter(b => b.codigo_pt === prod.codigo_pt);
    const esterilBadge = prod.requiere_esterilizacion
      ? '<span style="color: var(--accent); font-weight: 600;">Sí</span>'
      : '<span style="color: var(--text-muted);">No</span>';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(prod.codigo_pt)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(prod.nombre)}</td>
        <td style="padding: 10px 12px; text-align: center;">${prod.unidades_por_caja}</td>
        <td style="padding: 10px 12px; text-align: right;">${prod.precio_venta ? money(prod.precio_venta) : '—'}</td>
        <td style="padding: 10px 12px; text-align: center;">${esterilBadge}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${receta.length} insumos</span>
        </td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-edit="${prod.codigo_pt}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px;">Editar</button>
          <button data-del="${prod.codigo_pt}" data-nombre="${esc(prod.nombre)}" style="background: transparent; border: 1px solid var(--border); color: var(--danger); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Productos Terminados (BOM)</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Catálogo de paquetes y sus recetas de insumos.</p>
      </div>
      <button id="btn-nuevo-prod" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Nuevo Paquete</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código PT</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Nombre</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Und/Caja</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Precio</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">¿Estéril?</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Receta</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${productos.length === 0 ? '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay productos registrados.</td></tr>' : filas}
        </tbody>
      </table>
    </div>
  `;
}

export async function abrirModalProducto(onSave, insumosDisponibles, bomActual, sugerido, producto = null) {
  const isEdit = !!producto;

  const codigo = isEdit ? producto.codigo_pt.replace('PT-', '') : sugerido;
  const nombre = isEdit ? esc(producto.nombre) : '';
  const caja = isEdit ? producto.unidades_por_caja : 1;
  const precio = isEdit ? producto.precio_venta : '';
  const esteril = isEdit ? producto.requiere_esterilizacion : false;

  // Cargar receta actual si estamos editando
  const receta = isEdit && bomActual ? [...bomActual] : [];

  const body = `
    <div style="display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Código PT</label>
        <div style="display: flex;">
          <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">PT-</span>
          <input type="text" id="prod-codigo" value="${codigo}" ${isEdit ? 'disabled' : ''} style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px; opacity: ${isEdit ? '0.6' : '1'};">
        </div>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Nombre del Paquete</label>
        <input type="text" id="prod-nombre" value="${nombre}" placeholder="Ej: Kit Cirugía General" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Und/Caja</label>
        <input type="number" id="prod-caja" value="${caja}" min="1" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Precio Venta (Unitario)</label>
        <input type="number" id="prod-precio" value="${precio}" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div style="grid-column: 2 / -1; display: flex; align-items: flex-end; padding-bottom: 10px;">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;">
          <input type="checkbox" id="prod-esteril" ${esteril ? 'checked' : ''}>
          ¿Requiere Esterilización (Central EO)?
        </label>
      </div>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Receta (Insumos por unidad)</h4>
        <button id="btn-add-insumo" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Agregar insumo</button>
      </div>
      <div id="receta-container" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Aquí va la receta -->
      </div>
    </div>
  `;

  abrirModal({
    title: isEdit ? 'Editar Paquete PT' : 'Nuevo Paquete PT',
    body,
    size: 'lg',
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
          const opciones = insumosDisponibles.map(ins =>
            `<option value="${ins.id}" ${ins.id === r.insumo_id ? 'selected' : ''}>${esc(ins.nombre)} (${esc(ins.unidad_consumo)})</option>`
          ).join('');

          return `
            <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; align-items: center;">
              <select data-idx="${i}" data-field="insumo_id" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
                <option value="">— Seleccionar Insumo —</option>
                ${opciones}
              </select>
              <input type="number" data-idx="${i}" data-field="cantidad" value="${r.cantidad_por_unidad || ''}" step="0.0001" placeholder="Cant. por unidad" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
              <button data-remove="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
            </div>
          `;
        }).join('');

        contenedor.querySelectorAll('select, input').forEach(el => {
          el.onchange = (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            // Manejar el tipo de dato
            receta[idx][field] = field === 'cantidad' ? parseFloat(e.target.value) : e.target.value;
          };
        });

        contenedor.querySelectorAll('[data-remove]').forEach(btn => {
          btn.onclick = (e) => {
            receta.splice(parseInt(e.target.dataset.remove), 1);
            renderReceta();
          };
        });
      };

      overlay.querySelector('#btn-add-insumo').onclick = () => {
        receta.push({ insumo_id: '', cantidad: '' });
        renderReceta();
      };

      renderReceta();

      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      const btnSave = overlay.querySelector('#btn-save');
      btnSave.onclick = async () => {
        try {
          btnSave.textContent = 'Guardando...';
          btnSave.disabled = true;

          // Limpiar receta (quitar filas vacías)
          const recetaLimpia = receta.filter(r => r.insumo_id && r.cantidad > 0).map(r => ({
            insumo_id: r.insumo_id,
            cantidad: r.cantidad
          }));

          const data = {
            codigo_pt: 'PT-' + overlay.querySelector('#prod-codigo').value.trim(),
            es_nuevo: !isEdit,
            nombre: overlay.querySelector('#prod-nombre').value.trim(),
            unidades_por_caja: parseInt(overlay.querySelector('#prod-caja').value) || 1,
            precio_venta: parseFloat(overlay.querySelector('#prod-precio').value) || null,
            requiere_esterilizacion: overlay.querySelector('#prod-esteril').checked,
            insumos: recetaLimpia
          };

          if (!data.nombre) {
            toast('El nombre es obligatorio.', 'error');
            btnSave.textContent = 'Guardar';
            btnSave.disabled = false;
            return;
          }

          await onSave(data);
          cerrarModal();
        } catch (error) {
          toast(error.message, 'error');
          btnSave.textContent = 'Guardar';
          btnSave.disabled = false;
        }
      };
    }
  });
}