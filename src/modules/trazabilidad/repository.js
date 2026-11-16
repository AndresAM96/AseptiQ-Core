import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getLotesPT() {
  // Traemos los lotes de PT disponibles y sus OPs
  const { data, error } = await supabase
    .from('lotes_pt')
    .select('codigo_pt, lote_op, lote_eo, productos_terminados(nombre)')
    .gt('cantidad_inicial', 0)
    .order('codigo_pt');

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function getInsumosYLotes() {
  // Traemos los insumos y sus lotes que tengan historial de consumo
  const { data, error } = await supabase
    .from('insumos')
    .select('id, nombre, codigo, insumo_lotes(lote)')
    .order('nombre');

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function trazarForward(codigo_pt, lote_op, lote_eo) {
  return await rpc('trazar_forward', {
    p_codigo_pt: codigo_pt,
    p_lote_op: lote_op,
    p_lote_eo: lote_eo || null
  });
}

export async function trazarBackward(insumo_id, lote) {
  return await rpc('trazar_backward', {
    p_insumo_id: insumo_id,
    p_lote: lote
  });
}