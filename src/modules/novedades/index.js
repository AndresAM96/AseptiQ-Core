import { renderNovedades } from './view.js';
import { getNovedades } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloNovedades = {
  id: 'novedades',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando novedades...</div>';
    try {
      const ordenes = await getNovedades();
      renderNovedades(container, ordenes);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};