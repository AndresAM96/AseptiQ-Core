import { renderInsumos, abrirModalInsumo } from './view.js';
import { getInsumos, getConfig, getSiguienteCodigo, crearInsumo, actualizarInsumo, toggleEstadoInsumo, eliminarInsumo } from './repository.js';
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

      // Botón Crear
      const btnNuevo = container.querySelector('#btn-nuevo-insumo');
      if (btnNuevo) {
        btnNuevo.onclick = async () => {
          try {
            const codigoSugerido = await getSiguienteCodigo();
            abrirModalInsumo(async (nuevoInsumoData) => {
              await crearInsumo(nuevoInsumoData);
              toast('Insumo creado exitosamente', 'success');
              moduloInsumos.mount(container);
            }, codigoSugerido);
          } catch (error) {
            toast('Error al preparar el formulario: ' + error.message, 'error');
          }
        };
      }

      // Botón Editar
      container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.edit;
          const insumo = insumos.find(i => i.id === id);
          abrirModalInsumo(async (dataActualizada) => {
            await actualizarInsumo(id, dataActualizada);
            toast('Insumo actualizado exitosamente', 'success');
            moduloInsumos.mount(container);
          }, null, insumo);
        };
      });

      // Botón Eliminar (Soft delete vía RPC)
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.del;
          const nombre = btn.dataset.nombre;
          if (confirm(`¿Estás seguro de eliminar el insumo "${nombre}"?`)) {
            try {
              await eliminarInsumo(id);
              toast('Insumo eliminado', 'success');
              moduloInsumos.mount(container);
            } catch (err) {
              toast(err.message, 'error');
            }
          }
        };
      });

      // Botón Activar/Desactivar (Soft Delete)
      container.querySelectorAll('[data-toggle]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.toggle;
          const currentEstado = btn.dataset.estado === 'true';
          const nombre = btn.closest('tr').querySelector('td:nth-child(2)').innerText;

          if (confirm(`¿${currentEstado ? 'Desactivar' : 'Activar'} el insumo "${nombre}"?`)) {
            try {
              await toggleEstadoInsumo(id, !currentEstado);
              toast(`Insumo ${!currentEstado ? 'activado' : 'desactivado'}`, 'success');
              moduloInsumos.mount(container);
            } catch (err) {
              toast(err.message, 'error');
            }
          }
        };
      });

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar insumos: ${traducirError(error.message)}</div>`;
      toast('Error cargando insumos', 'error');
    }
  },
  unmount: () => {}
};