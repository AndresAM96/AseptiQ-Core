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

      // Necesitamos todos los insumos para cruzar la cobertura
      const { data: insumos } = await supabase.from('insumos').select('id, nombre, existencia_actual, unidad_consumo');

      const handlers = {
        onNueva: async (productos) => {
          try {
            const sugerido = await getSiguienteOP();
            abrirModalNuevaOP(productos, sugerido, async (opData) => {
              try {
                const simulacion = await simularCobertura(opData.codigo_pt, opData.cantidad);

                // 1. Cerramos el modal de Nueva OP
                cerrarModal();

                // 2. Esperamos 250ms (lo que dura la animación) y abrimos el de Cobertura
                setTimeout(() => {
                  abrirModalCobertura(opData, simulacion, insumos, async (opDataFinal) => {
                    try {
                      await confirmarOrden(opDataFinal);
                      toast('Orden confirmada exitosamente', 'success');
                      // El cierre del modal de Cobertura ya lo hace view.js

                      // Recargamos la tabla después de que el modal se haya ido
                      setTimeout(() => moduloOrdenes.mount(container), 300);
                    } catch (err) {
                      toast(err.message, 'error');
                      throw err; // Relanzamos para que el botón no se quede en "Confirmando..."
                    }
                  });
                }, 250);

              } catch (err) {
                toast(err.message, 'error');
              }
            });
          } catch (err) {
            toast(err.message, 'error');
          }
        },
        onEntregar: (id, pendiente, nombre) => {
            abrirModalEntrega(nombre, pendiente, async (cantidad, motivo) => {
            const { error } = await supabase.rpc('registrar_entrega_op', {
              p_orden_id: id,
              p_cantidad: cantidad,
              p_motivo: motivo || null
            });
            if (error) throw new Error(traducirError(error.message));
            toast('Entrega registrada exitosamente', 'success');
            setTimeout(() => moduloOrdenes.mount(container), 300);
          });
        },
      };

      renderOrdenes(container, data, handlers);

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar: ${traducirError(error.message)}</div>`;
      toast('Error cargando órdenes', 'error');
    }
  },
  unmount: () => {}
};