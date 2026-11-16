import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getInsumosConteo() {
  const { data, error } = await supabase
    .from('insumos')
    .select('id, codigo, nombre, existencia_actual, unidad_consumo')
    .eq('estado_activo', true)
    .order('nombre');

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function aplicarAjuste(insumoId, nuevaExistencia, motivo) {
  return await rpc('ajustar_inventario', {
    p_insumo_id: insumoId,
    p_nueva_existencia: nuevaExistencia,
    p_motivo: motivo || 'Ajuste por conteo físico'
  });
}