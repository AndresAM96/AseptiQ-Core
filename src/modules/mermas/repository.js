import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getMermasData() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*, insumos(nombre, codigo, unidad_consumo)')
    .eq('tipo', 'salida')
    .is('proveedor_id', null) // Excluir devoluciones
    .is('orden_id', null);    // Excluir consumos de OP

  if (error) throw new Error(traducirError(error.message));
  return data;
}