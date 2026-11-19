import { renderOrdenes, abrirModalNuevaOP, abrirModalCobertura, abrirModalEntrega } from './view.js';
import { getOrdenesData, getSiguienteOP, simularCobertura, confirmarOrden } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { supabase } from '../../shared/http/client.js';
import { cerrarModal } from '../../shared/ui/modal.js';

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