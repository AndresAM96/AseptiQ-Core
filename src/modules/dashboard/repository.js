import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getDashboardData() {
  const [insumosRes, opsRes, movsRes, lotesCentralRes] = await Promise.all([
    supabase.from('insumos').select('*').eq('estado_activo', true),
    supabase.from('ordenes_semanales').select('*').in('estado_op', ['Pendiente', 'En proceso']),
    supabase.from('movimientos')
      .select('*, insumos(nombre), lotes_pt(codigo_pt)')
      .order('fecha', { ascending: false })
      .limit(5),
    supabase.from('lotes_pt').select('cantidad_actual').eq('estado', 'en_central')
  ]);

  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));
  if (movsRes.error) throw new Error(traducirError(movsRes.error.message));
  if (lotesCentralRes.error) throw new Error(traducirError(lotesCentralRes.error.message));

  return {
    insumos: insumosRes.data,
    ops: opsRes.data,
    movimientos: movsRes.data,
    lotesCentral: lotesCentralRes.data
  };
}