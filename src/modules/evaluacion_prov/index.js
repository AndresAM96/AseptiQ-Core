import { renderEvaluacion, abrirModalEvaluacion } from './view.js';
import { getEvaluacionData, guardarEvaluacion } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloEvaluacionProv = {
  id: 'evaluacion_prov',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Calculando métricas...</div>';
    try {
      const data = await getEvaluacionData();

      const onEvaluar = (prov) => {
        abrirModalEvaluacion(prov, async (nuevaEval) => {
          await guardarEvaluacion(nuevaEval);
          moduloEvaluacionProv.mount(container);
        });
      };

      renderEvaluacion(container, data, onEvaluar);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};