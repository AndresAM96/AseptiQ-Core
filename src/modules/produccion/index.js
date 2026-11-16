import { renderProduccion } from './view.js';
import { getSubproductosData, registrarProduccion } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloProduccion = {
  id: 'produccion',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando datos...</div>';
    try {
      const data = await getSubproductosData();

      const handleSave = async (id, cant, motivo) => {
        await registrarProduccion(id, cant, motivo);
        moduloProduccion.mount(container); // Recargar
      };

      renderProduccion(container, data, handleSave);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};