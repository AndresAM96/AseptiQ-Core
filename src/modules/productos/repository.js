import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getProductosData() {
  // Cargamos en paralelo: Productos, Recetas (BOM) e Insumos disponibles
  const [prodsRes, bomRes, insumosRes] = await Promise.all([
    supabase.from('productos_terminados').select('*').order('nombre'),
    supabase.from('bom_recetas').select('*'),
    supabase.from('insumos').select('id, codigo, nombre, unidad_consumo').eq('estado_activo', true).order('nombre')
  ]);

  if (prodsRes.error) throw new Error(traducirError(prodsRes.error.message));
  if (bomRes.error) throw new Error(traducirError(bomRes.error.message));
  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));

  return {
    productos: prodsRes.data,
    bom: bomRes.data,
    insumos: insumosRes.data
  };
}

export async function getSiguienteCodigoPT() {
  return await rpc('siguiente_codigo', { p_prefijo: 'PT-', p_tabla: 'productos_terminados' });
}

export async function guardarPaquete(data) {
  return await rpc('guardar_paquete', {
    p_codigo_pt: data.codigo_pt,
    p_es_nuevo: data.es_nuevo,
    p_nombre: data.nombre,
    p_unidades_por_caja: data.unidades_por_caja,
    p_precio_venta: data.precio_venta,
    p_requiere_esterilizacion: data.requiere_esterilizacion,
    p_insumos: data.insumos // Array de { insumo_id, cantidad }
  });
}

export async function eliminarProducto(codigo_pt) {
  const { error } = await supabase
    .from('productos_terminados')
    .delete()
    .eq('codigo_pt', codigo_pt);
  if (error) throw new Error(traducirError(error.message));
}