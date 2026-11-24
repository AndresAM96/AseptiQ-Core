import { renderProgramacion, renderResultadoProgramacion, imprimirProgramacion } from './view.js';
import { getProgramacionData } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloProgramacion = {
  id: 'programacion',
  mount: async (container) => {
    try {
      const handlers = {
        onGenerar: async (desde, hasta) => {
          const resultado = container.querySelector('#prog-resultado');
          resultado.innerHTML =
            '<div style="text-align:center; color:var(--text-muted); padding:40px;">Calculando programación...</div>';

          try {
            const data = await getProgramacionData(desde, hasta);

            // Generar y renderizar resultado
            renderResultadoProgramacion(
              container,
              desde,
              hasta,
              data,
              (d, h, dias, fechas, ords, ents) => {
                imprimirProgramacion(d, h, dias, fechas, ords, ents);
              }
            );
          } catch (error) {
            resultado.innerHTML = `<div style="color: var(--danger); text-align: center; padding: 20px;">Error: ${traducirError(error.message)}</div>`;
            toast('Error cargando la programación', 'error');
          }
        },
      };

      renderProgramacion(container, handlers);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {},
};