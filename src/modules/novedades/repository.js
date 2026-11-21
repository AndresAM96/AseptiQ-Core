import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getNovedades() {
  const { data, error } = await supabase
    .from('ordenes_semanales')
    .select('*, productos_terminados(nombre)')
    .in('estado_op', ['Pendiente', 'En proceso'])
    .order('prioridad', { ascending: true })
    .order('fecha_creacion', { ascending: false });

  if (error) throw new Error(traducirError(error.message));
  return data || [];
}