import { renderDespachos, abrirModalDespacho, imprimirReporteDespachos } from './view.js';
import { getDespachosData, getLotesDisponibles, registrarDespacho } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloDespachos = {
  id: 'despachos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando despachos...</div>';

    try {
      const data = await getDespachosData();
      const hoy = new Date().toISOString().slice(0, 10);

      const handlers = {
        onNuevo: (productos) => {
          abrirModalDespacho(productos, getLotesDisponibles, async (despachoData) => {
            await registrarDespacho(despachoData);
            toast('Despacho registrado exitosamente', 'success');
            moduloDespachos.mount(container);
          });
        },
        onImprimir: (despachos) => {
          imprimirReporteDespachos(despachos, hoy);
        },
      };

      renderDespachos(container, data, handlers);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {},
};