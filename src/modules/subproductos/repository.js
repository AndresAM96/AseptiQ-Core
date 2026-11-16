import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getSubproductosData() {
  const [subsRes, insumosRes] = await Promise.all([
    supabase.from('subproductos').select('*').order('nombre'),
    supabase.from('insumos').select('id, nombre, unidad_consumo').eq('estado_activo', true).order('nombre')
  ]);

  if (subsRes.error) throw new Error(traducirError(subsRes.error.message));
  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));

  return { subproductos: subsRes.data, insumos: insumosRes.data };
}

export async function getSiguienteCodigoSub() {
  return await rpc('siguiente_codigo', { p_prefijo: 'SUB-', p_tabla: 'subproductos' });
}

export async function guardarSubproducto(data) {
  return await rpc('guardar_subproducto', {
    p_id: data.id || null,
    p_codigo: data.codigo,
    p_nombre: data.nombre,
    p_existencia: data.existencia || 0,
    p_categoria_id: null,
    p_receta: data.receta || [], // [{ insumo_id, cantidad }]
    p_hijos: [], // Lo dejamos vacío por ahora para simplificar
    p_tipo: data.tipo || 'ambos'
  });
}

export async function eliminarSubproducto(id) {
  const { error } = await supabase.from('subproductos').delete().eq('id', id);
  if (error) throw new Error(traducirError(error.message));
}