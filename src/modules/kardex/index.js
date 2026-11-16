import { renderKardex } from './view.js';
import { getInsumos, getMovimientosInsumo } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloKardex = {
  id: 'kardex',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando insumos...</div>';

    try {
      const insumos = await getInsumos();

      // Estado inicial (sin insumo seleccionado)
      renderKardex(container, insumos, null, null);

      const selInsumo = container.querySelector('#kdx-insumo');
      selInsumo.onchange = async () => {
        const id = selInsumo.value;
        if (!id) {
          renderKardex(container, insumos, null, null);
          return;
        }

        // Mostrar estado de carga rápido
        container.querySelector('#kdx-resultado').innerHTML = '<div style="text-align:center; padding: 32px; color: var(--text-muted);">Cargando historial...</div>';

        try {
          const movs = await getMovimientosInsumo(id);
          renderKardex(container, insumos, movs, id);
        } catch (err) {
          toast(err.message, 'error');
        }
      };

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};