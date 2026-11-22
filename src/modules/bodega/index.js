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

      // Exponer la función de guardado globalmente para que la vista la llame
      window.onGuardarUbicacion = async (data) => {
        try {
          await guardarUbicacion(data);
          toast('Ubicación guardada correctamente', 'success');
          // Recargar la vista después de guardar
          setTimeout(() => {
            moduloBodega.mount(container);
            // Volver a activar la pestaña de escaneo
            const tabScan = container.querySelector('#tab-scan');
            if (tabScan) tabScan.click();
          }, 500);
        } catch (err) {
          toast(traducirError(err.message), 'error');
        }
      };

      renderBodega(container, cajas);

      // Lógica para el botón de refrescar
      container.querySelector('#btn-refresh-bod').onclick = (e) => {
        const btn = e.currentTarget;
        btn.style.transform = 'rotate(360deg)';
        btn.style.transition = 'transform 0.5s ease';
        setTimeout(() => {
          btn.style.transform = 'rotate(0deg)';
          btn.style.transition = 'none';
        }, 500);
        moduloBodega.mount(container);
      };
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {
    // Limpiar variables globales
    if (window.onGuardarUbicacion) delete window.onGuardarUbicacion;
    window._codigoCajaEscaneada = null;
  },
};