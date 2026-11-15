/**
 * Traduce los errores de Supabase a mensajes en español.
 * @param {string} msg - Mensaje crudo de error.
 * @returns {string} Mensaje traducido.
 */
export function traducirError(msg) {
  if (!msg) return 'Error desconocido.';

  const m = String(msg);
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'El correo no está confirmado. Contacta al administrador.';
  if (/User not found/i.test(m)) return 'Usuario no encontrado.';
  if (/duplicate key value violates unique constraint/i.test(m)) return 'Ya existe un registro con este valor único (ej. código o NIT).';
  if (/violates foreign key constraint/i.test(m)) return 'No se puede completar: hay registros relacionados.';
  if (/JWT expired/i.test(m)) return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
  if (/Permiso denegado/i.test(m)) return 'No tienes permisos para realizar esta acción.';

  return m;
}