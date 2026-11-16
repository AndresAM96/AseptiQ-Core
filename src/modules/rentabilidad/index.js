import { renderRentabilidad } from './view.js';
import { getRentabilidadData } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloRentabilidad = {
  id: 'rentabilidad',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Calculando rentabilidad...</div>';
    try {
      const data = await getRentabilidadData();
      renderRentabilidad(container, data);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};