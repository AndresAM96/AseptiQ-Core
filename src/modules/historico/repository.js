import { supabase } from '../../shared/http/client.js';
import { apiAll } from '../../shared/http/apiAll.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getHistoricoData() {
  const [movsRes, insumosRes, opsRes] = await Promise.all([
    apiAll('movimientos', '*', {}, 'fecha'),
    supabase.from('insumos').select('id, nombre, existencia_actual, costo_unitario'),
    supabase.from('ordenes_semanales').select('id, estado_op, cantidad_proyectada, fecha_creacion')
  ]);

  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));

  return {
    movimientos: movsRes,
    insumos: insumosRes.data,
    ordenes: opsRes.data
  };
}