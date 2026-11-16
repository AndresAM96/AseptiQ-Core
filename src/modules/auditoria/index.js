import { renderAuditoria } from './view.js';
import { getInsumosConteo, aplicarAjuste } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloAuditoria = {
  id: 'auditoria',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando inventario...</div>';

    try {
      const insumos = await getInsumosConteo();

      const handleAplicar = async (ajustes) => {
        let exitos = 0;
        let errores = 0;

        container.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 40px;">Aplicando ajustes... Por favor espera.</div>';

        for (const a of ajustes) {
          try {
            await aplicarAjuste(a.id, a.nueva_existencia, 'Ajuste por conteo físico');
            exitos++;
          } catch (err) {
            console.error(err);
            errores++;
          }
        }

        if (errores > 0) {
          toast(`Ajustes completados: ${exitos} exitosos, ${errores} con error.`, 'error');
        } else {
          toast(`Se aplicaron ${exitos} ajustes correctamente.`, 'success');
        }

        // Recargar el módulo para mostrar los nuevos valores
        moduloAuditoria.mount(container);
      };

      renderAuditoria(container, insumos, handleAplicar);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};