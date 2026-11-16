import { renderCompras } from './view.js';
import { getComprasData } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloCompras = {
  id: 'compras',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando compras...</div>';
    try {
      const movimientos = await getComprasData();
      renderCompras(container, movimientos);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};