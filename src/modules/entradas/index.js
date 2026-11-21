import { renderEntradas, abrirModalEntrada } from './view.js';
import { getEntradasData, registrarEntradaInsumo, registrarProduccionSub } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloEntradas = {
  id: 'entradas',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando datos...</div>';

    try {
      const data = await getEntradasData();

      const handleOpenModal = (dataActual) => {
        abrirModalEntrada(dataActual, async (tipo, payload) => {
          try {
            if (tipo === 'insumo') {
              await registrarEntradaInsumo(payload);
              toast('Entrada de insumo registrada exitosamente', 'success');
            } else {
              await registrarProduccionSub(payload);
              toast('Subproducto producido exitosamente', 'success');
            }
            moduloEntradas.mount(container); // Recargar tabla
          } catch (err) {
            toast(err.message, 'error');
            throw err; // Relanzar para que el botón no se quede en "Guardando..."
          }
        });
      };

      renderEntradas(container, data, handleOpenModal);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar: ${traducirError(error.message)}</div>`;
      toast('Error cargando inventario', 'error');
    }
  },
  unmount: () => {}
};