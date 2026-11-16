import { renderProgramacion } from './view.js';
import { getProgramacionData } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloProgramacion = {
  id: 'programacion',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando programación...</div>';
    try {
      const ordenes = await getProgramacionData();
      renderProgramacion(container, ordenes);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};