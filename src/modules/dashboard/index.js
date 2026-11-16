import { renderDashboard } from './view.js';
import { getDashboardData } from './repository.js';
import { getConfig } from '../insumos/repository.js'; // Reutilizamos la función de config
import { traducirError } from '../../shared/http/errores.js';

export const moduloDashboard = {
  id: 'dashboard',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando dashboard...</div>';

    try {
      const [data, config] = await Promise.all([
        getDashboardData(),
        getConfig()
      ]);

      renderDashboard(container, data, config);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error cargando dashboard: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};