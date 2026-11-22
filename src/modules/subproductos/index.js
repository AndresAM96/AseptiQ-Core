import { renderSubproductos, abrirModalSubproducto } from './view.js';
import {
  getSubproductosData,
  getSiguienteCodigoSub,
  guardarSubproducto,
  toggleEstadoSub,
  eliminarSubproducto,
} from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { exportarCSV } from '../../shared/ui/csv.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export const moduloSubproductos = {
  id: 'subproductos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando subproductos...</div>';

    try {
      const data = await getSubproductosData();

      const handlers = {
        onSave: async (payload) => {
          await guardarSubproducto(payload);
          toast(payload.id ? 'Subproducto actualizado' : 'Subproducto creado', 'success');
          moduloSubproductos.mount(container);
        },
      };

      renderSubproductos(container, data, handlers);

      // Botones de acción
      container.querySelector('#btn-nuevo-sub').onclick = async () => {
        try {
          const sugerido = await getSiguienteCodigoSub();
          abrirModalSubproducto(null, data, sugerido, handlers);
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      container.querySelector('#btn-export-subs').onclick = () => {
        const headers = ['Código', 'Nombre', 'Tipo', 'Existencia'];
        const filas = data.subproductos.map((s) => [
          s.codigo,
          s.nombre,
          s.tipo,
          s.existencia_actual,
        ]);
        exportarCSV('subproductos', headers, filas);
      };

      container.querySelectorAll('[data-detail]').forEach((btn) => {
        btn.onclick = () => {
          const sub = data.subproductos.find((s) => s.id === btn.dataset.detail);
          // Reutilizamos la lógica del modal pero en modo edición
          abrirModalSubproducto(sub, data, null, handlers);
        };
      });

      container.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.onclick = async () => {
          const id = btn.dataset.toggle;
          const activo = btn.dataset.estado === 'true';
          try {
            await toggleEstadoSub(id, !activo);
            toast(`Subproducto ${!activo ? 'activado' : 'desactivado'}`, 'success');
            moduloSubproductos.mount(container);
          } catch (err) {
            toast(err.message, 'error');
          }
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
                  await eliminarSubproducto(id);
                  cerrarModal();
                  toast('Subproducto eliminado', 'success');
                  moduloSubproductos.mount(container);
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