import { renderConsolidado, renderResultadoConsolidado, imprimirConsolidado } from './view.js';
import { generarConsolidado } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloConsolidado = {
  id: 'consolidado',
  mount: async (container) => {
    try {
      const handlers = {
        onGenerar: async (desde, hasta) => {
          const box = container.querySelector('#cons-resultado');
          box.innerHTML =
            '<div style="text-align:center; color:var(--text-muted); padding:40px;">Calculando requerimientos...</div>';

          try {
            const data = await generarConsolidado(desde, hasta);
            renderResultadoConsolidado(container, desde, hasta, data, imprimirConsolidado);
          } catch (error) {
            box.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 20px;">Error: ${traducirError(error.message)}</div>`;
            toast('Error cargando el consolidado', 'error');
          }
        },
      };

      renderConsolidado(container, handlers);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {},
};