import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getInsumos() {
  const { data, error } = await supabase
    .from('insumos')
    .select('id, codigo, nombre, existencia_actual, unidad_consumo')
    .order('nombre');

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function getMovimientosInsumo(insumoId) {
  const { data, error } = await supabase
    .from('movimientos')
    .select(`
      id, tipo, cantidad, fecha, observaciones, documento_tipo, documento_numero,
      insumo_lotes ( lote )
    `)
    .eq('insumo_id', insumoId)
    .order('fecha', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw new Error(traducirError(error.message));
  return data;
}