import { renderInsumos, abrirModalInsumo } from './view.js';
import { getInsumos, getConfig, getSiguienteCodigo, crearInsumo } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloInsumos = {
  id: 'insumos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando insumos...</div>';

    try {
      const [insumos, config] = await Promise.all([
        getInsumos(),
        getConfig()
      ]);

      renderInsumos(container, insumos, config);

      // Lógica del botón Nuevo Insumo
      const btnNuevo = container.querySelector('#btn-nuevo-insumo');
      if (btnNuevo) {
        btnNuevo.onclick = async () => {
          try {
            // 1. Obtenemos el código sugerido
            const codigoSugerido = await getSiguienteCodigo();

            // 2. Abrimos el modal. Le pasamos la función de guardado (onSave)
            abrirModalInsumo(async (nuevoInsumoData) => {
              await crearInsumo(nuevoInsumoData);
              toast('Insumo creado exitosamente', 'success');
              // Recargamos el módulo para ver el nuevo registro
              moduloInsumos.mount(container);
            }, codigoSugerido);

          } catch (error) {
            toast('Error al preparar el formulario: ' + error.message, 'error');
          }
        };
      }

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar insumos: ${traducirError(error.message)}</div>`;
      toast('Error cargando insumos', 'error');
    }
  },
  unmount: () => {}
};