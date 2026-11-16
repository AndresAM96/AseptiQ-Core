import { esc, num } from '../../core/formatters.js';
import { unidadCompra } from '../../core/cadena.js';
import { toast } from '../../shared/ui/toast.js';

export function renderEntradas(container, data, onSave) {
  const { insumos, proveedores, movimientos } = data;

  const opcionesInsumos = insumos.map(i =>
    `<option value="${i.id}">${esc(i.nombre)} (${esc(i.codigo)})</option>`
  ).join('');

  const opcionesProvs = proveedores.map(p =>
    `<option value="${p.id}">${esc(p.razon_social)}</option>`
  ).join('');

  // Filas del historial reciente
  const filasHistorial = movimientos.map(m => {
    const fecha = new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${fecha}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(m.insumos?.nombre || '—')}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">+${num(m.cantidad)} ${esc(m.insumos?.unidad_consumo || '')}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(m.insumo_lotes?.lote || 'S/N')}</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${esc(m.insumo_lotes?.sys_proveedores?.razon_social || '—')}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Entrada de Mercancía</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Registra la recepción de insumos de proveedores.</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start;">
      
      <!-- Formulario -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 14px;">Nueva Entrada</h3>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumo</label>
            <select id="ent-insumo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
              <option value="">— Seleccionar Insumo —</option>
              ${opcionesInsumos}
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Proveedor (Opcional)</label>
            <select id="ent-proveedor" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
              <option value="">— Sin proveedor —</option>
              ${opcionesProvs}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad (<span id="ent-ublabel">—</span>)</label>
              <input type="number" id="ent-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Costo por Unidad de Compra</label>
              <input type="number" id="ent-costo" step="0.01" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
            </div>
          </div>

          <!-- Campos condicionales (Lote y Vencimiento) -->
          <div id="ent-lote-group" style="display: none;">
            <label style="display: block; font-size: 12px; color: var(--accent); margin-bottom: 6px;">Número de Lote (Obligatorio)</label>
            <input type="text" id="ent-lote" placeholder="Ej: L-2026-001" style="width: 100%; border: 1px solid var(--accent); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px; font-family: var(--font-mono);">
          </div>

          <div id="ent-vence-group" style="display: none;">
            <label style="display: block; font-size: 12px; color: var(--danger); margin-bottom: 6px;">Fecha de Vencimiento (Obligatorio)</label>
            <input type="date" id="ent-vence" style="width: 100%; border: 1px solid var(--danger); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          </div>

          <button id="btn-guardar-ent" style="margin-top: 8px; background: var(--accent); color: var(--accent-ink); border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">Registrar Entrada</button>
        </div>
      </div>

      <!-- Historial Reciente -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
          <h3 style="margin: 0; font-size: 14px;">Últimas Entradas</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Lote</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Proveedor</th>
            </tr>
          </thead>
          <tbody>
            ${movimientos.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay entradas registradas.</td></tr>' : filasHistorial}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Lógica de UI (Mostrar/ocultar lote y vencimiento)
  const selInsumo = container.querySelector('#ent-insumo');
  const groupLote = container.querySelector('#ent-lote-group');
  const groupVence = container.querySelector('#ent-vence-group');
  const labelU = container.querySelector('#ent-ublabel');

  selInsumo.onchange = () => {
    const ins = insumos.find(i => i.id === selInsumo.value);
    if (!ins) {
      groupLote.style.display = 'none';
      groupVence.style.display = 'none';
      labelU.textContent = '—';
      return;
    }

    // Mostrar el nombre de la unidad de compra (ej: "caja" o "u")
    labelU.textContent = unidadCompra(ins);

    // Mostrar campos obligatorios según configuración del insumo
    groupLote.style.display = ins.requiere_lote ? 'block' : 'none';
    groupVence.style.display = ins.requiere_vencimiento ? 'block' : 'none';
  };

  // Guardar
  const btnGuardar = container.querySelector('#btn-guardar-ent');
  btnGuardar.onclick = async () => {
    const insumo_id = selInsumo.value;
    if (!insumo_id) return toast('Selecciona un insumo', 'error');

    const ins = insumos.find(i => i.id === insumo_id);
    const cantidad = parseFloat(container.querySelector('#ent-cant').value);
    if (!cantidad || cantidad <= 0) return toast('Cantidad inválida', 'error');

    const lote = container.querySelector('#ent-lote').value.trim();
    if (ins.requiere_lote && !lote) return toast('El lote es obligatorio', 'error');

    const vence = container.querySelector('#ent-vence').value;
    if (ins.requiere_vencimiento && !vence) return toast('La fecha de vencimiento es obligatoria', 'error');

    btnGuardar.textContent = 'Guardando...';
    btnGuardar.disabled = true;

    try {
      await onSave({
        insumo_id,
        proveedor_id: container.querySelector('#ent-proveedor').value,
        cantidad,
        costo_unitario: parseFloat(container.querySelector('#ent-costo').value) || null,
        lote_insumo: lote,
        fecha_vencimiento: vence || null
      });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btnGuardar.textContent = 'Registrar Entrada';
      btnGuardar.disabled = false;
    }
  };
}