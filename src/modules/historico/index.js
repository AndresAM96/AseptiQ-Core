import { renderHistorico } from './view.js';
import { getHistoricoData } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloHistorico = {
  id: 'historico',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Generando gráficos...</div>';
    try {
      const data = await getHistoricoData();
      renderHistorico(container, data);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};