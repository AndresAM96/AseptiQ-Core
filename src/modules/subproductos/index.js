import { renderSubproductos, abrirModalSubproducto } from './view.js';
import { getSubproductosData, getSiguienteCodigoSub, guardarSubproducto, eliminarSubproducto } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloSubproductos = {
  id: 'subproductos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando subproductos...</div>';

    try {
      const data = await getSubproductosData();

      const handlers = {
        onNuevo: async (insumos) => {
          try {
            const sugerido = await getSiguienteCodigoSub();
            abrirModalSubproducto(insumos, sugerido, null, async (nuevoSub) => {
              await guardarSubproducto(nuevoSub);
              toast('Subproducto creado exitosamente', 'success');
              moduloSubproductos.mount(container);
            });
          } catch (err) { toast(err.message, 'error'); }
        },
        onEditar: (sub, insumos) => {
          abrirModalSubproducto(insumos, null, sub, async (editData) => {
            await guardarSubproducto(editData);
            toast('Subproducto actualizado', 'success');
            moduloSubproductos.mount(container);
          });
        },
        onEliminar: async (id, nombre) => {
          if (confirm(`¿Seguro que deseas eliminar el subproducto "${nombre}"?`)) {
            try {
              await eliminarSubproducto(id);
              toast('Subproducto eliminado', 'success');
              moduloSubproductos.mount(container);
            } catch (err) {
              // Usamos el mensaje de error (que puede ser de llave foránea)
              const msg = err.message.includes('relacionados') || err.message.includes('foreign key')
                ? 'No se puede eliminar: está en uso en alguna receta u orden.'
                : err.message;
              toast(msg, 'error');
            }
          }
        }
      };

      renderSubproductos(container, data, handlers);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};