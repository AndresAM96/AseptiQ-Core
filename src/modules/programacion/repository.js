import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getProgramacionData() {
  const { data, error } = await supabase
    .from('ordenes_semanales')
    .select('*, productos_terminados(nombre)')
    .in('estado_op', ['Pendiente', 'En proceso'])
    .not('fecha_programada', 'is', null)
    .order('prioridad', { ascending: true });

  if (error) throw new Error(traducirError(error.message));
  return data;
}