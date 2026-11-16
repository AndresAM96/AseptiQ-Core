import { renderTrazabilidad, renderPanelForward, renderPanelBackward } from './view.js';
import { getLotesPT, getInsumosYLotes, trazarForward, trazarBackward } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloTrazabilidad = {
  id: 'trazabilidad',
  mount: async (container) => {
    renderTrazabilidad(container);

    const panel = container.querySelector('#trazabilidad-panel');
    const btnFwd = container.querySelector('#tab-forward');
    const btnBwd = container.querySelector('#tab-backward');

    // Cargar datos asíncronamente en segundo plano
    try {
      const [lotesPT, insumos] = await Promise.all([
        getLotesPT(),
        getInsumosYLotes()
      ]);

      // Lógica para cambiar de pestaña
      btnFwd.onclick = () => {
        btnFwd.style.cssText = 'background: var(--surface-3); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-primary); font-weight: 600;';
        btnBwd.style.cssText = 'background: transparent; border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-secondary);';
        renderPanelForward(panel, lotesPT, trazarForward);
      };

      btnBwd.onclick = () => {
        btnBwd.style.cssText = 'background: var(--surface-3); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-primary); font-weight: 600;';
        btnFwd.style.cssText = 'background: transparent; border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-secondary);';
        renderPanelBackward(panel, insumos, trazarBackward);
      };

      // Iniciar en Forward por defecto
      renderPanelForward(panel, lotesPT, trazarForward);

    } catch (err) {
      panel.innerHTML = `<div style="color: var(--danger);">Error cargando datos: ${traducirError(err.message)}</div>`;
    }
  },
  unmount: () => {}
};