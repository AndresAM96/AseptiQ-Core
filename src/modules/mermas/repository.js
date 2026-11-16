import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getMermasData() {
  const { data, error } = await supabase
    .from('movimientos')
    .select('*, insumos(nombre, codigo, unidad_consumo)')
    .eq('tipo', 'salida')
    .is('orden_id', null); // Excluir consumos de OP

  if (error) throw new Error(traducirError(error.message));

  // Excluir devoluciones a proveedor (esas se ven en su propio módulo)
  return data.filter(m => {
    const obs = (m.observaciones || '').toLowerCase();
    return !obs.includes('devolución');
  });
}