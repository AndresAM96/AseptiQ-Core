import { esc, num } from '../../core/formatters.js';
import { imprimirHTML } from '../../shared/ui/print.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';

export function renderDespachos(container, data, handlers) {
  const { despachos } = data;

  const filas = despachos
    .map((d) => {
      const prod = d.productos_terminados?.nombre || d.codigo_pt;
      return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-CO')}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(d.cliente)}</td>
        <td style="padding: 10px 12px;">${esc(prod)}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--danger); font-weight: 600;">-${num(d.cantidad)} u</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(d.lote_op || '—')}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(d.lote_eo || '—')}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(d.consecutivo || '—')}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(d.oc || '—')}</td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Despachos y Entregas</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Registra la salida de producto terminado hacia los clientes.</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="btn-imprimir-despachos" class="secondary small" title="Imprimir reporte del día" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 13px;">
          ${icono('printer', 'sm')} Imprimir Reporte del Día
        </button>
        <button id="btn-nuevo-despacho" class="btn-add" title="Registrar nuevo despacho" style="background: var(--accent); color: var(--accent-ink); border: none; width: 34px; height: 34px; border-radius: 8px; font-size: 20px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;">+</button>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-despachos" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-despachos" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Historial de Despachos</h3>
        <button class="panel-toggle-btn" title="Expandir/Colapsar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 8px;">
            <input type="text" id="buscar_despachos" placeholder="Buscar por cliente, producto o lote..." style="flex: 1; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
          </div>
          
          <div style="overflow-x: auto;">
            <table id="tablaDespachos" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Cliente</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote OP</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote EO</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Consecutivo</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">OC</th>
                </tr>
              </thead>
              <tbody>${despachos.length === 0 ? '<tr><td colspan="8" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay despachos registrados.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica de UI
  const panel = container.querySelector('#panel-despachos');
  const header = container.querySelector('#header-despachos');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  const inputBuscar = container.querySelector('#buscar_despachos');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaDespachos tbody tr').forEach((tr) => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  container.querySelector('#btn-nuevo-despacho').onclick = () => handlers.onNuevo(data.productos);
  container.querySelector('#btn-imprimir-despachos').onclick = () => handlers.onImprimir(despachos);
}

export function abrirModalDespacho(productos, onGetLotes, onSave) {
  const opcionesProds = productos
    .filter((p) => p.existencia_actual > 0)
    .map(
      (p) =>
        `<option value="${p.codigo_pt}" data-stock="${p.existencia_actual}">${esc(p.nombre)} (Stock: ${num(p.existencia_actual)})</option>`
    )
    .join('');

  abrirModal({
    title: 'Registrar Nuevo Despacho',
    subtitle: 'El sistema descontará el stock del producto terminado.',
    icon: icono('truck', 'lg'),
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div style="grid-column: 1/-1;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cliente</label>
          <input type="text" id="desp-cliente" placeholder="Nombre del cliente o destino" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        
        <div style="grid-column: 1/-1;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Producto Terminado</label>
          <select id="desp-pt" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            <option value="">— Seleccionar —</option>
            ${opcionesProds}
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad</label>
          <input type="number" id="desp-cant" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote OP</label>
          <input type="text" id="desp-lote" list="dl_lotes_op" placeholder="Ej: OP-0001" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
          <datalist id="dl_lotes_op"></datalist>
        </div>
        
        <div id="desp-eo-group" style="display: none;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote EO (Requerido)</label>
          <select id="desp-eo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
            <option value="">— Seleccionar —</option>
          </select>
        </div>
        
        <div id="desp-eo-group" style="display: none;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote EO (Requerido para estériles)</label>
          <select id="desp-eo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
            <option value="">— Seleccionar —</option>
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Consecutivo</label>
          <input type="text" id="desp-consecutivo" placeholder="Ej: 134 (1), 141 (6)" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Orden de Compra (OC)</label>
          <input type="text" id="desp-oc" placeholder="Ej: 80089" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>

        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha</label>
          <input type="date" id="desp-fecha" value="${new Date().toISOString().slice(0, 10)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha Vencimiento (MM/YY)</label>
          <input type="text" id="desp-fv" placeholder="Ej: 08/29" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>

        <div style="grid-column: 1/-1;">
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Observaciones</label>
          <textarea id="desp-obs" rows="2" placeholder="Observaciones de entrega..." style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;"></textarea>
        </div>
      </div>
    `,
    size: 'md',
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Registrar Despacho</button>
    `,
    onOpen: (overlay) => {
      const selPT = overlay.querySelector('#desp-pt');
      const dlLotes = overlay.querySelector('#dl_lotes_op');
      const groupEO = overlay.querySelector('#desp-eo-group');
      const selEO = overlay.querySelector('#desp-eo');
      const inpLoteOP = overlay.querySelector('#desp-lote');

      let lotesCargados = [];

      // Cargar lotes disponibles cuando se selecciona un PT
      selPT.onchange = async () => {
        dlLotes.innerHTML = '';
        selEO.innerHTML = '<option value="">— Seleccionar —</option>';
        inpLoteOP.value = '';

        const pt = selPT.value;
        const prod = productos.find((p) => p.codigo_pt === pt);

        // Mostrar campo EO si es estéril
        if (prod && prod.requiere_esterilizacion) {
          groupEO.style.display = 'block';
        } else {
          groupEO.style.display = 'none';
        }

        if (!pt) return;

        try {
          lotesCargados = await onGetLotes(pt);
          lotesCargados.forEach((l) => {
            dlLotes.innerHTML += `<option value="${esc(l.lote_op)}"></option>`;
          });
        } catch (err) {
          console.warn(err);
        }
      };

      // Al escribir/seleccionar un Lote OP, buscar sus Lotes EO
      inpLoteOP.onchange = () => {
        const loteOpSel = inpLoteOP.value.trim();
        selEO.innerHTML = '<option value="">— Seleccionar —</option>';

        if (!loteOpSel) return;

        const filtrados = lotesCargados.filter((l) => l.lote_op === loteOpSel);
        filtrados.forEach((l) => {
          const textoEO = l.lote_eo ? l.lote_eo : 'SIN EO';
          // Mostramos el saldo disponible de ese lote específico
          selEO.innerHTML += `<option value="${esc(l.lote_eo || '')}">${esc(textoEO)} (Disp: ${num(l.cantidad_actual)})</option>`;
        });
      };

      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const btn = overlay.querySelector('#btn-save');
        const cliente = overlay.querySelector('#desp-cliente').value.trim();
        const pt = selPT.value;
        const cantidad = parseFloat(overlay.querySelector('#desp-cant').value);
        const lote_op = overlay.querySelector('#desp-lote').value.trim();
        const fecha = overlay.querySelector('#desp-fecha').value;

                const prod = productos.find(p => p.codigo_pt === pt);
        const lote_eo = overlay.querySelector('#desp-eo').value;

        if (!cliente || !pt || !cantidad || cantidad <= 0 || !lote_op) {
          return toast('Completa los campos obligatorios (Cliente, Producto, Cantidad, Lote OP).', 'error');
        }
        if (prod && prod.requiere_esterilizacion && !lote_eo) {
          return toast('Debes seleccionar un Lote EO para este producto estéril.', 'error');
        }

        btn.disabled = true;
        btn.textContent = 'Despachando...';

        try {
          await onSave({
            codigo_pt: pt,
            cantidad,
            cliente,
            lote_op,
            lote_eo: overlay.querySelector('#desp-eo').value || null,
            consecutivo: overlay.querySelector('#desp-consecutivo').value.trim() || null,
            oc: overlay.querySelector('#desp-oc').value.trim() || null,
            fecha,
            fecha_vencimiento: overlay.querySelector('#desp-fv').value.trim() || null,
            observaciones: overlay.querySelector('#desp-obs').value.trim() || null,
          });
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Registrar Despacho';
        }
      };
    },
  });
}

export function imprimirReporteDespachos(despachos, fechaFiltro) {
  const despachosDelDia = despachos.filter((d) => d.fecha === fechaFiltro);

  if (despachosDelDia.length === 0) {
    return toast('No hay despachos para la fecha de hoy.', 'info');
  }

  const fechaFormat = new Date(fechaFiltro + 'T12:00:00').toLocaleDateString('es-CO');

  let tabla =
    '<table class="print-table" style="width:100%; border-collapse:collapse; font-size:9pt;">';
  tabla += '<thead><tr>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:left;">ÍTEM</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:left;">CÓDIGO PT</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:center;">FV</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:right;">UND.</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:right;">CAJAS</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:center;">LOTE OP</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:center;">LOTE EO</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:center;">CONSEC.</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:center;">OC</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#a5c7e9; text-align:left;">CLIENTE</th>';
  tabla += '</tr></thead><tbody>';

  despachosDelDia.forEach((d) => {
    const prod = d.productos_terminados ? d.productos_terminados.nombre : d.codigo_pt;
    const caja = d.productos_terminados ? d.productos_terminados.unidades_por_caja : 1;
    const cajas = caja > 1 ? Math.floor(d.cantidad / caja) : d.cantidad;

    tabla += `<tr>
      <td style="border:1px solid #000; padding:6px;">${esc(prod)}</td>
      <td style="border:1px solid #000; padding:6px; font-family:monospace;">${esc(d.codigo_pt)}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-family:monospace;">${esc(d.fecha_vencimiento || '—')}</td>
      <td style="border:1px solid #000; padding:6px; text-align:right; font-family:monospace;">${num(d.cantidad)}</td>
      <td style="border:1px solid #000; padding:6px; text-align:right; font-family:monospace;">${num(cajas)}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-family:monospace;">${esc(d.lote_op || '—')}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-family:monospace;">${esc(d.lote_eo || '—')}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-family:monospace;">${esc(d.consecutivo || '—')}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center; font-family:monospace;">${esc(d.oc || '—')}</td>
      <td style="border:1px solid #000; padding:6px;">${esc(d.cliente)}</td>
    </tr>`;
  });

  // Rellenar filas vacías
  const filasRestantes = 8 - despachosDelDia.length;
  for (let i = 0; i < filasRestantes; i++) {
    tabla += `<tr><td style="border:1px solid #000; padding:10px;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td><td style="border:1px solid #000;"></td></tr>`;
  }
  tabla += '</tbody></table>';

  const firmas = `
    <div class="print-signatures" style="grid-template-columns: 1fr 1fr; margin-top:60px;">
      <div class="print-signature"><div class="name">JEFE DE LOGÍSTICA</div></div>
      <div class="print-signature"><div class="name">CONDUCTOR / RECIBE</div></div>
    </div>
  `;

  const html = `
    <div style="font-family: Arial; color:#000;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1b75bb; padding-bottom:10px; margin-bottom:20px;">
        <div><h2 style="margin:0; color:#1b75bb;">AseptiQ</h2></div>
        <div style="text-align:right; font-size:10pt;"><b>Entregas para el día:</b> ${fechaFormat}</div>
      </div>
      ${tabla}
      <div style="margin-top:20px; font-size:9.5pt;">
        <b>Observaciones:</b><br>
        <div style="border-bottom:1px solid #000; padding:10px 0; min-height:30px;"></div>
      </div>
      ${firmas}
    </div>
  `;

  const cssPrint = `@page { size: letter landscape; margin: 15mm; } body { padding: 0; }`;
  imprimirHTML(html, 'Despachos Diarios', cssPrint);
}
