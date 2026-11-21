import { renderNovedades } from './view.js';
import { getNovedades } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
export const moduloNovedades = {
  id: 'novedades',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando novedades...</div>';

    try {
      const ordenes = await getNovedades();

      const handlers = {
        onRefrescar: () => {
          moduloNovedades.mount(container);
        },
        onVerDetalle: (ordenId) => {
          const op = ordenes.find(o => o.id === ordenId);
          if (!op) return;

          // Reutilizamos la misma lógica del modal de detalle de Cargar Orden
          abrirModal({
            title: `Detalle de OP: ${op.numero_op || 'S/N'}`,
            subtitle: `Lote: ${op.lote} | Producto: ${op.productos_terminados?.nombre || op.codigo_pt}`,
            body: `
              <div class="grid-cols-3" style="gap: 16px; margin-bottom: 16px;">
                <div style="background: var(--surface-2); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
                  <div style="font-size: 11px; color: var(--text-secondary);">Proyectado</div>
                  <div style="font-size: 18px; font-weight: bold;">${op.cantidad_proyectada} u</div>
                </div>
                <div style="background: var(--success-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--success);">
                  <div style="font-size: 11px; color: var(--success);">Producido</div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--success);">${op.cantidad_producida} u</div>
                </div>
                <div style="background: var(--warning-bg); padding: 12px; border-radius: 8px; border: 1px solid var(--warning);">
                  <div style="font-size: 11px; color: var(--warning);">Pendiente</div>
                  <div style="font-size: 18px; font-weight: bold; color: var(--warning);">${op.cantidad_proyectada - op.cantidad_producida} u</div>
                </div>
              </div>
              <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.5;">
                <b>Fecha Programada:</b> ${op.fecha_programada ? new Date(op.fecha_programada + 'T12:00:00').toLocaleDateString('es-CO') : 'No asignada'}<br>
                <b>Prioridad:</b> ${op.prioridad ? ({1:'Muy alta',2:'Alta',3:'Normal',4:'Baja'})[op.prioridad] : 'Normal'}<br>
                <b>Estado Cobertura:</b> ${op.estado_cobertura}<br>
                <b>Fecha Creación:</b> ${new Date(op.fecha_creacion).toLocaleString('es-CO')}
              </p>
            `,
            footer: `<button id="btn-cerrar-detalle" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>`,
            onOpen: (overlay) => {
              overlay.querySelector('#btn-cerrar-detalle').onclick = () => cerrarModal();
            }
          });
        }
      };

      renderNovedades(container, ordenes, handlers);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};