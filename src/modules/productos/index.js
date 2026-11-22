import {
  renderProductos,
  abrirModalPaquete,
  abrirModalDetallePaquete,
  abrirModalEtiquetasPT,
} from './view.js';
import {
  getProductosData,
  getSiguienteCodigoPT,
  guardarPaquete,
  toggleEstadoProducto,
  eliminarProducto,
} from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { exportarCSV } from '../../shared/ui/csv.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export const moduloProductos = {
  id: 'productos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando productos...</div>';

    try {
      const data = await getProductosData();
      renderProductos(container, data);

      // Crear nuevo
      container.querySelector('#btn-nuevo-paquete').onclick = async () => {
        try {
          const sugerido = await getSiguienteCodigoPT();
          abrirModalPaquete(null, data, sugerido, async (nuevo) => {
            await guardarPaquete(nuevo);
            toast('Paquete creado exitosamente', 'success');
            moduloProductos.mount(container);
          });
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      // Exportar CSV
      container.querySelector('#btn-export-paquetes').onclick = () => {
        const headers = ['Código PT', 'Nombre', 'Unidades/Caja', 'Precio Venta', 'Estado'];
        const filas = data.productos.map((p) => [
          p.codigo_pt,
          p.nombre,
          p.unidades_por_caja,
          p.precio_venta || '',
          p.estado_activo ? 'Activo' : 'Inactivo',
        ]);
        exportarCSV('paquetes_pt', headers, filas);
      };

      // Acciones de la tabla
      container.querySelectorAll('[data-detail]').forEach((btn) => {
        btn.onclick = () => {
          const pt = data.productos.find((p) => p.codigo_pt === btn.dataset.detail);
          abrirModalDetallePaquete(pt, data, () => {
            abrirModalPaquete(pt, data, null, async (editado) => {
              await guardarPaquete(editado);
              toast('Paquete actualizado', 'success');
              moduloProductos.mount(container);
            });
          });
        };
      });

      container.querySelectorAll('[data-print]').forEach((btn) => {
        btn.onclick = () => {
          const pt = data.productos.find((p) => p.codigo_pt === btn.dataset.print);
          abrirModalEtiquetasPT(pt);
        };
      });

      container.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.onclick = async () => {
          const codigo = btn.dataset.toggle;
          const activo = btn.dataset.estado === 'true';
          try {
            await toggleEstadoProducto(codigo, !activo);
            toast(`Paquete ${!activo ? 'activado' : 'desactivado'}`, 'success');
            moduloProductos.mount(container);
          } catch (err) {
            toast(err.message, 'error');
          }
        };
      });

      container.querySelectorAll('[data-del]').forEach((btn) => {
        btn.onclick = () => {
          const nombre = btn.dataset.nombre;
          const codigo = btn.dataset.del;

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
                  await eliminarProducto(codigo);
                  cerrarModal();
                  toast('Paquete eliminado', 'success');
                  moduloProductos.mount(container);
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