import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getProgramacionData(desde, hasta) {
  const [opsRes, entregasRes] = await Promise.all([
    // OPs activas que caigan en el rango (o sin fecha, para alertar)
    supabase
      .from('ordenes_semanales')
      .select('*, productos_terminados(nombre)')
      .in('estado_op', ['Pendiente', 'En proceso']),

    // Entregas en el rango de fechas
    supabase
      .from('entregas_op')
      .select('*, ordenes_semanales(numero_op, productos_terminados(nombre))')
      .gte('fecha', `${desde}T00:00:00`)
      .lte('fecha', `${hasta}T23:59:59`)
      .order('fecha', { ascending: true }),
  ]);

  if (opsRes.error) throw new Error(traducirError(opsRes.error.message));
  if (entregasRes.error) throw new Error(traducirError(entregasRes.error.message));

  return { ordenes: opsRes.data || [], entregas: entregasRes.data || [] };
}