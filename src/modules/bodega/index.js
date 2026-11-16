import { renderBodega } from './view.js';
import { getCajas, guardarUbicacion } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloBodega = {
  id: 'bodega',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando bodega...</div>';

    try {
      const cajas = await getCajas();

      const handleGuardar = async (data) => {
        try {
          await guardarUbicacion(data);
          toast('Ubicación guardada correctamente', 'success');
          moduloBodega.mount(container); // Recargar la tabla
        } catch (err) {
          toast(traducirError(err.message), 'error');
        }
      };

      renderBodega(container, cajas, handleGuardar);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};