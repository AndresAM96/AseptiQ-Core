import { renderProductos, abrirModalProducto } from './view.js';
import { getProductosData, getSiguienteCodigoPT, guardarPaquete, eliminarProducto } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloProductos = {
  id: 'productos',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando productos...</div>';

    try {
      const data = await getProductosData();
      renderProductos(container, data);

      // Botón Crear
      container.querySelector('#btn-nuevo-prod').onclick = async () => {
        try {
          const codigoSugerido = await getSiguienteCodigoPT();
          abrirModalProducto(async (nuevoProdData) => {
            await guardarPaquete(nuevoProdData);
            toast('Producto creado exitosamente', 'success');
            moduloProductos.mount(container);
          }, data.insumos, null, codigoSugerido);
        } catch (error) {
          toast('Error al preparar formulario: ' + error.message, 'error');
        }
      };

      // Botón Editar
      container.querySelectorAll('[data-edit]').forEach(btn => {
        btn.onclick = () => {
          const codigo_pt = btn.dataset.edit;
          const prod = data.productos.find(p => p.codigo_pt === codigo_pt);
          // Buscar la receta actual de este producto
          const bomActual = data.bom.filter(b => b.codigo_pt === codigo_pt).map(b => ({
            insumo_id: b.insumo_id,
            cantidad_por_unidad: b.cantidad_por_unidad
          }));

          abrirModalProducto(async (dataAct) => {
            await guardarPaquete(dataAct);
            toast('Producto actualizado exitosamente', 'success');
            moduloProductos.mount(container);
          }, data.insumos, bomActual, null, prod);
        };
      });

      // Botón Eliminar
      container.querySelectorAll('[data-del]').forEach(btn => {
        btn.onclick = async () => {
          const codigo_pt = btn.dataset.del;
          const nombre = btn.dataset.nombre;
          if (confirm(`¿Seguro que deseas eliminar el paquete "${nombre}"?`)) {
            try {
              await eliminarProducto(codigo_pt);
              toast('Producto eliminado', 'success');
              moduloProductos.mount(container);
            } catch (err) {
              // Si el error es porque está en uso, mostramos el mensaje traducido
              const msg = err.message.includes('violates foreign key') || err.message.includes('relacionados')
                ? 'No se puede eliminar: tiene OPs o registros asociados.'
                : err.message;
              toast(msg, 'error');
            }
          }
        };
      });

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error al cargar productos: ${traducirError(error.message)}</div>`;
      toast('Error cargando productos', 'error');
    }
  },
  unmount: () => {}
};