import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getCentralData() {
  // Solo traemos los lotes que están esperando ciclo EO (en_central y en_reproceso)
  const { data, error } = await supabase.from('lotes_pt')
    .select('*, productos_terminados(nombre), ordenes_semanales(numero_op)')
    .in('estado', ['en_central', 'en_reproceso'])
    .gt('cantidad_actual', 0);

  if (error) throw new Error(traducirError(error.message));

  return { enCentral: data };
}

export async function registrarCicloEO(carga_id, numero_carga, items) {
  return await rpc('recibir_ciclo_eo', { p_carga_id: carga_id, p_numero_carga: numero_carga, p_items: items });
}