import { renderDevoluciones } from './view.js';
import { getDevolucionesData, registrarDevolucion } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloDevoluciones = {
  id: 'devoluciones',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando datos...</div>';
    try {
      const data = await getDevolucionesData();

      const handleSave = async (devolucionData) => {
        await registrarDevolucion(devolucionData);
        toast('Devolución registrada correctamente', 'success');
        moduloDevoluciones.mount(container);
      };

      renderDevoluciones(container, data, handleSave);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};