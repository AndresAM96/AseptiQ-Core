import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';

export function renderSubproductos(container, data) {
  const { subproductos } = data;

  const filas = subproductos
    .map((sub) => {
      const isInactivo = sub.estado_activo === false;
      const rowStyle = isInactivo ? 'opacity: 0.5; background: var(--surface-2);' : '';
      const badgeInactivo = isInactivo
        ? ' <span class="badge neutral" style="font-size:10px;">Inactivo</span>'
        : '';

      return `
      <tr style="border-bottom: 1px solid var(--border); ${rowStyle}">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(sub.codigo)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(sub.nombre)}${badgeInactivo}</td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge ${sub.tipo === 'final' ? 'warning' : sub.tipo === 'intermedio' ? 'info' : 'neutral'}">${esc(sub.tipo)}</span>
        </td>
        <td style="padding: 10px 12px; text-align: right;">${num(sub.existencia_actual)}</td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-detail="${sub.id}" title="Ver detalles" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${icono('eye', 'sm')}
          </button>
          <button data-toggle="${sub.id}" data-estado="${sub.estado_activo}" title="${isInactivo ? 'Activar' : 'Desactivar'}" style="background: transparent; border: 1px solid var(--border); color: ${isInactivo ? 'var(--success)' : 'var(--text-secondary)'}; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${isInactivo ? icono('check', 'sm') : icono('eye-off', 'sm')}
          </button>
          <button data-del="${sub.id}" data-nombre="${esc(sub.nombre)}" title="Eliminar" style="background: transparent; border: 1px solid var(--border); color: var(--danger); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
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
        <h2 style="font-size: 20px; margin: 0 0 4px;">Subproductos</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Piezas intermedias que se fabrican y se usan en los Paquetes (PT).</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-subs" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-subs" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Listado</h3>
          <span class="badge" style="font-size: 11px; background: var(--info); color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${subproductos.length} subproductos</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-export-subs" class="secondary small" title="Descargar CSV" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
            ${icono('download', 'sm')} Exportar CSV
          </button>
          <button id="btn-nuevo-sub" class="btn-add" title="Crear subproducto" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <input type="text" id="buscar_subs" placeholder="Buscar subproducto..." style="flex: 1 1 220px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
          </div>
          
          <div style="overflow-x: auto;">
            <table id="tablaSubs" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Nombre</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Tipo</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Existencia</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>${subproductos.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay subproductos registrados.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // UI Binds
  const panel = container.querySelector('#panel-subs');
  const header = container.querySelector('#header-subs');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  const inputBuscar = container.querySelector('#buscar_subs');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaSubs tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}

export function abrirModalSubproducto(sub, data, sugerido, handlers) {
  const isEdit = !!sub;
  const codeNum = isEdit ? sub.codigo.replace('SUB-', '') : sugerido;

  // Estados locales para filas dinámicas
  const filasReceta = isEdit
    ? data.recetas
        .filter((r) => r.subproducto_id === sub.id)
        .map((r) => ({
          id: r.insumo_id,
          cantidad: r.cantidad_por_unidad,
          conversión: !!r.factor_receta,
          unidad: r.unidad_receta,
          factor: r.factor_receta,
        }))
    : [];

  const filasHijos = isEdit
    ? data.hijos
        .filter((h) => h.subproducto_padre_id === sub.id)
        .map((h) => ({
          id: h.subproducto_hijo_id,
          cantidad: h.cantidad_por_unidad,
        }))
    : [];

  const opcionesInsumos = data.insumos
    .map((i) => `<option value="${i.id}">${esc(i.nombre)} (${esc(i.unidad_consumo)})</option>`)
    .join('');
  const opcionesSubs = data.subproductos
    .filter((s) => s.id !== sub?.id)
    .map((s) => `<option value="${s.id}">${esc(s.nombre)} (${esc(s.codigo)})</option>`)
    .join('');

  abrirModal({
    title: isEdit ? 'Editar Subproducto' : 'Nuevo Subproducto',
    subtitle: 'Subproducto con receta de insumos y/o subproductos hijos.',
    icon: icono(isEdit ? 'pencil' : 'plus', 'lg'),
    size: 'lg',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 2fr 1fr 1fr; gap: 16px; margin-bottom: 24px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Código</label>
          <div style="display: flex;">
            <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">SUB-</span>
            <input type="text" id="sub-codigo" value="${codeNum}" ${isEdit ? 'disabled' : ''} style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px; opacity: ${isEdit ? '0.6' : '1'};">
          </div>
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Nombre</label>
          <input type="text" id="sub-nombre" value="${isEdit ? esc(sub.nombre) : ''}" placeholder="Ej: Batón americano" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Tipo</label>
          <select id="sub-tipo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            <option value="intermedio" ${isEdit && sub.tipo === 'intermedio' ? 'selected' : ''}>Intermedio</option>
            <option value="final" ${isEdit && sub.tipo === 'final' ? 'selected' : ''}>Final</option>
            <option value="ambos" ${isEdit && sub.tipo === 'ambos' ? 'selected' : ''}>Ambos</option>
          </select>
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Existencia inicial</label>
          <input type="number" id="sub-existencia" value="${isEdit ? sub.existencia_actual : 0}" ${isEdit ? 'disabled' : ''} style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px; opacity: ${isEdit ? '0.6' : '1'};">
        </div>
      </div>

      <div style="padding-top: 16px; border-top: 1px dashed var(--border); margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Receta de insumos</h4>
        </div>
        <div id="receta-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button id="btn-add-receta" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">+ Agregar insumo</button>
          <button id="btn-crear-insumo" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">+ Crear insumo nuevo</button>
        </div>
      </div>

      <div style="padding-top: 16px; border-top: 1px dashed var(--border);">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <h4 style="margin: 0; font-size: 13px; color: var(--accent); text-transform: uppercase;">Subproductos hijos</h4>
        </div>
        <div id="hijos-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
        <div style="margin-top: 12px; display: flex; gap: 8px;">
          <button id="btn-add-hijo" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">+ Agregar subproducto hijo</button>
        </div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">${isEdit ? 'Guardar cambios' : 'Crear subproducto'}</button>
    `,
    onOpen: (overlay) => {
      const contReceta = overlay.querySelector('#receta-container');
      const contHijos = overlay.querySelector('#hijos-container');

      const renderReceta = () => {
        contReceta.innerHTML = filasReceta
          .map(
            (r, i) => `
          <div style="display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 8px; align-items: center;">
            <select data-idx="${i}" class="rec-select" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
              <option value="">— Seleccionar insumo —</option>${opcionesInsumos}
            </select>
            <input type="number" class="rec-cant" data-idx="${i}" value="${r.cantidad || ''}" step="0.0001" placeholder="Cant." style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
            <label style="display: flex; align-items: center; gap: 4px; font-size: 11px; cursor: pointer;">
              <input type="checkbox" class="rec-conv" data-idx="${i}" ${r.conversión ? 'checked' : ''}> conversión
            </label>
            <button data-remove-rec="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
          </div>
        `
          )
          .join('');

        contReceta.querySelectorAll('.rec-select').forEach((el) => {
          el.value = filasReceta[parseInt(el.dataset.idx)].id || '';
          el.onchange = (e) => (filasReceta[parseInt(e.target.dataset.idx)].id = e.target.value);
        });
        contReceta.querySelectorAll('.rec-cant').forEach((el) => {
          el.onchange = (e) =>
            (filasReceta[parseInt(e.target.dataset.idx)].cantidad = parseFloat(e.target.value));
        });
        contReceta.querySelectorAll('.rec-conv').forEach((el) => {
          el.onchange = (e) =>
            (filasReceta[parseInt(e.target.dataset.idx)].conversión = e.target.checked);
        });
        contReceta.querySelectorAll('[data-remove-rec]').forEach((b) => {
          b.onclick = (e) => {
            filasReceta.splice(parseInt(e.target.dataset.removeRec), 1);
            renderReceta();
          };
        });
      };

      const renderHijos = () => {
        contHijos.innerHTML = filasHijos
          .map(
            (h, i) => `
          <div style="display: grid; grid-template-columns: 2fr 1fr auto; gap: 8px; align-items: center;">
            <select data-idx="${i}" class="hijo-select" style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
              <option value="">— Seleccionar subproducto —</option>${opcionesSubs}
            </select>
            <input type="number" class="hijo-cant" data-idx="${i}" value="${h.cantidad || ''}" step="0.0001" placeholder="Cant." style="border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
            <button data-remove-hijo="${i}" style="background: var(--danger-bg); border: none; color: var(--danger); padding: 8px; border-radius: 6px; cursor: pointer;">✕</button>
          </div>
        `
          )
          .join('');

        contHijos.querySelectorAll('.hijo-select').forEach((el) => {
          el.value = filasHijos[parseInt(el.dataset.idx)].id || '';
          el.onchange = (e) => (filasHijos[parseInt(e.target.dataset.idx)].id = e.target.value);
        });
        contHijos.querySelectorAll('.hijo-cant').forEach((el) => {
          el.onchange = (e) =>
            (filasHijos[parseInt(e.target.dataset.idx)].cantidad = parseFloat(e.target.value));
        });
        contHijos.querySelectorAll('[data-remove-hijo]').forEach((b) => {
          b.onclick = (e) => {
            filasHijos.splice(parseInt(e.target.dataset.removeHijo), 1);
            renderHijos();
          };
        });
      };

      overlay.querySelector('#btn-add-receta').onclick = () => {
        filasReceta.push({ id: '', cantidad: '', conversión: false });
        renderReceta();
      };
      overlay.querySelector('#btn-add-hijo').onclick = () => {
        filasHijos.push({ id: '', cantidad: '' });
        renderHijos();
      };

      // Modales apilados para crear insumo
      overlay.querySelector('#btn-crear-insumo').onclick = () => {
        // Aquí llamamos al modal de insumos (asumiendo que lo importamos)
        // En un caso real: importar abrirModalInsumo desde '../insumos/view.js'
        toast('Abre el módulo de Insumos para crear uno nuevo por ahora.', 'info');
      };

      renderReceta();
      renderHijos();

      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const nombre = overlay.querySelector('#sub-nombre').value.trim();
        if (!nombre) return toast('El nombre es obligatorio', 'error');

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          await handlers.onSave({
            id: isEdit ? sub.id : null,
            codigo: isEdit
              ? sub.codigo
              : 'SUB-' + overlay.querySelector('#sub-codigo').value.trim(),
            nombre,
            tipo: overlay.querySelector('#sub-tipo').value,
            existencia: isEdit
              ? sub.existencia_actual
              : parseFloat(overlay.querySelector('#sub-existencia').value) || 0,
            receta: filasReceta
              .filter((f) => f.id && f.cantidad > 0)
              .map((f) => ({
                insumo_id: f.id,
                cantidad: f.cantidad,
                factor_receta: f.conversión ? 1 : 1,
                unidad_receta: f.conversión ? 'u' : null,
              })),
            hijos: filasHijos
              .filter((f) => f.id && f.cantidad > 0)
              .map((f) => ({ subproducto_id: f.id, cantidad: f.cantidad })),
          });
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = isEdit ? 'Guardar cambios' : 'Crear subproducto';
        }
      };
    },
  });
}
