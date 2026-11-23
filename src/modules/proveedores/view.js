import { esc } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';

export function renderProveedores(container, proveedores) {
  const filas = proveedores
    .map((prov) => {
      // Formatear contactos uno debajo del otro
      const contactosHtml =
        (prov.contactos || [])
          .map(
            (c) => `
      <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 2px;">
        ${esc(c.nombre)} ${c.telefono ? `- ${esc(c.telefono)}` : ''} ${c.correo ? `- ${esc(c.correo)}` : ''}
      </div>
    `
          )
          .join('') || '<span style="color: var(--text-muted);">—</span>';

      return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(prov.nit)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(prov.razon_social)}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12.5px;">${esc(prov.direccion || '—')}</td>
        <td style="padding: 10px 12px;">${contactosHtml}</td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-detail="${prov.id}" title="Ver detalles" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${icono('eye', 'sm')}
          </button>
          <button data-del="${prov.id}" data-nombre="${esc(prov.razon_social)}" title="Eliminar proveedor" style="background: transparent; border: 1px solid var(--border); color: var(--danger); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
            ${icono('trash', 'sm')}
          </button>
        </td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Proveedores</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Maestro de proveedores con dirección y contactos.</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-prov" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-prov" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Listado</h3>
          <span class="badge" style="font-size: 11px; background: var(--info); color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${proveedores.length} proveedores</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-export-prov" class="secondary small" title="Descargar CSV" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
            ${icono('download', 'sm')} Exportar CSV
          </button>
          <button id="btn-nuevo-prov" class="btn-add" title="Crear proveedor" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <input type="text" id="buscar_prov" placeholder="Buscar por razón social o NIT..." style="flex: 1 1 220px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
          </div>
          
          <div style="overflow-x: auto;">
            <table id="tablaProv" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">NIT</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Razón Social</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Dirección</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Contactos</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>${proveedores.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay proveedores registrados.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica de UI
  const panel = container.querySelector('#panel-prov');
  const header = container.querySelector('#header-prov');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  const inputBuscar = container.querySelector('#buscar_prov');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaProv tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}

export function abrirModalDetalleProveedor(prov, onEdit) {
  const contactosHtml =
    (prov.contactos || [])
      .map(
        (c) => `
    <div style="background: var(--surface-2); padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border); margin-bottom: 8px;">
      <div style="font-weight: 600; font-size: 13px;">${esc(c.nombre)}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
        ${c.telefono ? `📞 ${esc(c.telefono)}` : ''} 
        ${c.correo ? `✉️ ${esc(c.correo)}` : ''}
      </div>
    </div>
  `
      )
      .join('') ||
    '<div style="color: var(--text-muted); font-size: 13px;">Sin contactos registrados.</div>';

  abrirModal({
    title: esc(prov.razon_social),
    subtitle: `NIT: ${esc(prov.nit)}`,
    icon: icono('truck', 'lg'),
    size: 'md',
    body: `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Información General</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><div style="font-size: 11px; color: var(--text-secondary);">NIT</div><div style="font-weight: 500; font-family: var(--font-mono);">${esc(prov.nit)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Razón Social</div><div style="font-weight: 500;">${esc(prov.razon_social)}</div></div>
          <div style="grid-column: 1/-1;"><div style="font-size: 11px; color: var(--text-secondary);">Dirección</div><div style="font-weight: 500;">${esc(prov.direccion || '—')}</div></div>
        </div>
      </div>

      <div>
        <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Contactos</div>
        ${contactosHtml}
      </div>
    `,
    footer: `
      <button id="btn-cerrar-det" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>
      <button id="btn-editar-det" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        ${icono('pencil', 'sm')} Editar
      </button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cerrar-det').onclick = () => cerrarModal();
      overlay.querySelector('#btn-editar-det').onclick = () => {
        cerrarModal();
        setTimeout(() => onEdit(), 250); // Esperar a que cierre el anterior
      };
    },
  });
}

export function abrirModalProveedor(proveedor, onSave) {
  const isEdit = !!proveedor;
  const nit = isEdit ? esc(proveedor.nit) : '';
  const razon = isEdit ? esc(proveedor.razon_social) : '';
  const dir = isEdit ? esc(proveedor.direccion || '') : '';
  const contactos =
    isEdit && proveedor.contactos
      ? [...proveedor.contactos]
      : [{ nombre: '', telefono: '', correo: '' }];

  abrirModal({
    title: isEdit ? 'Editar Proveedor' : 'Nuevo Proveedor',
    subtitle: 'Se agregará al maestro y quedará disponible en las entradas.',
    icon: icono(isEdit ? 'pencil' : 'plus', 'lg'),
    size: 'md',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px; margin-bottom: 24px;">
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

      <div style="padding-top: 16px; border-top: 1px dashed var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Contactos</h4>
          <button id="btn-add-contacto" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Agregar contacto</button>
        </div>
        <div id="contactos-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">${isEdit ? 'Guardar cambios' : 'Crear proveedor'}</button>
    `,
    onOpen: (overlay) => {
      const contenedor = overlay.querySelector('#contactos-container');

      const renderContactos = () => {
        contenedor.innerHTML = contactos
          .map(
            (c, i) => `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: center;">
            <input type="text" data-idx="${i}" data-field="nombre" value="${esc(c.nombre || '')}" placeholder="Nombre" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
            <input type="text" data-idx="${i}" data-field="telefono" value="${esc(c.telefono || '')}" placeholder="Teléfono" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
            <input type="email" data-idx="${i}" data-field="correo" value="${esc(c.correo || '')}" placeholder="Correo" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px; font-size: 12.5px;">
            <button data-remove="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
          </div>
        `
          )
          .join('');

        contenedor.querySelectorAll('input').forEach((inp) => {
          inp.onchange = (e) => {
            contactos[parseInt(e.target.dataset.idx)][e.target.dataset.field] = e.target.value;
          };
        });

        contenedor.querySelectorAll('[data-remove]').forEach((btn) => {
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

      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const data = {
          nit: overlay.querySelector('#prov-nit').value.trim(),
          razon_social: overlay.querySelector('#prov-razon').value.trim(),
          direccion: overlay.querySelector('#prov-dir').value.trim() || null,
          contactos: contactos.filter(
            (c) => c.nombre.trim() !== '' || c.telefono.trim() !== '' || c.correo.trim() !== ''
          ),
        };

        if (!data.nit || !data.razon_social)
          return toast('NIT y Razón Social son obligatorios.', 'error');

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          await onSave(isEdit ? proveedor.id : null, data);
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = isEdit ? 'Guardar cambios' : 'Crear proveedor';
        }
      };
    },
  });
}