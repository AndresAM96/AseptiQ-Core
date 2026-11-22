import { renderDevoluciones, abrirModalDevolucion } from './view.js';
import {
  getDevolucionesData,
  registrarDevolucionProveedor,
  registrarDevolucionCliente,
} from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloDevoluciones = {
  id: 'devoluciones',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando datos...</div>';

    try {
      const data = await getDevolucionesData();

      const handleOpenModal = (dataActual) => {
        abrirModalDevolucion(dataActual, async (tipo, payload) => {
          try {
            if (tipo === 'proveedor') {
              await registrarDevolucionProveedor(payload);
              toast('Devolución a proveedor registrada', 'success');
            } else {
              await registrarDevolucionCliente(payload);
              toast('Devolución de cliente registrada', 'success');
            }
            moduloDevoluciones.mount(container);
          } catch (err) {
            toast(err.message, 'error');
            throw err;
          }
        });
      };

      renderDevoluciones(container, data, handleOpenModal);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {},
};