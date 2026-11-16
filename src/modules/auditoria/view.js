import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export function renderAuditoria(container, insumos, onAplicar) {
  const filas = insumos.map(ins => `
    <tr style="border-bottom: 1px solid var(--border);" data-row-id="${ins.id}">
      <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 12px;">${esc(ins.codigo)}</td>
      <td style="padding: 10px 12px; font-weight: 500;">${esc(ins.nombre)}</td>
      <td style="padding: 10px 12px; text-align: right; color: var(--text-secondary);">${num(ins.existencia_actual)} ${esc(ins.unidad_consumo)}</td>
      <td style="padding: 10px 12px;">
        <input type="number" class="input-conteo" data-id="${ins.id}" data-sistema="${ins.existencia_actual}" step="0.0001" placeholder="—" style="width: 100%; max-width: 120px; background: var(--surface-2); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; font-size: 13px; text-align: right;">
      </td>
      <td style="padding: 10px 12px; text-align: right; font-weight: 600; font-family: var(--font-mono);" class="cell-diferencia">—</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Auditoría y Conteo Físico</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Ingresa el conteo real para calcular diferencias y ajustar el inventario.</p>
      </div>
      <button id="btn-aplicar" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Aplicar Ajustes</button>
    </div>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div style="padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--surface-2); display: flex; gap: 12px; align-items: center;">
        <input type="text" id="aud-buscar" placeholder="Buscar por código o nombre..." style="flex: 1; border: 1px solid var(--border); border-radius: 6px; background: var(--surface-1); color: var(--text-primary); padding: 8px 12px; font-size: 13px;">
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left;">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Sistema</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Conteo Físico</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Diferencia</th>
          </tr>
        </thead>
        <tbody id="aud-tbody">
          ${insumos.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay insumos activos.</td></tr>' : filas}
        </tbody>
      </table>
    </div>
  `;

  // Buscador simple
  const inpBuscar = container.querySelector('#aud-buscar');
  inpBuscar.oninput = () => {
    const q = inpBuscar.value.toLowerCase();
    container.querySelectorAll('#aud-tbody tr').forEach(tr => {
      tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
    });
  };

  // Lógica de cálculo en vivo (Diferencia)
  container.querySelectorAll('.input-conteo').forEach(inp => {
    inp.oninput = (e) => {
      const val = parseFloat(e.target.value);
      const sistema = parseFloat(e.target.dataset.sistema);
      const row = e.target.closest('tr');
      const cellDif = row.querySelector('.cell-diferencia');

      if (isNaN(val)) {
        cellDif.textContent = '—';
        cellDif.style.color = 'inherit';
        return;
      }

      const dif = val - sistema;
      if (Math.abs(dif) < 0.00001) {
        cellDif.textContent = '0';
        cellDif.style.color = 'var(--text-muted)';
      } else if (dif > 0) {
        cellDif.textContent = '+' + num(dif);
        cellDif.style.color = 'var(--success)';
      } else {
        cellDif.textContent = num(dif);
        cellDif.style.color = 'var(--danger)';
      }
    };
  });

  // Botón de aplicar
  container.querySelector('#btn-aplicar').onclick = () => {
    const ajustes = [];
    container.querySelectorAll('.input-conteo').forEach(inp => {
      const valStr = inp.value.trim();
      if (!valStr) return; // Ignorar vacíos

      const val = parseFloat(valStr);
      const sistema = parseFloat(inp.dataset.sistema);

      // Solo guardamos si hay diferencia real
      if (Math.abs(val - sistema) > 0.00001) {
        ajustes.push({ id: inp.dataset.id, nueva_existencia: val });
      }
    });

    if (ajustes.length === 0) {
      return toast('No hay diferencias para aplicar.', 'info');
    }

    abrirModal({
      title: 'Confirmar Ajustes',
      body: `<p>Se van a aplicar <b>${ajustes.length}</b> ajustes de inventario. Esta acción generará movimientos en el Kardex y no se puede deshacer.</p>`,
      footer: `
        <button id="btn-cancel-ajuste" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
        <button id="btn-conf-ajuste" style="background: var(--danger); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Sí, Aplicar Ajustes</button>
      `,
      onOpen: (overlay) => {
        overlay.querySelector('#btn-cancel-ajuste').onclick = cerrarModal;
        overlay.querySelector('#btn-conf-ajuste').onclick = async () => {
          cerrarModal();
          await onAplicar(ajustes);
        };
      }
    });
  };
}