import { supabase } from '../http/client.js';
import { traducirError } from '../http/errores.js';

let _session = null;
let _profile = null;

export function getSession() { return _session; }
export function getProfile() { return _profile; }

/**
 * Inicia sesión con email y contraseña.
 * @param {string} email
 * @param {string} password
 */
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) throw new Error(traducirError(error.message));

  _session = data.session;
  await loadProfile();

  if (_profile && _profile.activo === false) {
    await logout();
    throw new Error('Tu cuenta está desactivada. Contacta al administrador.');
  }

  return _session;
}

/**
 * Cierra la sesión activa.
 */
export async function logout() {
  await supabase.auth.signOut();
  _session = null;
  _profile = null;
}

/**
 * Carga el perfil del usuario (rol, estado).
 */
async function loadProfile() {
  if (!_session || !_session.user) {
    _profile = null;
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', _session.user.id)
    .single();

  if (error || !data) {
    _profile = { user_id: _session.user.id, email: _session.user.email, role: 'consulta', activo: true };
  } else {
    _profile = data;
  }
}

/**
 * Intenta recuperar la sesión al abrir la app.
 */
export async function initSession() {
  const { data } = await supabase.auth.getSession();
  if (data && data.session) {
    _session = data.session;
    await loadProfile();

    if (_profile && _profile.activo === false) {
      await logout();
      return null;
    }
    return _session;
  }
  return null;
}

/**
 * Configura el listener para expiración de sesión o refresh.
 */
export function setupAuthListener(onSessionExpired) {
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      _session = null;
      _profile = null;
      if (onSessionExpired) onSessionExpired();
    } else if (event === 'TOKEN_REFRESHED' && session) {
      _session = session;
    }
  });
}