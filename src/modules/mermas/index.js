import { renderMermas } from './view.js';
import { getMermasData } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloMermas = {
  id: 'mermas',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando mermas...</div>';
    try {
      const movimientos = await getMermasData();
      renderMermas(container, movimientos);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};