import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getRentabilidadData() {
  const [prodsRes, costosRpc] = await Promise.all([
    supabase.from('productos_terminados').select('*').eq('estado_activo', true).order('nombre'),
    rpc('costos_todos', {})
  ]);

  if (prodsRes.error) throw new Error(traducirError(prodsRes.error.message));

  return {
    productos: prodsRes.data,
    costos: costosRpc.paquete_costo || {}
  };
}