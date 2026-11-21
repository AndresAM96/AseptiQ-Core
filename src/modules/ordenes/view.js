import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';

export function renderOrdenes(container, data, handlers) {
  const { productos, ordenes, ultimas } = data;

  // Generar tabla de referencia (últimas 5)
  const filasRef = ultimas.map(o => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(o.numero_op || '—')}</td>
      <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--text-secondary); font-size: 12px;">${esc(o.lote)}</td>
      <td style="padding: 10px 12px;">${esc(o.productos_terminados?.nombre || o.codigo_pt)}</td>
      <td style="padding: 10px 12px; text-align: right;">${o.cantidad_proyectada}</td>
      <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(o.fecha_creacion).toLocaleDateString('es-CO')}</td>
    </tr>
  `).join('');

  // Generar tabla de órdenes
  const filasOrdenes = ordenes.map(o => {
    const prod = o.productos_terminados?.nombre || o.codigo_pt;
    const pc = o.productos_terminados?.unidades_por_caja || 1;
    const cajas = o.cantidad_proyectada && pc > 1 ? Math.ceil(o.cantidad_proyectada / pc) : null;
    const fin = o.estado_op === 'Terminada' || o.estado_op === 'Cancelada';
    const producida = Number(o.cantidad_producida) || 0;
    const proyectada = Number(o.cantidad_proyectada) || 0;
    const pendiente = proyectada - producida;
    const hayProgreso = producida > 0 && producida < proyectada;

    const progresoTxt = proyectada > 0 ? `<br><span style="color:${producida >= proyectada ? 'var(--success)' : 'var(--info)'};font-size:11px;">${producida}/${proyectada} entregado${producida >= proyectada ? ' ✓' : ''}</span>` : '';

    // Badges
    const prioridadColors = { 1: 'danger', 2: 'warning', 3: 'info', 4: 'success' };
    const prioridadLabels = { 1: 'Muy alta', 2: 'Alta', 3: 'Normal', 4: 'Baja' };
    const prioridad = o.prioridad ? `<span class="badge ${prioridadColors[o.prioridad]}">${prioridadLabels[o.prioridad]}</span>` : '—';

    const coberturaColors = { 'Cubierto': 'success', 'Cubierta': 'success', 'Reorden': 'warning', 'Urgente': 'danger' };
    const cobertura = `<span class="badge ${coberturaColors[o.estado_cobertura] || 'neutral'}">${o.estado_cobertura}</span>`;

    const estadoColors = { 'Pendiente': 'neutral', 'En proceso': 'info', 'Terminada': 'success', 'Cancelada': 'danger' };
    const estado = `<span class="badge ${estadoColors[o.estado_op] || 'neutral'}">${o.estado_op}</span>`;

    const fechaProg = o.fecha_programada ? new Date(o.fecha_programada + 'T12:00:00').toLocaleDateString('es-CO') : '<span style="color:var(--text-muted);">—</span>';

    return `
      <tr style="border-bottom: 1px solid var(--border);" data-estado="${o.estado_op}">
        <td style="padding: 10px 12px;" class="mono">${esc(o.numero_op || '—')}<br><span style="font-size:11px;color:var(--text-muted);">${esc(o.lote)}</span></td>
        <td style="padding: 10px 12px;">${prioridad}</td>
        <td style="padding: 10px 12px;">${esc(prod)}</td>
        <td style="padding: 10px 12px; text-align: right;">${proyectada}${cajas ? `<br><span style="color:var(--text-muted);font-size:11px;">≈ ${cajas} cajas</span>` : ''}${progresoTxt}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${fechaProg}</td>
        <td style="padding: 10px 12px;">${cobertura}</td>
        <td style="padding: 10px 12px;">${estado}</td>
        <td style="padding: 10px 12px; text-align: right; white-space: nowrap;">
          <button data-detalle="${o.id}" title="Ver insumos, progreso y lotes de esta OP" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px;">Detalle</button>
          <button data-entregar="${o.id}" data-pendiente="${pendiente}" data-nombre="${o.numero_op}" ${fin || pendiente <= 0 ? 'disabled' : ''} title="Registrar entrega a cliente (total o parcial)" style="background: var(--success); color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-right: 4px; opacity: ${fin || pendiente <= 0 ? '0.5' : '1'};">${hayProgreso ? 'Entrega parcial' : 'Entregar'}</button>
          <button data-cancelar="${o.id}" ${fin ? 'disabled' : ''} title="Cancelar esta Orden de Producción" style="background: var(--danger-bg); color: var(--danger); border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; opacity: ${fin ? '0.5' : '1'};">Cancelar</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Cargar orden semanal</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">El sistema explota insumos directos y los de cada subproducto (recursivo).</p>
      </div>
    </div>

    <!-- Panel Referencia -->
    <div class="panel-collapsible collapsed" id="panel-referencia" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 16px; overflow: hidden;">
      <div class="panel-header" id="header-referencia" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Referencia · Últimas 5 OPs cargadas</h3>
        <button class="panel-toggle-btn" title="Expandir/Colapsar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          ${ultimas.length === 0 ? '<div style="padding: 20px; text-align: center; color: var(--text-muted);">Aún no hay OPs cargadas.</div>' : `
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <thead>
              <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">N° OP</th>
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Lote</th>
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
                <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              </tr>
            </thead>
            <tbody>${filasRef}</tbody>
          </table>`}
        </div>
      </div>
    </div>

    <!-- Panel Principal -->
    <div class="panel-collapsible" id="panel-ordenes" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-ordenes" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; gap: 12px; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Órdenes registradas</h3>
        <div style="display: flex; gap: 6px; align-items: center;">
          <button id="btn-export-ordenes" class="secondary small" title="Descargar las órdenes en formato Excel (CSV)" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;" onclick="event.stopPropagation();">
            ${icono('download','sm')} Exportar CSV
          </button>
          <button id="btn-refresh-ordenes" title="Actualizar la lista de órdenes" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">
            ${icono('clock','sm')}
          </button>
          <button class="btn-add" id="btn-nueva-op" title="Crear nueva Orden de Producción (OP)" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 12px 18px; border-bottom: 1px solid var(--border); display: flex; gap: 8px; flex-wrap: wrap;">
            <input type="text" id="buscar_ordenes" placeholder="Buscar por OP o producto..." style="flex: 1 1 220px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px 12px; font-size: 13.5px;">
          </div>
          
          <div style="padding: 10px 18px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-secondary); cursor: pointer;">
              <input type="checkbox" id="toggleFinalizadas" style="width: auto; margin: 0; cursor: pointer;">
              Mostrar también las órdenes terminadas y canceladas
            </label>
          </div>

          <div style="overflow-x: auto;">
        <table id="tablaOrdenes" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">N° OP</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Prior.</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cantidad</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Programada</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Cobertura</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${ordenes.length === 0 ? '<tr><td colspan="8" style="padding: 32px; text-align: center; color: var(--text-muted);">No hay órdenes para mostrar.</td></tr>' : filasOrdenes}
          </tbody>
        </table>
      </div>
        </div>
      </div>
    </div>
  `;

  // --- LÓGICA DE LA TABLA ---

  // Buscador
  const inputBuscar = container.querySelector('#buscar_ordenes');
  inputBuscar.oninput = () => {
    const q = inputBuscar.value.toLowerCase();
    container.querySelectorAll('#tablaOrdenes tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  // Checkbox de finalizadas
  const chkFinalizadas = container.querySelector('#toggleFinalizadas');
  chkFinalizadas.onchange = () => {
    const mostrar = chkFinalizadas.checked;
    container.querySelectorAll('#tablaOrdenes tbody tr').forEach(tr => {
      const estado = tr.getAttribute('data-estado');
      if (!mostrar && (estado === 'Terminada' || estado === 'Cancelada')) {
        tr.style.display = 'none';
      } else {
        tr.style.display = '';
      }
    });
  };

  // Ocultar finalizadas por defecto
  chkFinalizadas.onchange();

  // Botones
  container.querySelector('#btn-nueva-op').onclick = () => handlers.onNueva(productos);

  container.querySelectorAll('[data-entregar]').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.entregar;
      const pendiente = parseFloat(btn.dataset.pendiente);
      const nombre = btn.dataset.nombre;
      handlers.onEntregar(id, pendiente, nombre);
    };
  });

  container.querySelectorAll('[data-cancelar]').forEach(btn => {
    btn.onclick = () => {
      handlers.onCancelar(btn.dataset.cancelar);
    };
  });

  container.querySelectorAll('[data-detalle]').forEach(btn => {
    btn.onclick = () => handlers.onVerDetalle(btn.dataset.detalle);
  });

  container.querySelector('#btn-export-ordenes').onclick = () => handlers.onExportar();

  // --- LÓGICA DE PANELES COLAPSABLES ---
  const setupToggle = (panelId, headerId) => {
    const panel = container.querySelector(panelId);
    const header = container.querySelector(headerId);
    if (!panel || !header) return;

    header.onclick = (e) => {
      // Si el clic fue en un botón dentro del header, no colapsar
      if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
      panel.classList.toggle('collapsed');
    };
  };

  setupToggle('#panel-referencia', '#header-referencia');
  setupToggle('#panel-ordenes', '#header-ordenes');

  container.querySelector('#btn-refresh-ordenes').onclick = (e) => {
    const btn = e.currentTarget;
    btn.style.transform = 'rotate(360deg)';
    btn.style.transition = 'transform 0.5s ease';
    setTimeout(() => {
      btn.style.transform = 'rotate(0deg)';
      btn.style.transition = 'none';
    }, 500);
    handlers.onRefrescar();
  };
}

export function abrirModalNuevaOP(productos, sugerido, onCalcular) {
  const opcionesProds = productos.map(p =>
    `<option value="${p.codigo_pt}" data-caja="${p.unidades_por_caja}">${esc(p.nombre)}</option>`
  ).join('');

  const body = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Número de OP</label>
        <div style="display: flex;">
          <span style="background: var(--surface-3); border: 1px solid var(--border); border-right: none; border-radius: 8px 0 0 8px; padding: 10px; font-size: 13.5px; color: var(--text-secondary); font-family: var(--font-mono);">OP-</span>
          <input type="text" id="op-numero" value="${sugerido}" style="flex: 1; border-radius: 0 8px 8px 0; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono); font-size: 13.5px;">
        </div>
      </div>
      
      <div style="grid-column: 1 / -1;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Producto Terminado</label>
        <select id="op-pt" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="">— Seleccionar —</option>
          ${opcionesProds}
        </select>
      </div>

      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Producir</label>
        <input type="number" id="op-cant" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
        <div id="op-cant-hint" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;"></div>
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Prioridad</label>
        <select id="op-prioridad" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="3">Normal</option>
          <option value="1">Muy Alta</option>
          <option value="2">Alta</option>
          <option value="4">Baja</option>
        </select>
      </div>

      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha Inicio (Opcional)</label>
        <input type="date" id="op-fecha" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Fecha Fin (Opcional)</label>
        <input type="date" id="op-fecha-fin" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>
  `;

  abrirModal({
    title: 'Nueva Orden de Producción',
    body,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-calcular" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Calcular Cobertura</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = cerrarModal;

      // Preview de cajas
      const selPT = overlay.querySelector('#op-pt');
      const inpCant = overlay.querySelector('#op-cant');
      const hint = overlay.querySelector('#op-cant-hint');

      const updateHint = () => {
        const opt = selPT.options[selPT.selectedIndex];
        if (!opt || !opt.dataset.caja) { hint.textContent = ''; return; }
        const caja = parseInt(opt.dataset.caja) || 1;
        const cant = parseFloat(inpCant.value) || 0;
        hint.textContent = (cant > 0 && caja > 1) ? `≈ ${Math.ceil(cant / caja)} cajas` : '';
      };
      selPT.onchange = updateHint;
      inpCant.oninput = updateHint;

      const btnCalcular = overlay.querySelector('#btn-calcular');
      btnCalcular.onclick = () => {
        const codigo_pt = selPT.value;
        const cantidad = parseFloat(inpCant.value);
        const numero_op = overlay.querySelector('#op-numero').value.trim();

        if (!codigo_pt || !cantidad || cantidad <= 0) return toast('Selecciona producto y cantidad válida.', 'error');
        if (!numero_op) return toast('El Número de OP es obligatorio.', 'error');

        const data = {
          codigo_pt,
          cantidad,
          numero_op: 'OP-' + numero_op.replace('OP-', ''),
          prioridad: parseInt(overlay.querySelector('#op-prioridad').value),
          fecha_programada: overlay.querySelector('#op-fecha').value,
          fecha_fin_programada: overlay.querySelector('#op-fecha-fin').value
        };

        onCalcular(data);
      };
    }
  });
}

export function abrirModalCobertura(data, simulacion, insumos, onConfirmar) {
  // Cruzar requerimientos con stock real
  const reqs = simulacion.insumo_req || {};
  let hayFaltantes = false;

  const filas = Object.keys(reqs).map(ins_id => {
    const ins = insumos.find(i => i.id === ins_id);
    if (!ins) return '';

    const requerido = reqs[ins_id];
    const stock = ins.existencia_actual;
    const faltante = Math.max(0, requerido - stock);
    if (faltante > 0) hayFaltantes = true;

    const color = faltante > 0 ? 'var(--danger)' : 'var(--success)';
    const badge = faltante > 0
      ? '<span style="color: var(--danger); font-weight: 600;">Faltan</span>'
      : '<span style="color: var(--success);">OK</span>';

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-weight: 500;">${esc(ins.nombre)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(requerido)} ${esc(ins.unidad_consumo)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(stock)} ${esc(ins.unidad_consumo)}</td>
        <td style="padding: 10px 12px; text-align: right; color: ${color}; font-weight: 600;">${faltante > 0 ? num(faltante) : '—'}</td>
        <td style="padding: 10px 12px; text-align: center;">${badge}</td>
      </tr>
    `;
  }).join('');

  const body = `
    <div style="margin-bottom: 16px; padding: 12px; border-radius: 8px; background: var(--${hayFaltantes ? 'danger' : 'success'}-bg); border: 1px solid var(--${hayFaltantes ? 'danger' : 'success'}); color: var(--${hayFaltantes ? 'danger' : 'success'}); font-weight: 500;">
      ${hayFaltantes ? '⚠ Hay insumos faltantes. Puedes confirmar la orden, pero quedará en estado Pendiente.' : '✓ Todos los insumos están cubiertos. Listo para producir.'}
    </div>
    
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Requerido</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">En Stock</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Faltante</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Estado</th>
        </tr>
      </thead>
      <tbody>${filas || '<tr><td colspan="5" style="padding: 16px; text-align: center;">Esta receta no requiere insumos.</td></tr>'}</tbody>
    </table>
  `;

  abrirModal({
    title: 'Cobertura de Insumos',
    subtitle: `OP: ${data.numero_op} | Producto: ${data.codigo_pt} | Cant: ${data.cantidad}`,
    body,
    size: 'md',
    footer: `
      <button id="btn-cancel-cob" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Volver</button>
      <button id="btn-confirmar" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Confirmar Orden</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel-cob').onclick = cerrarModal;

      const btnConf = overlay.querySelector('#btn-confirmar');
      btnConf.onclick = async () => {
        btnConf.textContent = 'Confirmando...';
        btnConf.disabled = true;
        try {
          data.estado_cobertura = hayFaltantes ? 'Urgente' : 'Cubierto';
          data.detalle = simulacion;
          await onConfirmar(data);
        } catch (err) {
          toast(err.message, 'error');
        } finally {
          // Esto asegura que el modal se cierre SIEMPRE, incluso si la base de datos falla
          cerrarModal();
        }
      };
    }
  });
}

export function abrirModalEntrega(numero_op, pendiente, onSave) {
  const body = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Entregar (Pendiente: ${pendiente})</label>
        <input type="number" id="ent-cant" value="${pendiente}" min="0.0001" max="${pendiente}" step="0.0001" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
      <!-- El lote se asigna automáticamente desde la OP -->
      <div>
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo / Observaciones (Opcional)</label>
        <input type="text" id="ent-motivo" placeholder="Ej: Entrega parcial" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
      </div>
    </div>
  `;

  abrirModal({
    title: `Registrar Entrega - ${numero_op}`,
    body,
    footer: `
      <button id="btn-cancel-ent" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save-ent" style="background: var(--success); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Confirmar Entrega</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel-ent').onclick = cerrarModal;

      overlay.querySelector('#btn-save-ent').onclick = async () => {
        const cant = parseFloat(overlay.querySelector('#ent-cant').value);
        if (!cant || cant <= 0 || cant > pendiente) return toast('Cantidad inválida', 'error');

        const btn = overlay.querySelector('#btn-save-ent');
        btn.disabled = true;
        btn.textContent = 'Entregando...';

        try {
          await onSave(cant, overlay.querySelector('#ent-motivo').value.trim());
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Confirmar Entrega';
        }
      };
    }
  });
}