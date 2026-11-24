import { renderProduccion, abrirModalProduccion } from './view.js';
import { getProduccionData, registrarProduccion } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloProduccion = {
  id: 'produccion',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando datos...</div>';

    try {
      const data = await getProduccionData();

      const handlers = {
        onNuevo: (subproductos) => {
          abrirModalProduccion(subproductos, async (id, cant, motivo) => {
            await registrarProduccion(id, cant, motivo);
            toast('Producción completada exitosamente', 'success');
            moduloProduccion.mount(container); // Recargar la tabla
          });
        },
        onRefrescar: () => {
          moduloProduccion.mount(container);
        },
      };

      renderProduccion(container, data, handlers);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {},
};