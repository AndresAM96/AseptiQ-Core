import { renderConsolidado } from './view.js';
import { generarConsolidado } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloConsolidado = {
  id: 'consolidado',
  mount: async (container) => {
    let dataActual = null;

    const cargarDatos = async () => {
      const panel = container.querySelector('#mrp-panel');
      panel.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">Calculando requerimientos (esto puede tardar)...</div>';

      try {
        dataActual = await generarConsolidado();
        renderConsolidado(container, dataActual, cargarDatos);
        if (!container.dataset.init) {
          toast('Consolidado generado exitosamente', 'success');
          container.dataset.init = 'true';
        }
      } catch (error) {
        panel.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
      }
    };

    renderConsolidado(container, dataActual, cargarDatos);
  },
  unmount: () => {}
};