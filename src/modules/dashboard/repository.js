import { supabase } from '../../shared/http/client.js';
import { rpc } from '../../shared/http/rpc.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getDashboardData() {
  try {
    const [insumosRes, subRes, prodRes, movsRes, costosRpc] = await Promise.all([
      supabase.from('insumos').select('*').eq('estado_activo', true),
      supabase.from('subproductos').select('*').eq('estado_activo', true),
      supabase.from('productos_terminados').select('*').eq('estado_activo', true),
      supabase.from('movimientos').select('*, insumos(nombre), subproducto_producciones!subproducto_produccion_id(subproductos(nombre)), lotes_pt(codigo_pt)').order('fecha', { ascending: false }).limit(15),
      rpc('costos_todos', {})
    ]);

    if (insumosRes.error) throw new Error(traducirError(insumosRes.error.message));
    if (subRes.error) throw new Error(traducirError(subRes.error.message));
    if (prodRes.error) throw new Error(traducirError(prodRes.error.message));
    if (movsRes.error) throw new Error(traducirError(movsRes.error.message));

    return {
      insumos: insumosRes.data || [],
      subproductos: subRes.data || [],
      productos: prodRes.data || [],
      movimientos: movsRes.data || [],
      costos: {
        subCosto: costosRpc?.subproducto_costo || {},
        paqCosto: costosRpc?.paquete_costo || {}
      }
    };
  } catch (error) {
    console.error("Error en getDashboardData:", error);
    throw error;
  }
}