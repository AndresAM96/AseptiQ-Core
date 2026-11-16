import { renderDespachos, abrirModalDespacho } from './view.js';
import { getDespachosData, getLotesFIFO, registrarDespacho } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloDespachos = {
  id: 'despachos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando despachos...</div>';

    try {
      const data = await getDespachosData();

      const handlers = {
        onNuevo: (productos) => {
          abrirModalDespacho(
            productos,
            async (codigo_pt) => await getLotesFIFO(codigo_pt), // Handler para buscar lotes
            async (despachoData) => {
              await registrarDespacho(despachoData);
              toast('Despacho registrado exitosamente', 'success');
              setTimeout(() => moduloDespachos.mount(container), 300);
            }
          );
        }
      };

      renderDespachos(container, data, handlers);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};