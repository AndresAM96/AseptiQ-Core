import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getCostosOPData() {
  const [opsRes, insumosRes] = await Promise.all([
    supabase.from('ordenes_semanales')
      .select('*, productos_terminados(nombre)')
      .eq('estado_op', 'Terminada')
      .order('fecha_completado', { ascending: false }),
    supabase.from('insumos').select('id, codigo, nombre, costo_unitario, unidad_consumo')
  ]);

  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));
  if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));

  return { ordenes: opsRes.data, insumos: insumosRes.data };
}

export async function getDetalleCostosOP(ordenId) {
  // Traemos los consumos reales de esa OP
  const { data, error } = await supabase.from('movimientos')
    .select('*, insumos(nombre, codigo, unidad_consumo)')
    .eq('orden_id', ordenId)
    .eq('tipo', 'consumo');

  if (error) throw new Error(traducirError(error.message));
  return data;
}