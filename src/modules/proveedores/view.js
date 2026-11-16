import { esc } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderProveedores(container, proveedores) {
  const filas = proveedores.map(prov => {
    // Formatear contactos
    const contactosHtml = (prov.contactos || []).map(c => `
      <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">
        <b>${esc(c.nombre)}</b> ${c.telefono ? `· ${esc(c.telefono)}` : ''} ${c.correo ? `· ${esc(c.correo)}` : ''}
      </div>
    `).join('') || '<span style="color: var(--text-muted);">—</span>';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(prov.nit)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(prov.razon_social)}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary);">${esc(prov.direccion || '—')}</td>
        <td style="padding: 10px 12px;">${contactosHtml}</td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-edit="${prov.id}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px;">Editar</button>
          <button data-del="${prov.id}" data-nombre="${esc(prov.razon_social)}" style="background: transparent; border: 1px solid var(--border); color: var(--danger); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Proveedores</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Maestro de proveedores y contactos.</p>
      </div>
      <button id="btn-nuevo-prov" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">+ Nuevo Proveedor</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">NIT</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Razón Social</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Dirección</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Contactos</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${proveedores.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay proveedores registrados.</td></tr>' : filas}
        </tbody>
      </table>
    </div>
  `;
}

export async function abrirModalProveedor(onSave, proveedor = null) {
  const isEdit = !!proveedor;
  const nit = isEdit ? esc(proveedor.nit) : '';
  const razon = isEdit ? esc(proveedor.razon_social) : '';
  const dir = isEdit ? esc(proveedor.direccion || '') : '';
  const contactos = isEdit && proveedor.contactos ? [...proveedor.contactos] : [];

  const body = `
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">NIT</label>
        <input type="text" id="prov-nit" value="${nit}" placeholder="Ej: 900123456-1" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px; font-family: var(--font-mono);">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Razón Social</label>
        <input type="text" id="prov-razon" value="${razon}" placeholder="Nombre de la empresa" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div style="grid-column: 1 / -1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Dirección</label>
        <input type="text" id="prov-dir" value="${dir}" placeholder="Opcional" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Contactos</h4>
        <button id="btn-add-contacto" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Agregar contacto</button>
      </div>
      <div id="contactos-container" style="display: flex; flex-direction: column; gap: 8px;">
        <!-- Aquí se inyectan dinámicamente -->
      </div>
    </div>
  `;

  abrirModal({
    title: isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor',
    body,
    size: 'lg',
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar</button>
    `,
    onOpen: (overlay) => {
      const contenedor = overlay.querySelector('#contactos-container');

      const renderContactos = () => {
        contenedor.innerHTML = contactos.map((c, i) => `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: center;">
            <input type="text" data-idx="${i}" data-field="nombre" value="${esc(c.nombre || '')}" placeholder="Nombre" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
            <input type="text" data-idx="${i}" data-field="telefono" value="${esc(c.telefono || '')}" placeholder="Teléfono" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
            <input type="email" data-idx="${i}" data-field="correo" value="${esc(c.correo || '')}" placeholder="Correo" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
            <button data-remove="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
          </div>
        `).join('');

        // Bind inputs para actualizar el array
        contenedor.querySelectorAll('input').forEach(inp => {
          inp.onchange = (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            contactos[idx][field] = e.target.value;
          };
        });

        // Bind botones de eliminar
        contenedor.querySelectorAll('[data-remove]').forEach(btn => {
          btn.onclick = (e) => {
            contactos.splice(parseInt(e.target.dataset.remove), 1);
            renderContactos();
          };
        });
      };

      overlay.querySelector('#btn-add-contacto').onclick = () => {
        contactos.push({ nombre: '', telefono: '', correo: '' });
        renderContactos();
      };

      renderContactos();

      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      const btnSave = overlay.querySelector('#btn-save');
      btnSave.onclick = async () => {
        try {
          btnSave.textContent = 'Guardando...';
          btnSave.disabled = true;

          const data = {
            nit: overlay.querySelector('#prov-nit').value.trim(),
            razon_social: overlay.querySelector('#prov-razon').value.trim(),
            direccion: overlay.querySelector('#prov-dir').value.trim() || null,
            contactos: contactos.filter(c => c.nombre.trim() !== '' || c.telefono.trim() !== '' || c.correo.trim() !== '')
          };

          if (!data.nit || !data.razon_social) {
            toast('NIT y Razón Social son obligatorios.', 'error');
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