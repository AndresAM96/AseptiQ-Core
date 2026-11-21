import { renderOrdenes, abrirModalNuevaOP, abrirModalCobertura, abrirModalEntrega } from './view.js';
import { getOrdenesData, getSiguienteOP, simularCobertura, confirmarOrden } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { supabase } from '../../shared/http/client.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { exportarCSV } from '../../shared/ui/csv.js';

export const moduloOrdenes = {
  id: 'ordenes',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando órdenes...</div>';

    try {
      const data = await getOrdenesData();
      const { data: insumos } = await supabase.from('insumos').select('id, nombre, existencia_actual, unidad_consumo');

            const handlers = {
        onNueva: async (productos) => {
          try {
            const sugerido = await getSiguienteOP();
            abrirModalNuevaOP(productos, sugerido, async (opData) => {
              try {
                const simulacion = await simularCobertura(opData.codigo_pt, opData.cantidad);
                cerrarModal();
                setTimeout(() => {
                  abrirModalCobertura(opData, simulacion, insumos, async (opDataFinal) => {
                    try {
                      await confirmarOrden(opDataFinal);
                      toast('Orden confirmada exitosamente', 'success');
                      setTimeout(() => moduloOrdenes.mount(container), 300);
                    } catch (err) { toast(err.message, 'error'); throw err; }
                  });
                }, 250);
              } catch (err) { toast(err.message, 'error'); }
            });
          } catch (err) { toast(err.message, 'error'); }
        },
        onEntregar: (id, pendiente, nombre) => {
          abrirModalEntrega(nombre, pendiente, async (cantidad, motivo) => {
            const { error } = await supabase.rpc('registrar_entrega_op', {
              p_orden_id: id, p_cantidad: cantidad, p_motivo: motivo || null
            });
            if (error) throw new Error(traducirError(error.message));
            toast('Entrega registrada exitosamente', 'success');
            setTimeout(() => moduloOrdenes.mount(container), 300);
          });
        },
        onCancelar: async (id) => {
          if(!confirm('¿Estás seguro de cancelar esta OP?')) return;
          try {
            await supabase.rpc('cancelar_orden', { p_orden_id: id, p_motivo: 'Cancelada desde UI' });
            toast('Orden cancelada', 'success');
            moduloOrdenes.mount(container);
          } catch (err) {
            toast(traducirError(err.message), 'error');
          }
        },
        onExportar: () => {
          const headers = ['N° OP', 'Lote', 'Prioridad', 'Producto', 'Unidades', 'Cajas aprox.', 'Cobertura', 'Estado OP', 'Programada', 'Fecha carga'];
          const filas = data.ordenes.map(o => {
            const prod = o.productos_terminados?.nombre || o.codigo_pt;
            const pc = o.productos_terminados?.unidades_por_caja || 1;
            const cajas = o.cantidad_proyectada && pc > 1 ? Math.ceil(o.cantidad_proyectada / pc) : '';
            const fechaProg = o.fecha_programada ? new Date(o.fecha_programada + 'T12:00:00').toLocaleDateString('es-CO') : '';
            const fechaCarga = o.fecha_creacion ? new Date(o.fecha_creacion).toLocaleDateString('es-CO') : '';
            const prioridadMap = { 1: 'Muy alta', 2: 'Alta', 3: 'Normal', 4: 'Baja' };
            const prioridad = o.prioridad ? prioridadMap[o.prioridad] : '';
            return [o.numero_op || '', o.lote || '', prioridad, prod, o.cantidad_proyectada, cajas, o.estado_cobertura, o.estado_op, fechaProg, fechaCarga];
          });
          exportarCSV('ordenes_produccion', headers, filas);
        },
        onRefrescar: () => {
          moduloOrdenes.mount(container);
        },
        onVerDetalle: (ordenId) => {
          const op = data.ordenes.find(o => o.id === ordenId);
          if (!op) return;

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

      renderOrdenes(container, data, handlers);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar: ${traducirError(error.message)}</div>`;
      toast('Error cargando órdenes', 'error');
    }
  },
  unmount: () => {}
};