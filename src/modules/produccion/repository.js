import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getProduccionData() {
  const [subsRes, movsRes] = await Promise.all([
    supabase
      .from('subproductos')
      .select('id, codigo, nombre, existencia_actual')
      .eq('estado_activo', true)
      .order('nombre'),
    supabase
      .from('movimientos')
      .select(
        '*, subproducto_producciones!movimientos_subproducto_produccion_id_fkey(subproducto_id, subproductos(nombre, codigo))'
      )
      .eq('tipo', 'produccion_subproducto')
      .order('fecha', { ascending: false })
      .limit(50),
  ]);

  if (subsRes.error) throw new Error(traducirError(subsRes.error.message));
  if (movsRes.error) throw new Error(traducirError(movsRes.error.message));

  return { subproductos: subsRes.data || [], movimientos: movsRes.data || [] };
}

export async function registrarProduccion(id, cantidad, motivo) {
  return await rpc('producir_subproducto', {
    p_id: id,
    p_cantidad: cantidad,
    p_motivo: motivo || 'Producción Interna',
  });
}