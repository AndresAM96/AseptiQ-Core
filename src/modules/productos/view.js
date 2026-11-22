import { esc, num, money } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';
import { imprimirHTML } from '../../shared/ui/print.js';

export function renderProductos(container, data) {
  const { productos, bom, paqueteSubs } = data;

  const filas = productos
    .map((p) => {
      const pc = p.unidades_por_caja || 1;
      const recetaCount =
        bom.filter((b) => b.codigo_pt === p.codigo_pt).length +
        paqueteSubs.filter((ps) => ps.codigo_pt === p.codigo_pt).length;

      const isInactivo = p.estado_activo === false;
      const rowStyle = isInactivo ? 'opacity: 0.5; background: var(--surface-2);' : '';
      const badgeInactivo = isInactivo
        ? ' <span class="badge neutral" style="font-size:10px;">Inactivo</span>'
        : '';

      return `
      <tr style="border-bottom: 1px solid var(--border); ${rowStyle}">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(p.codigo_pt)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(p.nombre)}${badgeInactivo}</td>
        <td style="padding: 10px 12px; text-align: center;"><span class="badge info">caja ×${pc}</span></td>
        <td style="padding: 10px 12px; text-align: right;">${p.precio_venta ? money(p.precio_venta) : '—'}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-size: 11px;">${recetaCount} ítems</span>
        </td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-print="${p.codigo_pt}" title="Imprimir etiquetas PT" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${icono('tag', 'sm')}
          </button>
          <button data-detail="${p.codigo_pt}" title="Ver detalles" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${icono('eye', 'sm')}
          </button>
          <button data-toggle="${p.codigo_pt}" data-estado="${p.estado_activo}" title="${isInactivo ? 'Activar' : 'Desactivar'}" style="background: transparent; border: 1px solid var(--border); color: ${isInactivo ? 'var(--success)' : 'var(--text-secondary)'}; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${isInactivo ? icono('check', 'sm') : icono('eye-off', 'sm')}
          </button>
          <button data-del="${p.codigo_pt}" data-nombre="${esc(p.nombre)}" title="Eliminar paquete" style="background: transparent; border: 1px solid var(--border); color: var(--danger); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
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
        <h2 style="font-size: 20px; margin: 0 0 4px;">Productos & BOM</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Catálogo de paquetes terminados y su composición.</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-paquetes" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-paquetes" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Paquetes existentes</h3>
          <span class="badge" style="font-size: 11px; background: var(--info); color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${productos.length} paquetes</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-export-paquetes" class="secondary small" title="Descargar CSV" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
            ${icono('download', 'sm')} Exportar CSV
          </button>
          <button id="btn-nuevo-paquete" class="btn-add" title="Crear nuevo paquete" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <input type="text" id="buscar_paquetes" placeholder="Buscar paquete..." style="flex: 1 1 220px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
          </div>
          
          <div style="overflow-x: auto;">
            <table id="tablaPaquetes" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código PT</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Nombre</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Und/Caja</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Precio Venta</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Receta</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>${productos.length === 0 ? '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay paquetes registrados.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica de UI
  const panel = container.querySelector('#panel-paquetes');
  const header = container.querySelector('#header-paquetes');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  const inputBuscar = container.querySelector('#buscar_paquetes');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaPaquetes tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}

export function abrirModalPaquete(paquete, data, sugerido, onSave) {
  const isEdit = !!paquete;
  const codeNum = isEdit ? paquete.codigo_pt.replace('PT-', '') : sugerido;

  const filasSubs = isEdit
    ? data.paqueteSubs
        .filter((ps) => ps.codigo_pt === paquete.codigo_pt)
        .map((ps) => ({ id: ps.subproducto_id, cantidad: ps.cantidad }))
    : [];
  const filasIns = isEdit
    ? data.bom
        .filter((b) => b.codigo_pt === paquete.codigo_pt)
        .map((b) => ({ id: b.insumo_id, cantidad: b.cantidad_por_unidad }))
    : [];

  const opcionesSubs = data.subproductos
    .map((s) => `<option value="${s.id}">${esc(s.nombre)} (${esc(s.codigo)})</option>`)
    .join('');
  const opcionesIns = data.insumos
    .map((i) => `<option value="${i.id}">${esc(i.nombre)} (${esc(i.unidad_consumo)})</option>`)
    .join('');

  abrirModal({
    title: isEdit ? 'Editar Paquete (PT)' : 'Nuevo Paquete (PT)',
    subtitle: 'Composición del paquete: subproductos + insumos directos.',
    icon: icono(isEdit ? 'pencil' : 'plus', 'lg'),
    size: 'lg',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Código PT</label>
          <div style="display: flex;">
            <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">PT-</span>
            <input type="text" id="pt-codigo" value="${codeNum}" ${isEdit ? 'disabled' : ''} style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px; opacity: ${isEdit ? '0.6' : '1'};">
          </div>
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Nombre</label>
          <input type="text" id="pt-nombre" value="${isEdit ? esc(paquete.nombre) : ''}" placeholder="Ej: Kit Cirugía General" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Unidades por caja</label>
          <input type="number" id="pt-caja" value="${isEdit ? paquete.unidades_por_caja : 1}" min="1" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Precio de Venta</label>
          <input type="number" id="pt-precio" value="${isEdit ? paquete.precio_venta : ''}" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
      </div>

      <!-- BOM Subproductos -->
      <div style="padding-top: 16px; border-top: 1px dashed var(--border); margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Subproductos (por unidad)</h4>
          <button id="btn-add-sub" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Agregar</button>
        </div>
        <div id="subs-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>

      <!-- BOM Insumos -->
      <div style="padding-top: 16px; border-top: 1px dashed var(--border);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Insumos Directos (por unidad)</h4>
          <button id="btn-add-ins" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;">+ Agregar</button>
        </div>
        <div id="ins-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">${isEdit ? 'Guardar cambios' : 'Crear paquete'}</button>
    `,
    onOpen: (overlay) => {
      const contSubs = overlay.querySelector('#subs-container');
      const contIns = overlay.querySelector('#ins-container');

      const renderSubs = () => {
        contSubs.innerHTML = filasSubs
          .map(
            (r, i) => `
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; align-items: center;">
            <select data-idx="${i}" class="sub-select" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
              <option value="">— Seleccionar —</option>${opcionesSubs}
            </select>
            <input type="number" data-idx="${i}" class="sub-cant" value="${r.cantidad || ''}" step="0.0001" placeholder="Cant." style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
            <button data-remove-sub="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
          </div>
        `
          )
          .join('');
        contSubs.querySelectorAll('.sub-select').forEach((el) => {
          el.value = filasSubs[parseInt(el.dataset.idx)].id || '';
          el.onchange = (e) => (filasSubs[parseInt(e.target.dataset.idx)].id = e.target.value);
        });
        contSubs.querySelectorAll('.sub-cant').forEach((el) => {
          el.onchange = (e) =>
            (filasSubs[parseInt(e.target.dataset.idx)].cantidad = parseFloat(e.target.value));
        });
        contSubs.querySelectorAll('[data-remove-sub]').forEach((b) => {
          b.onclick = (e) => {
            filasSubs.splice(parseInt(e.target.dataset.removeSub), 1);
            renderSubs();
          };
        });
      };

      const renderIns = () => {
        contIns.innerHTML = filasIns
          .map(
            (r, i) => `
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; align-items: center;">
            <select data-idx="${i}" class="ins-select" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
              <option value="">— Seleccionar —</option>${opcionesIns}
            </select>
            <input type="number" data-idx="${i}" class="ins-cant" value="${r.cantidad || ''}" step="0.0001" placeholder="Cant." style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
            <button data-remove-ins="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
          </div>
        `
          )
          .join('');
        contIns.querySelectorAll('.ins-select').forEach((el) => {
          el.value = filasIns[parseInt(el.dataset.idx)].id || '';
          el.onchange = (e) => (filasIns[parseInt(e.target.dataset.idx)].id = e.target.value);
        });
        contIns.querySelectorAll('.ins-cant').forEach((el) => {
          el.onchange = (e) =>
            (filasIns[parseInt(e.target.dataset.idx)].cantidad = parseFloat(e.target.value));
        });
        contIns.querySelectorAll('[data-remove-ins]').forEach((b) => {
          b.onclick = (e) => {
            filasIns.splice(parseInt(e.target.dataset.removeIns), 1);
            renderIns();
          };
        });
      };

      overlay.querySelector('#btn-add-sub').onclick = () => {
        filasSubs.push({ id: '', cantidad: '' });
        renderSubs();
      };
      overlay.querySelector('#btn-add-ins').onclick = () => {
        filasIns.push({ id: '', cantidad: '' });
        renderIns();
      };

      renderSubs();
      renderIns();

      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const nombre = overlay.querySelector('#pt-nombre').value.trim();
        if (!nombre) return toast('El nombre es obligatorio', 'error');

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          await onSave({
            codigo_pt: isEdit
              ? paquete.codigo_pt
              : 'PT-' + overlay.querySelector('#pt-codigo').value.trim(),
            es_nuevo: !isEdit,
            nombre,
            unidades_por_caja: parseInt(overlay.querySelector('#pt-caja').value) || 1,
            precio_venta: parseFloat(overlay.querySelector('#pt-precio').value) || null,
            subproductos: filasSubs
              .filter((f) => f.id && f.cantidad > 0)
              .map((f) => ({ subproducto_id: f.id, cantidad: f.cantidad })),
            insumos: filasIns
              .filter((f) => f.id && f.cantidad > 0)
              .map((f) => ({ insumo_id: f.id, cantidad: f.cantidad })),
          });
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = isEdit ? 'Guardar cambios' : 'Crear paquete';
        }
      };
    },
  });
}

export function abrirModalDetallePaquete(paquete, data, onEdit) {
  const subs = data.paqueteSubs.filter((ps) => ps.codigo_pt === paquete.codigo_pt);
  const insumosDirectos = data.bom.filter((b) => b.codigo_pt === paquete.codigo_pt);

  const filasSubs = subs
    .map(
      (s) => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 8px;">${esc(s.subproductos?.nombre || '—')}</td>
      <td style="padding: 8px; text-align: right;">${num(s.cantidad, 4)}</td>
      <td style="padding: 8px;">u</td>
    </tr>
  `
    )
    .join('');

  const filasIns = insumosDirectos
    .map(
      (b) => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 8px;">${esc(b.insumos?.nombre || '—')}</td>
      <td style="padding: 8px; text-align: right;">${num(b.cantidad_por_unidad, 4)}</td>
      <td style="padding: 8px;">${esc(b.insumos?.unidad_consumo || '')}</td>
    </tr>
  `
    )
    .join('');

  abrirModal({
    title: esc(paquete.nombre),
    subtitle: paquete.codigo_pt,
    icon: icono('package', 'lg'),
    size: 'md',
    body: `
      <div style="margin-bottom: 16px;">
        <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Identificación</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><div style="font-size: 11px; color: var(--text-secondary);">Código PT</div><div style="font-weight: 500; font-family: var(--font-mono);">${esc(paquete.codigo_pt)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Unidades por caja</div><div style="font-weight: 500;">${paquete.unidades_por_caja}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Existencia</div><div style="font-weight: 500;">${num(paquete.existencia_actual)} u</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Precio de venta</div><div style="font-weight: 500;">${paquete.precio_venta ? money(paquete.precio_venta) : '—'}</div></div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Composición · Subproductos</div>
        ${
          subs.length === 0
            ? '<div style="font-size:12px; color:var(--text-muted);">Sin subproductos.</div>'
            : `
          <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
            <thead><tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 8px; color: var(--text-secondary);">Subproducto</th>
              <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Cant.</th>
              <th style="padding: 8px; color: var(--text-secondary);">Unidad</th>
            </tr></thead>
            <tbody>${filasSubs}</tbody>
          </table>
        `
        }
      </div>

      ${
        filasIns
          ? `
      <div>
        <div style="font-size: 10.5px; text-transform: uppercase; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Composición · Insumos Directos</div>
        <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
          <thead><tr style="border-bottom: 1px solid var(--border); text-align: left;">
            <th style="padding: 8px; color: var(--text-secondary);">Insumo</th>
            <th style="padding: 8px; color: var(--text-secondary); text-align: right;">Cant.</th>
            <th style="padding: 8px; color: var(--text-secondary);">Unidad</th>
          </tr></thead>
          <tbody>${filasIns}</tbody>
        </table>
      </div>`
          : ''
      }
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
        setTimeout(() => onEdit(), 250);
      };
    },
  });
}

export function abrirModalEtiquetasPT(paquete) {
  abrirModal({
    title: 'Imprimir etiquetas PT',
    subtitle: `${paquete.codigo_pt} · ${paquete.nombre}`,
    icon: icono('tag', 'lg'),
    size: 'md',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad de etiquetas</label>
          <input type="number" id="etq-cant" value="1" min="1" max="50" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote de Producción</label>
          <input type="text" id="etq-lote" placeholder="Ej: 3619" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-print" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        ${icono('printer', 'sm')} Imprimir etiquetas
      </button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();
      overlay.querySelector('#btn-print').onclick = () => {
        const cant = parseInt(overlay.querySelector('#etq-cant').value) || 1;
        const lote = overlay.querySelector('#etq-lote').value.trim() || 'SIN LOTE';
        cerrarModal();
        generarEtiquetasPT(paquete, cant, lote);
      };
    },
  });
}

function generarEtiquetasPT(paquete, cantidad, lote) {
  // Implementación simplificada de etiqueta para PT basada en el legacy
  let etiquetas = '';
  for (let i = 0; i < cantidad; i++) {
    etiquetas += `
      <div style="width:150mm; height:100mm; border:1px solid #000; box-sizing:border-box; padding:4mm; display:flex; margin-bottom:4mm; page-break-inside:avoid;">
        <div style="flex:1; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-size:12pt; font-weight:bold; margin-bottom:2mm;">${esc(paquete.nombre)}</div>
            <div style="font-size:10pt; font-family:monospace;">${esc(paquete.codigo_pt)}</div>
          </div>
          <div style="font-size:10pt;">
            <div><b>LOTE:</b> ${esc(lote)}</div>
            <div><b>INVIMA:</b> ${esc(paquete.registro_invima || 'No requiere')}</div>
            <div><b>UNIDADES POR CAJA:</b> ${paquete.unidades_por_caja}</div>
          </div>
        </div>
        <div style="width:50mm; display:flex; align-items:center; justify-content:center;">
          <!-- Placeholder para QR -->
          <div style="width:40mm; height:40mm; border:1px dashed #ccc;"></div>
        </div>
      </div>
    `;
  }

  const css = `@page { size: 150mm 100mm; margin: 0; } body { margin:0; padding:0; background:#fff; }`;
  imprimirHTML(`<div>${etiquetas}</div>`, 'Etiquetas PT', css);
}