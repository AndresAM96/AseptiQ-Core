import { renderProveedores, abrirModalProveedor } from './view.js';
import { getProveedores, crearProveedor, actualizarProveedor, eliminarProveedor } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloProveedores = {
  id: 'proveedores',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando proveedores...</div>';

    try {
      const proveedores = await getProveedores();
      renderProveedores(container, proveedores);

      // Botón Crear
      container.querySelector('#btn-nuevo-prov').onclick = () => {
        abrirModalProveedor(async (nuevoProv) => {
          await crearProveedor(nuevoProv);
          toast('Proveedor creado exitosamente', 'success');
          moduloProveedores.mount(container);
        });
      };

      // Botón Editar
      container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.edit;
          const prov = proveedores.find(p => p.id === id);
          abrirModalProveedor(async (dataAct) => {
            await actualizarProveedor(id, dataAct);
            toast('Proveedor actualizado', 'success');
            moduloProveedores.mount(container);
          }, prov);
        };
      });

      // Botón Eliminar
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          const id = btn.dataset.del;
          const nombre = btn.dataset.nombre;
          if (confirm(`¿Seguro que deseas eliminar el proveedor "${nombre}"?`)) {
            try {
              await eliminarProveedor(id);
              toast('Proveedor eliminado', 'success');
              moduloProveedores.mount(container);
            } catch (err) {
              toast(err.message, 'error');
            }
          }
        };
      });

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar proveedores: ${traducirError(error.message)}</div>`;
      toast('Error cargando proveedores', 'error');
    }
  },
  unmount: () => {}
};