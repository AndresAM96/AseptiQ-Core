import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getComprasData() {
  // Traemos todas las entradas con proveedor
  const { data, error } = await supabase
    .from('movimientos')
    .select('*, sys_proveedores(id, razon_social)')
    .eq('tipo', 'entrada')
    .not('proveedor_id', 'is', null);

  if (error) throw new Error(traducirError(error.message));
  return data;
}