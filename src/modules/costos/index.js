import { renderCostosOP, mostrarDetalleCostos } from './view.js';
import { getCostosOPData, getDetalleCostosOP } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloCostos = {
  id: 'costos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando costos...</div>';
    try {
      const data = await getCostosOPData();

      const onVerDetalle = async (ordenId) => {
        const op = data.ordenes.find(o => o.id === ordenId);
        try {
          const consumosReales = await getDetalleCostosOP(ordenId);
          mostrarDetalleCostos(op, consumosReales, data.insumos);
        } catch (err) { toast(err.message, 'error'); }
      };

      renderCostosOP(container, data.ordenes, onVerDetalle);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};