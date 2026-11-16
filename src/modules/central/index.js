import { renderCentral, abrirModalCicloEO } from './view.js';
import { getCentralData, registrarCicloEO } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloCentral = {
  id: 'central',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando central...</div>';
    try {
      const data = await getCentralData();

      const handlers = {
        onCiclo: (items) => {
          // items ahora trae los lotes seleccionados
          abrirModalCicloEO(items, async (numero_carga, payload) => {
            try {
              await registrarCicloEO(null, numero_carga, payload);
              toast('Ciclo EO registrado exitosamente', 'success');
              setTimeout(() => moduloCentral.mount(container), 300);
            } catch (err) {
              toast(err.message, 'error');
              throw err; // Relanzar para que el botón no se quede colgado
            }
          });
        }
      };

      renderCentral(container, data, handlers);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};