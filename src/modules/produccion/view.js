import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';

export function renderProduccion(container, data, onSave) {
  const { subproductos, movimientos } = data;

  const filas = movimientos.map(m => {
    const sub = m.subproducto_producciones?.subproductos;
    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${new Date(m.fecha).toLocaleString('es-CO', {dateStyle:'short', timeStyle:'short'})}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(sub?.nombre || '—')}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">+${num(m.cantidad)} u</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${esc(m.observaciones || '')}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Producción de Subproducto</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Fabrica subproductos por adelantado. El sistema descontará los insumos (FIFO).</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start;">
      
      <!-- Formulario -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 14px;">Nueva Producción</h3>
        
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Subproducto a Producir</label>
            <select id="prod-sub" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
              <option value="">— Seleccionar —</option>
              ${subproductos.map(s => `<option value="${s.id}">${esc(s.nombre)} (Stock: ${num(s.existencia_actual)})</option>`).join('')}
            </select>
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Producir</label>
            <input type="number" id="prod-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          </div>

          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo / Observación</label>
            <input type="text" id="prod-motivo" placeholder="Ej: Stock de seguridad" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          </div>

          <button id="btn-producir" style="margin-top: 8px; background: var(--accent); color: var(--accent-ink); border: none; padding: 10px; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">Ejecutar Producción</button>
        </div>
      </div>

      <!-- Historial -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
          <h3 style="margin: 0; font-size: 14px;">Últimas Producciones</h3>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Subproducto</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cant.</th>
              <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Motivo</th>
            </tr>
          </thead>
          <tbody>${movimientos.length === 0 ? '<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay producciones registradas.</td></tr>' : filas}</tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btn-producir').onclick = async () => {
    const id = container.querySelector('#prod-sub').value;
    const cant = parseFloat(container.querySelector('#prod-cant').value);
    const motivo = container.querySelector('#prod-motivo').value.trim();

    if (!id || !cant || cant <= 0) return toast('Selecciona un subproducto y una cantidad válida.', 'error');

    const btn = container.querySelector('#btn-producir');
    btn.disabled = true;
    btn.textContent = 'Produciendo...';

    try {
      await onSave(id, cant, motivo);
      toast('Producción completada exitosamente', 'success');
      // onSave en index.js recargará la vista
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Ejecutar Producción';
    }
  };
}