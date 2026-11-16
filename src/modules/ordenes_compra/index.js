import { renderOrdenesCompra } from './view.js';
import { getOrdenesCompraData } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloOrdenesCompra = {
  id: 'ordenes_compra',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando OCs...</div>';
    try {
      const ocs = await getOrdenesCompraData();
      renderOrdenesCompra(container, ocs);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};