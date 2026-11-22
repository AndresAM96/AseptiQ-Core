import { esc, num, money } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';

export function renderDevoluciones(container, data, onOpenModal) {
  const { devProveedores, devClientes } = data;

  // Ahora todos los registros que llegan son devoluciones a proveedores
  const devProvFiltradas = devProveedores;

  const filasProv = devProvFiltradas
    .map((d) => {
      const loteObj = Array.isArray(d.insumo_lotes) ? d.insumo_lotes[0] : d.insumo_lotes;
      return `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(d.fecha).toLocaleDateString('es-CO')}</td>
      <td style="padding: 10px 12px; font-weight: 500;">${esc(d.insumos?.nombre || '—')}</td>
      <td style="padding: 10px 12px; text-align: right; color: var(--danger); font-weight: 600;">-${num(d.cantidad)} ${esc(d.insumos?.unidad_consumo || '')}</td>
      <td style="padding: 10px 12px; font-size: 12px;">${esc(loteObj?.sys_proveedores?.razon_social || '—')}</td>
      <td style="padding: 10px 12px; text-align: right;">
        <button data-ver-prov="${d.id}" title="Ver detalle completo" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Ver</button>
      </td>
    </tr>
  `;
    })
    .join('');

  const filasCliente = devClientes
    .map((d) => {
      const badgeEstado =
        {
          bueno: 'success',
          cuarentena: 'warning',
          dañado: 'danger',
        }[d.estado_producto] || 'neutral';
      return `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(d.fecha).toLocaleDateString('es-CO')}</td>
      <td style="padding: 10px 12px; font-weight: 500;">${esc(d.productos_terminados?.nombre || d.codigo_pt)}</td>
      <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">+${num(d.cantidad)} u</td>
      <td style="padding: 10px 12px;"><span class="badge ${badgeEstado}">${esc(d.estado_producto)}</span></td>
      <td style="padding: 10px 12px; text-align: right;">
        <button data-ver-cli="${d.id}" title="Ver detalle completo" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Ver</button>
      </td>
    </tr>
  `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Devoluciones</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Gestión de retornos de mercancía (Proveedores y Clientes).</p>
      </div>
      <button id="btn-nueva-devolucion" class="btn-add" title="Registrar nueva devolución" style="background: var(--accent); color: var(--accent-ink); border: none; height: 34px; padding: 0 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
        ${icono('plus', 'sm')} Registrar Devolución
      </button>
    </div>

    <!-- Panel Proveedores -->
    <div class="panel-collapsible" id="panel-dev-prov" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
      <div class="panel-header" id="header-dev-prov" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Historial a Proveedores</h3>
        <button class="panel-toggle-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      </div>
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="overflow-x: auto;">
            <table class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead><tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Proveedor</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
              </tr></thead>
              <tbody>${devProvFiltradas.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay devoluciones a proveedores.</td></tr>' : filasProv}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Panel Clientes -->
    <div class="panel-collapsible" id="panel-dev-cli" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-dev-cli" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Historial de Clientes (PT)</h3>
        <button class="panel-toggle-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg></button>
      </div>
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="overflow-x: auto;">
            <table class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead><tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
                <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
              </tr></thead>
              <tbody>${devClientes.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay devoluciones de clientes.</td></tr>' : filasCliente}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica de acordeones
  const setupToggle = (panelId, headerId) => {
    const p = container.querySelector(panelId);
    const h = container.querySelector(headerId);
    h.onclick = (e) => {
      if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
      p.classList.toggle('collapsed');
    };
  };
  setupToggle('#panel-dev-prov', '#header-dev-prov');
  setupToggle('#panel-dev-cli', '#header-dev-cli');

  // Abrir modal de creación
  container.querySelector('#btn-nueva-devolucion').onclick = () => onOpenModal(data);

  // Abrir modal de detalles Proveedor
  container.querySelectorAll('[data-ver-prov]').forEach((btn) => {
    btn.onclick = () => {
      const d = devProvFiltradas.find((x) => x.id === btn.dataset.verProv);
      abrirDetalleProveedor(d);
    };
  });

  // Abrir modal de detalles Cliente
  container.querySelectorAll('[data-ver-cli]').forEach((btn) => {
    btn.onclick = () => {
      const d = devClientes.find((x) => x.id === btn.dataset.verCli);
      abrirDetalleCliente(d);
    };
  });
}

// --- MODALES DE DETALLE ---

function abrirDetalleProveedor(d) {
  const loteObj = Array.isArray(d.insumo_lotes) ? d.insumo_lotes[0] : d.insumo_lotes;
  const nombreProv = loteObj?.sys_proveedores?.razon_social || '—';
  const numLote = loteObj?.lote || '—';

  abrirModal({
    title: 'Detalle de Devolución a Proveedor',
    subtitle: `Registro del ${new Date(d.fecha).toLocaleString('es-CO')}`,
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: var(--surface-2); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Insumo</div>
          <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${esc(d.insumos?.nombre)}</div>
          <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">${esc(d.insumos?.codigo)}</div>
        </div>
        <div style="background: var(--danger-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--danger);">
          <div style="font-size: 11px; color: var(--danger); text-transform: uppercase;">Cantidad Devuelta</div>
          <div style="font-size: 18px; font-weight: bold; color: var(--danger); margin-top: 4px;">-${num(d.cantidad)} ${esc(d.insumos?.unidad_consumo)}</div>
        </div>
      </div>

      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Proveedor:</span>
          <b>${esc(nombreProv)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Lote afectado:</span>
          <b style="font-family: var(--font-mono);">${esc(numLote)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Costo Unitario Momento:</span>
          <b>${money(d.costo_unitario_momento)}</b>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Usuario que registró:</span>
          <b>${esc(d.usuario_email || '—')}</b>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
          <span style="color: var(--text-secondary);">Motivo / Observaciones:</span>
          <div style="background: var(--surface-2); padding: 10px; border-radius: 6px; color: var(--text-primary); min-height: 60px;">
            ${esc(d.observaciones || 'Sin observaciones.')}
          </div>
        </div>
      </div>
    `,
    footer: `<button id="btn-cerrar-det" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cerrar-det').onclick = () => cerrarModal();
    },
  });
}

function abrirDetalleCliente(d) {
  const badgeEstado =
    {
      bueno: 'success',
      cuarentena: 'warning',
      dañado: 'danger',
    }[d.estado_producto] || 'neutral';

  abrirModal({
    title: 'Detalle de Devolución de Cliente',
    subtitle: `Registro del ${new Date(d.fecha).toLocaleString('es-CO')}`,
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="background: var(--surface-2); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
          <div style="font-size: 11px; color: var(--text-secondary); text-transform: uppercase;">Producto Terminado</div>
          <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${esc(d.productos_terminados?.nombre || d.codigo_pt)}</div>
          <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">${esc(d.codigo_pt)}</div>
        </div>
        <div style="background: var(--success-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--success);">
          <div style="font-size: 11px; color: var(--success); text-transform: uppercase;">Cantidad Devuelta</div>
          <div style="font-size: 18px; font-weight: bold; color: var(--success); margin-top: 4px;">+${num(d.cantidad)} u</div>
        </div>
      </div>

      <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Estado del Producto:</span>
          <span class="badge ${badgeEstado}">${esc(d.estado_producto)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Lote OP (Producción):</span>
          <b style="font-family: var(--font-mono);">${esc(d.lote_op || '—')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Lote EO (Esterilización):</span>
          <b style="font-family: var(--font-mono);">${esc(d.lote_eo || '—')}</b>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border); padding-bottom: 8px;">
          <span style="color: var(--text-secondary);">Usuario que registró:</span>
          <b>${esc(d.usuario_email || '—')}</b>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 8px;">
          <span style="color: var(--text-secondary);">Motivo / Observaciones:</span>
          <div style="background: var(--surface-2); padding: 10px; border-radius: 6px; color: var(--text-primary); min-height: 60px;">
            ${esc(d.motivo || 'Sin observaciones.')}
          </div>
        </div>
      </div>
    `,
    footer: `<button id="btn-cerrar-det" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cerrar-det').onclick = () => cerrarModal();
    },
  });
}

export function abrirModalDevolucion(data, onSave) {
  let tipoActual = 'proveedor';

  const opcionesInsumos = data.insumos
    .map(
      (i) =>
        `<option value="${i.id}">${esc(i.nombre)} (Stock: ${num(i.existencia_actual)} ${esc(i.unidad_consumo)})</option>`
    )
    .join('');
  const opcionesProvs = data.proveedores
    .map((p) => `<option value="${p.id}">${esc(p.razon_social)}</option>`)
    .join('');
  const opcionesProds = data.productos
    .map(
      (p) =>
        `<option value="${p.codigo_pt}">${esc(p.nombre)} (Stock: ${num(p.existencia_actual)} u)</option>`
    )
    .join('');

  const htmlProveedor = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumo</label>
        <select id="devp-insumo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Seleccionar —</option>${opcionesInsumos}
        </select>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Proveedor</label>
        <select id="devp-proveedor" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Seleccionar —</option>${opcionesProvs}
        </select>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad</label>
        <input type="number" id="devp-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote a devolver (Opcional)</label>
        <select id="devp-lote" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— LIFO (Automático) —</option>
        </select>
      </div>
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo</label>
        <input type="text" id="devp-motivo" placeholder="Ej: producto defectuoso" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
    </div>
  `;

  const htmlCliente = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Producto Terminado</label>
        <select id="devc-prod" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="">— Seleccionar —</option>${opcionesProds}
        </select>
      </div>
      
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote OP</label>
        <input type="text" id="devc-lote-op" placeholder="Ej: OP-0001" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      <div id="devc-eo-group" style="display: none;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote EO (Estéril)</label>
        <input type="text" id="devc-lote-eo" placeholder="Ej: EO-100" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha de Vencimiento</label>
        <input type="date" id="devc-fecha-vence" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad Devuelta</label>
        <input type="number" id="devc-cant" step="1" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
      
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Estado del Producto</label>
        <select id="devc-estado" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
          <option value="bueno">Bueno — vuelve al stock</option>
          <option value="cuarentena">Cuarentena — no vuelve al stock</option>
          <option value="dañado">Dañado — no vuelve al stock</option>
        </select>
      </div>
      <div style="grid-column: 1/-1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo</label>
        <input type="text" id="devc-motivo" placeholder="Ej: error de despacho, sobrante de obra" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
      </div>
    </div>
  `;

  abrirModal({
    title: 'Registrar Devolución',
    body: `
      <div style="margin-bottom: 24px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Tipo de devolución</label>
        <select id="modal-dev-tipo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-weight: 600;">
          <option value="proveedor">A Proveedor (Insumo)</option>
          <option value="cliente">De Cliente (Producto Terminado)</option>
        </select>
      </div>
      
      <div id="dev-form-container">${htmlProveedor}</div>
    `,
    size: 'md',
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar Devolución</button>
    `,
    onOpen: (overlay) => {
      const selTipo = overlay.querySelector('#modal-dev-tipo');
      const formContainer = overlay.querySelector('#dev-form-container');

      function bindCliente() {
        const selProd = overlay.querySelector('#devc-prod');
        const groupEO = overlay.querySelector('#devc-eo-group');

        selProd.onchange = () => {
          const prod = data.productos.find((p) => p.codigo_pt === selProd.value);
          if (prod && prod.requiere_esterilizacion) {
            groupEO.style.display = 'block';
          } else {
            groupEO.style.display = 'none';
            overlay.querySelector('#devc-lote-eo').value = '';
          }
        };
      }

      function bindProveedor() {
        const selInsumo = overlay.querySelector('#devp-insumo');
        const selLote = overlay.querySelector('#devp-lote');
        const selProv = overlay.querySelector('#devp-proveedor');

        selInsumo.onchange = () => {
          const insId = selInsumo.value;
          selLote.innerHTML = '<option value="">— LIFO (Automático) —</option>';
          selProv.innerHTML = '<option value="">— Seleccionar —</option>';

          if (!insId) {
            data.proveedores.forEach((p) => {
              selProv.innerHTML += `<option value="${p.id}">${esc(p.razon_social)}</option>`;
            });
            return;
          }

          const lotesIns = data.lotes.filter((l) => l.insumo_id === insId);
          lotesIns.forEach((l) => {
            selLote.innerHTML += `<option value="${l.lote}">${l.lote} (Disp: ${num(l.cantidad_actual)})</option>`;
          });

          const provsIds = [...new Set(lotesIns.map((l) => l.proveedor_id).filter(Boolean))];
          const provsFiltrados = data.proveedores.filter((p) => provsIds.includes(p.id));

          if (provsFiltrados.length > 0) {
            provsFiltrados.forEach((p) => {
              selProv.innerHTML += `<option value="${p.id}">${esc(p.razon_social)}</option>`;
            });
          } else {
            data.proveedores.forEach((p) => {
              selProv.innerHTML += `<option value="${p.id}">${esc(p.razon_social)}</option>`;
            });
          }
        };

        selInsumo.dispatchEvent(new Event('change'));
      }

      selTipo.onchange = () => {
        tipoActual = selTipo.value;
        formContainer.innerHTML = tipoActual === 'proveedor' ? htmlProveedor : htmlCliente;
        if (tipoActual === 'cliente') bindCliente();
        else bindProveedor();
      };

      bindProveedor();

      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
          if (tipoActual === 'proveedor') {
            const insumo_id = overlay.querySelector('#devp-insumo').value;
            const proveedor_id = overlay.querySelector('#devp-proveedor').value;
            const cantidad = parseFloat(overlay.querySelector('#devp-cant').value);
            if (!insumo_id || !proveedor_id || !cantidad || cantidad <= 0)
              throw new Error('Completa todos los campos obligatorios');

            await onSave('proveedor', {
              insumo_id,
              proveedor_id,
              cantidad,
              motivo: overlay.querySelector('#devp-motivo').value.trim() || null,
              lote: overlay.querySelector('#devp-lote').value || null,
            });
          } else {
            const codigo_pt = overlay.querySelector('#devc-prod').value;
            const cantidad = parseFloat(overlay.querySelector('#devc-cant').value);
            if (!codigo_pt || !cantidad || cantidad <= 0)
              throw new Error('Completa todos los campos obligatorios');

            await onSave('cliente', {
              codigo_pt,
              cantidad,
              estado_producto: overlay.querySelector('#devc-estado').value,
              motivo: overlay.querySelector('#devc-motivo').value.trim() || null,
              lote_op: overlay.querySelector('#devc-lote-op').value.trim() || null,
              lote_eo: overlay.querySelector('#devc-lote-eo')
                ? overlay.querySelector('#devc-lote-eo').value.trim() || null
                : null,
              fecha_vencimiento: overlay.querySelector('#devc-fecha-vence').value || null,
            });
          }
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Guardar Devolución';
        }
      };
    },
  });
}