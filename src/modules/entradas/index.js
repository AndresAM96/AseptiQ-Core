import { renderEntradas } from './view.js';
import { getEntradasData, registrarEntrada } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloEntradas = {
  id: 'entradas',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando datos...</div>';

    try {
      const data = await getEntradasData();

      const handleSave = async (nuevaEntrada) => {
        await registrarEntrada(nuevaEntrada);
        toast('Entrada registrada correctamente', 'success');
        moduloEntradas.mount(container); // Recargar toda la vista
      };

      renderEntradas(container, data, handleSave);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar: ${traducirError(error.message)}</div>`;
      toast('Error cargando inventario', 'error');
    }
  },
  unmount: () => {}
};