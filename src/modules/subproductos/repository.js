import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getSubproductosData() {
  const [subsRes, insumosRes, recetasRes, hijosRes] = await Promise.all([
    supabase.from('subproductos').select('*').order('nombre'),
    supabase
      .from('insumos')
      .select('id, nombre, unidad_consumo')
      .eq('estado_activo', true)
      .order('nombre'),
    supabase.from('subproducto_recetas').select('*'),
    supabase.from('subproducto_subproductos').select('*'),
  ]);

  if (subsRes.error) throw new Error(traducirError(subsRes.error.message));

  return {
    subproductos: subsRes.data || [],
    insumos: insumosRes.data || [],
    recetas: recetasRes.data || [],
    hijos: hijosRes.data || [],
  };
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
    p_receta: data.receta || [],
    p_hijos: data.hijos || [],
    p_tipo: data.tipo || 'ambos',
  });
}

export async function toggleEstadoSub(id, nuevoEstado) {
  const { error } = await supabase
    .from('subproductos')
    .update({ estado_activo: nuevoEstado })
    .eq('id', id);
  if (error) throw new Error(traducirError(error.message));
}

export async function eliminarSubproducto(id) {
  const { error } = await supabase.from('subproductos').delete().eq('id', id);
  if (error) throw new Error(traducirError(error.message));
}