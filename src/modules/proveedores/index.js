import { renderProveedores, abrirModalDetalleProveedor, abrirModalProveedor } from './view.js';
import {
  getProveedores,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
} from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { exportarCSV } from '../../shared/ui/csv.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export const moduloProveedores = {
  id: 'proveedores',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando proveedores...</div>';

    try {
      const proveedores = await getProveedores();
      renderProveedores(container, proveedores);

      // Crear nuevo
      container.querySelector('#btn-nuevo-prov').onclick = () => {
        abrirModalProveedor(null, async (id, data) => {
          await crearProveedor(data);
          toast('Proveedor creado exitosamente', 'success');
          moduloProveedores.mount(container);
        });
      };

      // Exportar CSV
      container.querySelector('#btn-export-prov').onclick = () => {
        const headers = ['NIT', 'Razón Social', 'Dirección', 'Contactos'];
        const filas = proveedores.map((p) => {
          const contactosStr = (p.contactos || [])
            .map((c) => `${c.nombre} - ${c.telefono} - ${c.correo}`)
            .join(' | ');
          return [p.nit, p.razon_social, p.direccion || '', contactosStr];
        });
        exportarCSV('proveedores', headers, filas);
      };

      // Acciones de la tabla
      container.querySelectorAll('[data-detail]').forEach((btn) => {
        btn.onclick = () => {
          const prov = proveedores.find((p) => p.id === btn.dataset.detail);
          abrirModalDetalleProveedor(prov, () => {
            // Callback de Editar
            abrirModalProveedor(prov, async (id, data) => {
              await actualizarProveedor(id, data);
              toast('Proveedor actualizado', 'success');
              moduloProveedores.mount(container);
            });
          });
        };
      });

      container.querySelectorAll('[data-del]').forEach((btn) => {
        btn.onclick = () => {
          const nombre = btn.dataset.nombre;
          const id = btn.dataset.del;

          abrirModal({
            title: `Eliminar "${nombre}"`,
            subtitle: 'Esta acción no se puede deshacer.',
            icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 24px; height: 24px;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
            iconBg: 'var(--danger-bg)',
            iconColor: 'var(--danger)',
            size: 'sm',
            body: '',
            footer: `
              <button id="btn-cancel-del" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancelar</button>
              <button id="btn-confirm-del" style="background: var(--danger-bg); color: var(--danger); border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Eliminar</button>
            `,
            onOpen: (overlay) => {
              overlay.querySelector('#btn-cancel-del').onclick = () => cerrarModal();
              overlay.querySelector('#btn-confirm-del').onclick = async () => {
                try {
                  await eliminarProveedor(id);
                  cerrarModal();
                  toast('Proveedor eliminado', 'success');
                  moduloProveedores.mount(container);
                } catch (e) {
                  toast('No se puede eliminar: ' + e.message, 'error');
                }
              };
            },
          });
        };
      });
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {},
};