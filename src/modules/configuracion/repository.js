import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getConfig() {
  const { data, error } = await supabase.from('sys_config').select('config').eq('id', 1).single();
  if (error) throw new Error(traducirError(error.message));
  return data.config;
}

export async function updateConfig(nuevaConfig) {
  const { error } = await supabase
    .from('sys_config')
    .update({ config: nuevaConfig })
    .eq('id', 1);

  if (error) throw new Error(traducirError(error.message));
}