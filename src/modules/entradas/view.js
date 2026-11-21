import { esc, num } from '../../core/formatters.js';
import { unidadCompra } from '../../core/cadena.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderEntradas(container, data, onOpenModal) {
  const { movimientos } = data;

  const filasHistorial = movimientos
    .map((m) => {
      const fecha = new Date(m.fecha).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      const esSub = !!m.subproducto_produccion_id;
      const tipoBadge = esSub
        ? '<span class="badge warning">Subproducto</span>'
        : '<span class="badge info">Insumo</span>';
      const item = esSub ? 'Producción interna' : m.insumos ? esc(m.insumos.nombre) : '—';
      const cant = esSub
        ? `+${num(m.cantidad)} u`
        : `+${num(m.cantidad)} ${esc(m.insumos?.unidad_consumo || '')}`;
      const prov = esSub
        ? esc(m.observaciones || '—')
        : m.insumo_lotes?.sys_proveedores
          ? esc(m.insumo_lotes.sys_proveedores.razon_social)
          : '—';
      const lote = m.insumo_lotes?.lote || 'S/N';

      return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${fecha}</td>
        <td style="padding: 10px 12px;">${tipoBadge}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${item}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">${cant}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(lote)}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${prov}</td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Entrada de mercancía</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Insumos: compra a proveedor. Subproductos: producción interna.</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-entradas" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-entradas" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Movimientos de entrada recientes</h3>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-nueva-entrada" class="btn-add" title="Registrar nueva entrada" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="overflow-x: auto;">
            <table class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Tipo</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Ítem</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cantidad</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Proveedor / Motivo</th>
                </tr>
              </thead>
              <tbody>${movimientos.length === 0 ? '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay movimientos recientes.</td></tr>' : filasHistorial}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica del acordeón
  const panel = container.querySelector('#panel-entradas');
  const header = container.querySelector('#header-entradas');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  // Abrir modal
  container.querySelector('#btn-nueva-entrada').onclick = () => onOpenModal(data);
}

export function abrirModalEntrada(data, onSave) {
  let tipoActual = 'insumo'; // 'insumo' o 'subproducto'

  const opcionesInsumos = data.insumos
    .map((i) => `<option value="${i.id}">${esc(i.nombre)} (${esc(i.codigo)})</option>`)
    .join('');
  const opcionesSubs = data.subproductos
    .map((s) => `<option value="${s.id}">${esc(s.nombre)} (${esc(s.codigo)})</option>`)
    .join('');
  const opcionesProvs = data.proveedores
    .map((p) => `<option value="${p.id}">${esc(p.razon_social)}</option>`)
    .join('');
  const opcionesOPs = data.ops
    .map(
      (o) =>
        `<option value="${o.id}">${esc(o.numero_op)} - ${esc(o.productos_terminados?.nombre || '')}</option>`
    )
    .join('');

  // HTML del formulario de Insumo
  const htmlInsumo = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumo</label>
        <select id="ent-insumo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Seleccionar —</option>${opcionesInsumos}
        </select>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Proveedor</label>
        <select id="ent-proveedor" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Sin especificar —</option>${opcionesProvs}
        </select>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad (<span id="ent-ublabel">—</span>)</label>
        <input type="number" id="ent-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Costo por Unidad de Compra</label>
        <input type="number" id="ent-costo" step="0.01" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      
      <div id="ent-lote-group" style="grid-column: 1/-1; display: none;">
        <label style="display: block; font-size: 12px; color: var(--accent); margin-bottom: 6px;">Número de Lote (Obligatorio)</label>
        <input type="text" id="ent-lote" placeholder="Ej: L-2026-014" style="width: 100%; border: 1px solid var(--accent); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
      </div>
      <div id="ent-vence-group" style="grid-column: 1/-1; display: none;">
        <label style="display: block; font-size: 12px; color: var(--danger); margin-bottom: 6px;">Fecha de Vencimiento (Obligatorio)</label>
        <input type="date" id="ent-vence" style="width: 100%; border: 1px solid var(--danger); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>

      <div style="grid-column: 1/-1; padding-top: 16px; border-top: 1px dashed var(--border);">
        <h4 style="margin: 0 0 12px; font-size: 13px; color: var(--text-secondary);">Documentos y Calidad</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">N° Factura</label>
            <input type="text" id="ent-factura" placeholder="Ej: FV-8520" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
          </div>
          <div>
            <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">N° OC</label>
            <input type="text" id="ent-oc" placeholder="Ej: OC-2026-014" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
          </div>
          <div>
            <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">N° Entrada Almacén</label>
            <input type="text" id="ent-almacen" placeholder="Ej: EA-1024" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
          </div>
          <div style="grid-column: 1/-1; display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Decisión de Calidad</label>
              <select id="ent-calidad" style="width: 100%; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
                <option value="aprobado">Aprobado</option>
                <option value="rechazado">Rechazado</option>
                <option value="cuarentena">Cuarentena</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">Observaciones</label>
              <input type="text" id="ent-obs" placeholder="Ej: Empaque en buen estado..." style="width: 100%; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-2); color: var(--text-primary); padding: 8px;">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // HTML del formulario de Subproducto
  const htmlSubproducto = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Subproducto a Producir</label>
        <select id="sub-id" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Seleccionar —</option>${opcionesSubs}
        </select>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad (unidades)</label>
        <input type="number" id="sub-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote de Producción (Opcional)</label>
        <input type="text" id="sub-lote" placeholder="Ej: L-2026-014" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
      </div>
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Pertenece a la OP (Opcional)</label>
        <select id="sub-op" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Sin OP asignada —</option>${opcionesOPs}
        </select>
      </div>
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo / Observación</label>
        <input type="text" id="sub-motivo" placeholder="Ej: producción interna, ajuste" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
    </div>
  `;

  abrirModal({
    title: 'Registrar Entrada / Producción',
    body: `
      <div style="margin-bottom: 24px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Tipo de entrada</label>
        <select id="modal-tipo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-weight: 600;">
          <option value="insumo">Insumo (compra a proveedor)</option>
          <option value="subproducto">Subproducto (producción interna)</option>
        </select>
      </div>
      
      <div id="form-container">
        ${htmlInsumo}
      </div>
    `,
    size: 'lg',
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar</button>
    `,
    onOpen: (overlay) => {
      const selTipo = overlay.querySelector('#modal-tipo');
      const formContainer = overlay.querySelector('#form-container');

      // Cambio de tipo (Insumo / Subproducto)
      selTipo.onchange = () => {
        tipoActual = selTipo.value;
        formContainer.innerHTML = tipoActual === 'insumo' ? htmlInsumo : htmlSubproducto;
        if (tipoActual === 'insumo') bindInsumo(overlay);
      };

      // Lógica específica de insumo (mostrar/ocultar lote y vencimiento)
      function bindInsumo(overlay) {
        const selInsumo = overlay.querySelector('#ent-insumo');
        const groupLote = overlay.querySelector('#ent-lote-group');
        const groupVence = overlay.querySelector('#ent-vence-group');
        const labelU = overlay.querySelector('#ent-ublabel');

        selInsumo.onchange = () => {
          const ins = data.insumos.find((i) => i.id === selInsumo.value);
          if (!ins) {
            groupLote.style.display = 'none';
            groupVence.style.display = 'none';
            labelU.textContent = '—';
            return;
          }
          labelU.textContent = unidadCompra(ins);
          groupLote.style.display = ins.requiere_lote ? 'block' : 'none';
          groupVence.style.display = ins.requiere_vencimiento ? 'block' : 'none';
        };
      }

      bindInsumo(overlay);

      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      overlay.querySelector('#btn-save').onclick = async () => {
        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          if (tipoActual === 'insumo') {
            const insumo_id = overlay.querySelector('#ent-insumo').value;
            if (!insumo_id) throw new Error('Selecciona un insumo');
            const ins = data.insumos.find((i) => i.id === insumo_id);

            const lote = overlay.querySelector('#ent-lote').value.trim();
            if (ins.requiere_lote && !lote)
              throw new Error('El lote es obligatorio para este insumo');

            const vence = overlay.querySelector('#ent-vence').value;
            if (ins.requiere_vencimiento && !vence)
              throw new Error('La fecha de vencimiento es obligatoria');

            await onSave('insumo', {
              insumo_id,
              cantidad: parseFloat(overlay.querySelector('#ent-cant').value),
              costo_unitario: parseFloat(overlay.querySelector('#ent-costo').value) || null,
              proveedor_id: overlay.querySelector('#ent-proveedor').value || null,
              lote_insumo: lote || null,
              fecha_vencimiento: vence || null,
              numero_factura: overlay.querySelector('#ent-factura').value.trim() || null,
              numero_oc: overlay.querySelector('#ent-oc').value.trim() || null,
              numero_entrada_almacen: overlay.querySelector('#ent-almacen').value.trim() || null,
              estado_calidad: overlay.querySelector('#ent-calidad').value,
              observaciones_calidad: overlay.querySelector('#ent-obs').value.trim() || null,
            });
          } else {
            const subproducto_id = overlay.querySelector('#sub-id').value;
            if (!subproducto_id) throw new Error('Selecciona un subproducto');

            await onSave('subproducto', {
              subproducto_id,
              cantidad: parseFloat(overlay.querySelector('#sub-cant').value),
              lote_produccion: overlay.querySelector('#sub-lote').value.trim() || null,
              orden_id: overlay.querySelector('#sub-op').value || null,
              motivo: overlay.querySelector('#sub-motivo').value.trim() || null,
            });
          }
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Guardar';
        }
      };
    },
  });
}
