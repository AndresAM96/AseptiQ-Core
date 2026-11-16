import { renderUsuarios } from './view.js';
import { getUsuarios, actualizarUsuario } from './repository.js';
import { getProfile } from '../../shared/auth/session.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloUsuarios = {
  id: 'usuarios',
  mount: async (container) => {
    const profile = getProfile();
    if (profile.role !== 'admin') {
      container.innerHTML = '<div style="color: var(--danger); padding: 24px; text-align: center;">Solo el administrador puede acceder a este módulo.</div>';
      return;
    }

    container.innerHTML = '<div style="color: var(--text-muted);">Cargando usuarios...</div>';

    try {
      const usuarios = await getUsuarios();

      const onChangeRole = async (userId, nuevoRol) => {
        try {
          await actualizarUsuario(userId, { role: nuevoRol });
          toast('Rol actualizado', 'success');
          moduloUsuarios.mount(container);
        } catch (err) { toast(err.message, 'error'); }
      };

      const onToggleState = async (userId, nuevoEstado) => {
        if(!confirm(`¿Estás seguro de ${nuevoEstado ? 'activar' : 'desactivar'} este usuario?`)) return;
        try {
          await actualizarUsuario(userId, { activo: nuevoEstado });
          toast('Estado actualizado', 'success');
          moduloUsuarios.mount(container);
        } catch (err) { toast(err.message, 'error'); }
      };

      renderUsuarios(container, usuarios, profile.user_id, onChangeRole, onToggleState);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};