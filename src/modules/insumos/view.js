import { esc, num, money } from '../../core/formatters.js';
import { estadoInsumo } from '../../core/estadoInsumo.js';
import { unidadConsumo, formatearExistencia } from '../../core/cadena.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

/**
 * Genera el HTML del módulo de insumos.
 */
export function renderInsumos(container, insumos, config) {
  // Mapeo de estado a colores
  const badgeColors = { 'Cubierto': 'success', 'Reorden': 'warning', 'Urgente': 'danger' };

  const filas = insumos.map(ins => {
    const estado = estadoInsumo(ins, config);
    const uC = unidadConsumo(ins);

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(ins.codigo)}</td>
        <td style="padding: 10px 12px;">${esc(ins.nombre)}</td>
        <td style="padding: 10px 12px; text-align: right;">${formatearExistencia(ins, num)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(ins.punto_reorden)} ${uC}</td>
        <td style="padding: 10px 12px; text-align: right;">${money(ins.costo_unitario)}</td>
        <td style="padding: 10px 12px;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: var(--${badgeColors[estado]}-bg, var(--surface-3)); color: var(--${badgeColors[estado]}, var(--text-primary));">
            ${estado}
          </span>
        </td>
        <td style="padding: 10px 12px; text-align: right;">
          <button data-del="${ins.id}" data-nombre="${esc(ins.nombre)}" style="background: transparent; border: 1px solid var(--border); color: var(--danger); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Insumos</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Catálogo de materia prima y material de empaque.</p>
      </div>
      <button id="btn-nuevo-insumo" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Nuevo Insumo</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Nombre</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Existencia</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Reorden</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Costo U.</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${insumos.length === 0 ? '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay insumos registrados.</td></tr>' : filas}
        </tbody>
      </table>
    </div>
  `;

  // Bind de eventos (Botones)
  container.querySelector('#btn-nuevo-insumo').onclick = () => {
    toast('El formulario de creación se implementará en el siguiente paso.', 'info');
  };

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.onclick = async () => {
      // const id = btn.dataset.del;
      const nombre = btn.dataset.nombre;
      if (confirm(`¿Estás seguro de eliminar el insumo "${nombre}"?`)) {
        // Aquí iría la llamada al repositorio para eliminar
        toast(`Insumo "${nombre}" marcado para eliminar (implementación pendiente).`, 'info');
      }
    };
  });
}

/**
 * Abre el modal para crear un insumo.
 */
export async function abrirModalInsumo(onSave, sugerido) {
  const body = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Código</label>
        <div style="display: flex;">
          <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">INS-</span>
          <input type="text" id="ins-codigo" value="${sugerido}" style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px;">
        </div>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Nombre</label>
        <input type="text" id="ins-nombre" placeholder="Ej: Tela SMS" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Stock Objetivo</label>
        <input type="number" id="ins-reorden" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Costo Unitario (Consumo)</label>
        <input type="number" id="ins-costo" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>

    <div style="margin-top: 16px;">
      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-primary); cursor: pointer;">
        <input type="checkbox" id="ins-req-lote" checked>
        ¿Requiere número de lote? (Desmarcar para papelería/consumibles)
      </label>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border);">
      <h4 style="margin: 0 0 12px 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Cadena de Conversión</h4>
      <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 12px; align-items: center;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Unidad de Compra</label>
          <input type="text" id="ins-u-compra" placeholder="Ej: caja" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        <div style="padding-top: 20px; font-weight: bold; color: var(--text-muted);">×</div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Factor (cuántos hay en 1 compra)</label>
          <input type="number" id="ins-factor" value="1" min="1" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        <div style="grid-column: 3;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Unidad de Consumo (Stock)</label>
          <input type="text" id="ins-u-consumo" placeholder="Ej: u" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
      </div>
    </div>
  `;

  abrirModal({
    title: 'Nuevo Insumo',
    body,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      const btnSave = overlay.querySelector('#btn-save');
      btnSave.onclick = async () => {
        try {
          btnSave.textContent = 'Guardando...';
          btnSave.disabled = true;

          const uCompra = overlay.querySelector('#ins-u-compra').value || 'u';
          const factor = parseFloat(overlay.querySelector('#ins-factor').value) || 1;
          const uConsumo = overlay.querySelector('#ins-u-consumo').value || uCompra;

          // Armamos la cadena JSON
          const conversiones = factor > 1
            ? [{ unidad: uCompra, factor: factor }, { unidad: uConsumo, factor: 1 }]
            : [{ unidad: uCompra, factor: 1 }];

          const data = {
            codigo: 'INS-' + overlay.querySelector('#ins-codigo').value.trim(),
            nombre: overlay.querySelector('#ins-nombre').value.trim(),
            unidad_medida: uCompra,
            unidad_consumo: uConsumo,
            punto_reorden: parseFloat(overlay.querySelector('#ins-reorden').value),
            costo_unitario: parseFloat(overlay.querySelector('#ins-costo').value) || 0,
            requiere_lote: overlay.querySelector('#ins-req-lote').checked,
            conversiones: conversiones
          };

          if (!data.nombre || !data.punto_reorden) {
            toast('Nombre y Stock Objetivo son obligatorios.', 'error');
            return;
          }

          await onSave(data);
          cerrarModal();
        } catch (error) {
          toast(error.message, 'error');
        } finally {
          btnSave.textContent = 'Guardar';
          btnSave.disabled = false;
        }
      };
    }
  });
}