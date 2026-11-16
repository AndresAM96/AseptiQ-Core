import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getComprasData() {
  const { data, error } = await supabase
    .from('movimientos')
    // Hacemos el join a insumo_lotes y de ahí a sys_proveedores
    .select('*, insumo_lotes(proveedor_id, sys_proveedores(id, razon_social))')
    .eq('tipo', 'entrada')
    .not('insumo_lote_id', 'is', null); // Solo entradas que tengan lote/proveedor

  if (error) throw new Error(traducirError(error.message));

  // Filtramos solo los que realmente tienen un proveedor asignado
  return data.filter(m => m.insumo_lotes && m.insumo_lotes.sys_proveedores);
}