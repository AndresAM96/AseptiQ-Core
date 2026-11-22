import {
  renderInsumos,
  abrirModalInsumo,
  abrirModalDetalleInsumo,
  abrirModalEtiquetas,
} from './view.js';
import {
  getInsumos,
  getConfig,
  getSiguienteCodigo,
  crearInsumo,
  actualizarInsumo,
  toggleEstadoInsumo,
  eliminarInsumo,
} from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { exportarCSV } from '../../shared/ui/csv.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';

export const moduloInsumos = {
  id: 'insumos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando insumos...</div>';

    try {
      const [insumos, config] = await Promise.all([getInsumos(), getConfig()]);

      renderInsumos(container, insumos, config);

      // Mostrar inactivos
      const chkInactivos = container.querySelector('#chk_inactivos');
      chkInactivos.onchange = () => {
        const mostrar = chkInactivos.checked;
        container.querySelectorAll('#tablaInsumos tbody tr').forEach((tr) => {
          // Lógica simple: si no queremos mostrar inactivos, ocultamos los que tienen badge inactivo
          const esInactivo = tr.innerHTML.includes('Inactivo');
          if (!mostrar && esInactivo) tr.style.display = 'none';
          else tr.style.display = '';
        });
      };

      // Exportar CSV
      container.querySelector('#btn-export-ins').onclick = () => {
        const headers = ['Código', 'Nombre', 'Existencia', 'Reorden', 'Costo', 'Estado'];
        const filas = insumos.map((i) => [
          i.codigo,
          i.nombre,
          i.existencia_actual,
          i.punto_reorden,
          i.costo_unitario,
          i.estado_activo ? 'Activo' : 'Inactivo',
        ]);
        exportarCSV('insumos', headers, filas);
      };

      // Crear nuevo
      container.querySelector('#btn-nuevo-ins').onclick = async () => {
        try {
          const sugerido = await getSiguienteCodigo();
          abrirModalInsumo(null, config, sugerido, async (id, data) => {
            await crearInsumo(data);
            toast('Insumo creado exitosamente', 'success');
            moduloInsumos.mount(container);
          });
        } catch (err) {
          toast(err.message, 'error');
        }
      };

      // Acciones de la tabla
      container.querySelectorAll('[data-detail]').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.detail;
          const ins = insumos.find((i) => i.id === id);
          abrirModalDetalleInsumo(ins, () => {
            abrirModalInsumo(ins, config, null, async (id, data) => {
              await actualizarInsumo(id, data);
              toast('Insumo actualizado', 'success');
              moduloInsumos.mount(container);
            });
          });
        };
      });

      container.querySelectorAll('[data-print]').forEach((btn) => {
        btn.onclick = () => {
          const id = btn.dataset.print;
          const ins = insumos.find((i) => i.id === id);
          abrirModalEtiquetas(ins);
        };
      });

      container.querySelectorAll('[data-toggle]').forEach((btn) => {
        btn.onclick = async () => {
          const id = btn.dataset.toggle;
          const activo = btn.dataset.estado === 'true';
          try {
            await toggleEstadoInsumo(id, !activo);
            toast(`Insumo ${!activo ? 'activado' : 'desactivado'}`, 'success');
            moduloInsumos.mount(container);
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
            body: '', // Sin contenido extra
            size: 'sm', // Modal pequeño
            footer: `
              <button id="btn-cancel-del" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500;">Cancelar</button>
              <button id="btn-confirm-del" style="background: var(--danger-bg); color: var(--danger); border: 1px solid transparent; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Eliminar</button>
            `,
            onOpen: (overlay) => {
              overlay.querySelector('#btn-cancel-del').onclick = () => cerrarModal();

              overlay.querySelector('#btn-confirm-del').onclick = async () => {
                try {
                  const btnConf = overlay.querySelector('#btn-confirm-del');
                  btnConf.textContent = 'Eliminando...';
                  btnConf.disabled = true;

                  await eliminarInsumo(id);
                  cerrarModal();
                  toast('Insumo eliminado', 'success');
                  moduloInsumos.mount(container);
                } catch (e) {
                  toast('No se puede eliminar: ' + e.message, 'error');
                  overlay.querySelector('#btn-confirm-del').textContent = 'Eliminar';
                  overlay.querySelector('#btn-confirm-del').disabled = false;
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