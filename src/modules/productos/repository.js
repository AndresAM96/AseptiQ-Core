import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getProductosData() {
  const [prodsRes, bomRes, paqSubRes, insumosRes, subproductosRes] = await Promise.all([
    supabase.from('productos_terminados').select('*').order('nombre'),
    supabase.from('bom_recetas').select('*, insumos(nombre, codigo, unidad_consumo)'),
    supabase.from('paquete_subproductos').select('*, subproductos(nombre, codigo)'),
    supabase
      .from('insumos')
      .select('id, nombre, codigo, unidad_consumo')
      .eq('estado_activo', true)
      .order('nombre'),
    supabase
      .from('subproductos')
      .select('id, nombre, codigo')
      .eq('estado_activo', true)
      .order('nombre'),
  ]);

  if (prodsRes.error) throw new Error(traducirError(prodsRes.error.message));

  return {
    productos: prodsRes.data || [],
    bom: bomRes.data || [],
    paqueteSubs: paqSubRes.data || [],
    insumos: insumosRes.data || [],
    subproductos: subproductosRes.data || [],
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
    p_subproductos: data.subproductos || [],
    p_insumos: data.insumos || [],
    p_unidades_por_caja: data.unidades_por_caja,
    p_precio_venta: data.precio_venta,
    p_categoria_id: null,
    p_plantilla_etiqueta: data.plantilla_etiqueta || 'esteril_proclides',
    p_vida_util_meses: data.vida_util_meses || 35,
    p_registro_invima: data.registro_invima || null,
    p_codigo_barras: data.codigo_barras || null,
    p_requiere_esterilizacion: data.requiere_esterilizacion || false,
  });
}

export async function toggleEstadoProducto(codigo_pt, nuevoEstado) {
  const { error } = await supabase
    .from('productos_terminados')
    .update({ estado_activo: nuevoEstado })
    .eq('codigo_pt', codigo_pt);

  if (error) throw new Error(traducirError(error.message));
}

export async function eliminarProducto(codigo_pt) {
  const { error } = await supabase.from('productos_terminados').delete().eq('codigo_pt', codigo_pt);

  if (error) throw new Error(traducirError(error.message));
}