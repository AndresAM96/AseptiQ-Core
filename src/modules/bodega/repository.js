import { supabase } from '../../shared/http/client.js';
import { traducirError } from '../../shared/http/errores.js';

export async function getCajas() {
  const { data, error } = await supabase
    .from('cajas_ubicacion')
    .select('*')
    .order('actualizado_en', { ascending: false })
    .limit(50);

  if (error) throw new Error(traducirError(error.message));
  return data;
}

export async function guardarUbicacion(data) {
  // Extraer el código PT usando expresión regular (ej: PT-0001 de PT-0001-C001-LOTE-123)
  let codigo_pt = null;
  const match = data.codigo.match(/^(PT-\d+)/i);
  if (match) {
    codigo_pt = match[1].toUpperCase();
  }

  const { error } = await supabase.from('cajas_ubicacion').upsert({
    codigo_caja: data.codigo,
    codigo_pt: codigo_pt, // Si el código es inválido, se guarda como null (la DB lo permite)
    ubicacion: data.ubicacion,
    estado: data.estado,
    usuario_email: (await supabase.auth.getUser()).data.user?.email,
    actualizado_en: new Date().toISOString()
  }, { onConflict: 'codigo_caja' });

  if (error) throw new Error(traducirError(error.message));
}