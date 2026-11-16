import { esc } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';

export function renderConfiguracion(container, config, onSave) {
  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Configuración</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Parámetros globales del sistema.</p>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start;">
      
      <!-- Umbrales -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 14px; color: var(--accent);">Umbrales de Stock</h3>
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Urgente (% del Stock Objetivo)</label>
            <input type="number" id="cfg-u" value="${config.umbralUrgente}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Por debajo de este % el insumo se marca en ROJO.</p>
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Reorden (% del Stock Objetivo)</label>
            <input type="number" id="cfg-r" value="${config.umbralReorden}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Por debajo de este % el insumo se marca en AMARILLO.</p>
          </div>
        </div>
      </div>

      <!-- Prefijos -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="margin: 0 0 16px; font-size: 14px; color: var(--accent);">Prefijos de Códigos</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumos</label>
            <input type="text" id="cfg-pi" value="${esc(config.prefijoInsumo)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Subproductos</label>
            <input type="text" id="cfg-ps" value="${esc(config.prefijoSubproducto)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Productos (PT)</label>
            <input type="text" id="cfg-pp" value="${esc(config.prefijoProducto)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
          </div>
          <div>
            <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Órdenes (OP)</label>
            <input type="text" id="cfg-po" value="${esc(config.prefijoOP)}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-family: var(--font-mono);">
          </div>
        </div>
      </div>
    </div>

    <div style="margin-top: 24px;">
      <button id="btn-save-config" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 10px 24px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar Configuración</button>
    </div>
  `;

  container.querySelector('#btn-save-config').onclick = async () => {
    const nuevaConfig = {
      ...config,
      umbralUrgente: parseInt(container.querySelector('#cfg-u').value),
      umbralReorden: parseInt(container.querySelector('#cfg-r').value),
      prefijoInsumo: container.querySelector('#cfg-pi').value.trim(),
      prefijoSubproducto: container.querySelector('#cfg-ps').value.trim(),
      prefijoProducto: container.querySelector('#cfg-pp').value.trim(),
      prefijoOP: container.querySelector('#cfg-po').value.trim(),
    };

    if (nuevaConfig.umbralUrgente >= nuevaConfig.umbralReorden) {
      return toast('El umbral de Urgente debe ser menor que el de Reorden.', 'error');
    }

    const btn = container.querySelector('#btn-save-config');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      await onSave(nuevaConfig);
      toast('Configuración guardada correctamente', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar Configuración';
    }
  };
}