import { esc, num, money } from '../../core/formatters.js';
import { estadoInsumo } from '../../core/estadoInsumo.js';
import { unidadConsumo, formatearExistencia } from '../../core/cadena.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';
import { imprimirHTML } from '../../shared/ui/print.js';
import qrcode from 'qrcode-generator';

export function renderInsumos(container, insumos, config) {
  const badgeColors = { Cubierto: 'success', Reorden: 'warning', Urgente: 'danger' };

  const filas = insumos
    .map((ins) => {
      const estado = estadoInsumo(ins, config);
      const uC = unidadConsumo(ins);
      const isInactivo = ins.estado_activo === false;
      const rowStyle = isInactivo ? 'opacity: 0.5; background: var(--surface-2);' : '';
      const badgeInactivo = isInactivo
        ? ' <span class="badge neutral" style="font-size:10px;">Inactivo</span>'
        : '';

      return `
      <tr style="border-bottom: 1px solid var(--border); ${rowStyle}">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(ins.codigo)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(ins.nombre)}${badgeInactivo}</td>
        <td style="padding: 10px 12px; text-align: right;">${formatearExistencia(ins, num)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(ins.punto_reorden)} ${uC}</td>
        <td style="padding: 10px 12px; text-align: right;">${money(ins.costo_unitario)}</td>
        <td style="padding: 10px 12px;">
          <span class="badge ${badgeColors[estado] || 'neutral'}">${isInactivo ? '—' : estado}</span>
        </td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-print="${ins.id}" title="Imprimir etiquetas QR" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${icono('tag', 'sm')}
          </button>
          <button data-detail="${ins.id}" title="Ver detalles" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${icono('eye', 'sm')}
          </button>
          <button data-toggle="${ins.id}" data-estado="${ins.estado_activo}" title="${isInactivo ? 'Activar' : 'Desactivar'}" style="background: transparent; border: 1px solid var(--border); color: ${isInactivo ? 'var(--success)' : 'var(--text-secondary)'}; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px;">
            ${isInactivo ? icono('check', 'sm') : icono('eye-off', 'sm')}
          </button>
          <button data-del="${ins.id}" data-nombre="${esc(ins.nombre)}" title="Eliminar insumo" style="background: transparent; border: 1px solid var(--border); color: var(--danger); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;">
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
        <h2 style="font-size: 20px; margin: 0 0 4px;">Insumos</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Cadena de conversiones: de unidad de compra a unidad de consumo.</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-insumos" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-insumos" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Listado</h3>
          <span class="badge" style="font-size: 11px; background: var(--info); color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${insumos.length} insumos</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-export-ins" class="secondary small" title="Descargar CSV" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
            ${icono('download', 'sm')} Exportar CSV
          </button>
          <button id="btn-nuevo-ins" class="btn-add" title="Crear insumo" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <input type="text" id="buscar_insumos" placeholder="Buscar por nombre o código..." style="flex: 1 1 220px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); cursor: pointer; white-space: nowrap;">
              <input type="checkbox" id="chk_inactivos" style="width: auto; margin: 0; cursor: pointer;">
              Mostrar inactivos
            </label>
          </div>
          
          <div style="overflow-x: auto;">
            <table id="tablaInsumos" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Nombre</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Existencia</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Reorden</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Costo</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>${insumos.length === 0 ? '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay insumos registrados.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica del acordeón
  const panel = container.querySelector('#panel-insumos');
  const header = container.querySelector('#header-insumos');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  // Buscador
  const inputBuscar = container.querySelector('#buscar_insumos');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaInsumos tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };
}

export function abrirModalInsumo(insumo, config, sugerido, onSave) {
  const isEdit = !!insumo;
  const codeNum = isEdit ? insumo.codigo.replace(config.prefijoInsumo, '') : sugerido;

  // Estado para la cadena
  const cadena =
    isEdit && insumo.conversiones?.length
      ? JSON.parse(JSON.stringify(insumo.conversiones))
      : [{ unidad: 'u', factor: 1 }];
  let tipoConv = isEdit ? insumo.tipo_conversion : 'fijo';

  const body = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
      <div style="grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 16px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Código</label>
          <div style="display: flex;">
            <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">${config.prefijoInsumo}</span>
            <input type="text" id="ins-codigo" value="${codeNum}" ${isEdit ? 'disabled' : ''} style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px; opacity: ${isEdit ? '0.6' : '1'};">
          </div>
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Nombre</label>
          <input type="text" id="ins-nombre" value="${isEdit ? esc(insumo.nombre) : ''}" placeholder="Ej: Tela SMS" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Existencia inicial <span style="font-weight:400;font-size:10px;">(vía Entrada)</span></label>
          <input type="number" id="ins-existencia" value="${isEdit ? insumo.existencia_actual : 0}" disabled title="Registra el stock desde Entrada Mercancía" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-3); color: var(--text-muted); padding: 10px; font-size: 13.5px; cursor: not-allowed;">
        </div>
      </div>
      
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Stock Objetivo</label>
        <input type="number" id="ins-reorden" value="${isEdit ? insumo.punto_reorden : ''}" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Costo Unitario (Consumo)</label>
        <input type="number" id="ins-costo" value="${isEdit ? insumo.costo_unitario : ''}" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>

    <div style="padding-top: 16px; border-top: 1px dashed var(--border);">
      <h4 style="margin: 0 0 12px; font-size: 13px; color: var(--accent); text-transform: uppercase;">Cadena de Conversiones</h4>
      <div id="conv-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
      <div style="margin-top: 12px; display: flex; gap: 12px; align-items: center;">
        <button id="btn-add-nivel" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">+ Agregar nivel</button>
        <span style="font-size: 11.5px; color: var(--text-muted);">Primera = compra · Última = consumo.</span>
      </div>
      <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; margin-top: 16px; cursor: pointer;">
        <input type="checkbox" id="conv-variable" ${tipoConv === 'variable' ? 'checked' : ''}>
        Rendimiento <b>variable</b> por lote (kg → unidades).
      </label>
    </div>
  `;

  abrirModal({
    title: isEdit ? 'Editar insumo' : 'Nuevo insumo',
    subtitle: 'Cadena de conversiones: de unidad de compra a unidad de consumo.',
    icon: icono(isEdit ? 'pencil' : 'plus', 'lg'),
    size: 'lg',
    body,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">${isEdit ? 'Guardar cambios' : 'Crear insumo'}</button>
    `,
    onOpen: (overlay) => {
      const containerCadena = overlay.querySelector('#conv-container');

      const renderCadena = () => {
        containerCadena.innerHTML = cadena
          .map((nivel, idx) => {
            const ult = idx === cadena.length - 1;
            const pri = idx === 0;
            return `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 16px;">${pri ? '📦' : '↳'}</span>
              <input type="text" data-idx="${idx}" data-field="unidad" value="${esc(nivel.unidad)}" placeholder="Unidad" style="width: 100px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
              ${pri ? '<span class="badge warning" style="font-size:10px;">compra</span>' : ''}
              ${
                ult
                  ? '<span style="font-size: 12px; color: var(--text-muted);">← consumo</span>'
                  : `
                <span style="font-size: 12px; color: var(--text-muted);">×</span>
                <input type="number" data-idx="${idx}" data-field="factor" value="${nivel.factor}" placeholder="Factor" style="width: 100px; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
                <button data-remove="${idx}" style="background: var(--danger-bg); border: none; color: var(--danger); width: 28px; height: 28px; border-radius: 6px; cursor: pointer;">✕</button>
              `
              }
            </div>
          `;
          })
          .join('');

        containerCadena.querySelectorAll('input').forEach((inp) => {
          inp.onchange = (e) => {
            const idx = parseInt(e.target.dataset.idx);
            const field = e.target.dataset.field;
            cadena[idx][field] = field === 'factor' ? parseFloat(e.target.value) : e.target.value;
          };
        });

        containerCadena.querySelectorAll('[data-remove]').forEach((btn) => {
          btn.onclick = (e) => {
            cadena.splice(parseInt(e.target.dataset.remove), 1);
            renderCadena();
          };
        });
      };

      overlay.querySelector('#btn-add-nivel').onclick = () => {
        cadena.push({ unidad: '', factor: 1 });
        renderCadena();
      };

      overlay.querySelector('#conv-variable').onchange = (e) => {
        tipoConv = e.target.checked ? 'variable' : 'fijo';
      };

      renderCadena();

      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const nombre = overlay.querySelector('#ins-nombre').value.trim();
        const reorden = parseFloat(overlay.querySelector('#ins-reorden').value);
        const costo = parseFloat(overlay.querySelector('#ins-costo').value) || 0;

        if (!nombre || !reorden || reorden <= 0)
          return toast('Nombre y Stock Objetivo son obligatorios', 'error');

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          await onSave(isEdit ? insumo.id : null, {
            codigo: isEdit
              ? insumo.codigo
              : config.prefijoInsumo + overlay.querySelector('#ins-codigo').value.trim(),
            nombre,
            punto_reorden: reorden,
            costo_unitario: costo,
            conversiones: cadena,
            tipo_conversion: tipoConv,
          });
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = isEdit ? 'Guardar cambios' : 'Crear insumo';
        }
      };
    },
  });
}

export function abrirModalDetalleInsumo(insumo, onEdit) {
  const estado = estadoInsumo(insumo, { umbralUrgente: 30, umbralReorden: 60 }); // Usar config global si es necesario
  const badgeColor =
    { Cubierto: 'success', Reorden: 'warning', Urgente: 'danger' }[estado] || 'neutral';
  const uC = unidadConsumo(insumo);

  abrirModal({
    title: esc(insumo.nombre),
    subtitle: insumo.codigo,
    icon: icono('box', 'lg'),
    size: 'md',
    body: `
      <div style="margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px dashed var(--border);">
        <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Identificación</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><div style="font-size: 11px; color: var(--text-secondary);">Código</div><div style="font-weight: 500; font-family: var(--font-mono);">${esc(insumo.codigo)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Estado</div><div><span class="badge ${badgeColor}">${estado}</span></div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Unidad de medida</div><div style="font-weight: 500;">${esc(insumo.unidad_medida || '—')}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Unidad de consumo</div><div style="font-weight: 500;">${esc(uC)}</div></div>
          <div style="grid-column: 1/-1;"><div style="font-size: 11px; color: var(--text-secondary);">Cadena de conversiones</div><div style="font-family: var(--font-mono); font-size: 12px;">${formatearExistencia(insumo, num)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Tipo de conversión</div><div style="font-weight: 500; text-transform: capitalize;">${esc(insumo.tipo_conversion || 'fijo')}</div></div>
        </div>
      </div>

      <div>
        <div style="font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">Inventario y costo</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div><div style="font-size: 11px; color: var(--text-secondary);">Existencia</div><div style="font-weight: 500;">${num(insumo.existencia_actual)} ${esc(uC)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Stock objetivo</div><div style="font-weight: 500;">${num(insumo.punto_reorden)} ${esc(uC)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Costo unitario</div><div style="font-weight: 500;">${money(insumo.costo_unitario)}</div></div>
          <div><div style="font-size: 11px; color: var(--text-secondary);">Valor en stock</div><div style="font-weight: 500;">${money((insumo.existencia_actual || 0) * (insumo.costo_unitario || 0))}</div></div>
        </div>
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
        setTimeout(() => onEdit(), 250);
      };
    },
  });
}

export function abrirModalEtiquetas(insumo) {
  abrirModal({
    title: 'Imprimir etiquetas QR',
    subtitle: `${insumo.codigo} · ${insumo.nombre}`,
    icon: icono('tag', 'lg'),
    size: 'md',
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad de etiquetas</label>
          <input type="number" id="etq-cant" value="1" min="1" max="50" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Tamaño</label>
          <select id="etq-tam" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            <option value="small">Pequeña · 50 × 25 mm</option>
            <option value="medium">Mediana · 63 × 38 mm</option>
            <option value="large">Grande · 99 × 38 mm</option>
          </select>
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">Campos a incluir</label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;"><input type="checkbox" id="chk-cod" checked> Código</label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;"><input type="checkbox" id="chk-nom" checked> Nombre</label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;"><input type="checkbox" id="chk-uni" checked> Unidad de consumo</label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;"><input type="checkbox" id="chk-lot"> Línea para lote</label>
        <label style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer;"><input type="checkbox" id="chk-fec"> Línea para fecha</label>
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
        const tam = overlay.querySelector('#etq-tam').value;
        const campos = {
          codigo: overlay.querySelector('#chk-cod').checked,
          nombre: overlay.querySelector('#chk-nom').checked,
          unidad: overlay.querySelector('#chk-uni').checked,
          lote: overlay.querySelector('#chk-lot').checked,
          fecha: overlay.querySelector('#chk-fec').checked,
        };
        cerrarModal();
        generarEtiquetasQR(insumo, cant, tam, campos);
      };
    },
  });
}

function generarEtiquetasQR(insumo, cantidad, tam, campos) {
  const sizes = {
    small: { w: '48mm', h: '25mm', cols: 4, qr: 34, fsCod: '7pt', fsNom: '6.5pt', fsUni: '6pt' },
    medium: { w: '63mm', h: '38mm', cols: 3, qr: 52, fsCod: '9pt', fsNom: '8pt', fsUni: '7.5pt' },
    large: {
      w: '99mm',
      h: '38mm',
      cols: 2,
      qr: 68,
      fsCod: '10.5pt',
      fsNom: '9.5pt',
      fsUni: '8.5pt',
    },
  };
  const s = sizes[tam] || sizes.small;

  const qr = qrSVG(insumo.codigo, s.qr);
  const qrBox = qr
    ? `<div style="flex-shrink:0;display:flex;align-items:center;justify-content:center;">${qr}</div>`
    : '';

  let etiquetas = '';
  for (let i = 0; i < cantidad; i++) {
    etiquetas += `
      <div style="width:${s.w};height:${s.h};border:1px solid #999;border-radius:3px;padding:2mm;display:flex;align-items:center;gap:2mm;overflow:hidden;background:#fff;page-break-inside:avoid;box-sizing:border-box;">
        ${qrBox}
        <div style="flex:1;min-width:0;overflow:hidden;line-height:1.15;">
          ${campos.codigo ? `<div style="font-family:'Courier New',monospace;font-weight:700;font-size:${s.fsCod};color:#000;letter-spacing:.02em;margin-bottom:1mm;">${esc(insumo.codigo)}</div>` : ''}
          ${campos.nombre ? `<div style="font-size:${s.fsNom};font-weight:500;color:#111;margin-bottom:.5mm;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${esc(insumo.nombre)}</div>` : ''}
          ${campos.unidad ? `<div style="font-size:${s.fsUni};color:#555;text-transform:uppercase;letter-spacing:.05em;">${unidadConsumo(insumo)}</div>` : ''}
          ${campos.lote ? `<div style="display:flex;align-items:baseline;gap:1.5mm;font-size:${s.fsUni};color:#555;margin-top:1mm;"><span>Lote:</span><span style="flex:1;border-bottom:1px solid #999;height:1em;min-width:10mm;"></span></div>` : ''}
          ${campos.fecha ? `<div style="display:flex;align-items:baseline;gap:1.5mm;font-size:${s.fsUni};color:#555;margin-top:1mm;"><span>Fecha:</span><span style="flex:1;border-bottom:1px solid #999;height:1em;min-width:10mm;"></span></div>` : ''}
        </div>
      </div>
    `;
  }

  const css = `
    @page { size: letter portrait; margin: 10mm; }
    body { margin:0; padding:0; background:#fff; font-family:'Helvetica','Arial',sans-serif; color:#000; }
    .hoja-etiquetas { display:grid; grid-template-columns:repeat(${s.cols},1fr); gap:2mm; }
    @media print { .hoja-etiquetas div { border:1px solid #999 !important; } }
  `;

  imprimirHTML(`<div class="hoja-etiquetas">${etiquetas}</div>`, 'Etiquetas QR', css);
}

// Helper simple para generar el QR en SVG sin depender de un CDN externo para la impresión
function qrSVG(texto, tam) {
  try {
    // Usamos qrcode-generator (asumiendo que está en el HTML o importado)
    if (typeof qrcode === 'undefined')
      return '<div style="width:' + tam + 'px;height:' + tam + 'px;border:1px dashed #ccc;"></div>';
    const qr = qrcode(0, 'M');
    qr.addData(String(texto));
    qr.make();
    return qr
      .createSvgTag({ cellSize: 2, margin: 0, scalable: true })
      .replace('<svg', `<svg style="width:${tam}px;height:${tam}px;"`);
  } catch {
    return '';
  }
}