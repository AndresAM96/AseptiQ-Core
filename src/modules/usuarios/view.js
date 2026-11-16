import { esc } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';

export function renderUsuarios(container, usuarios, currentUserId, onChangeRole, onToggleState) {
  const filas = usuarios.map(u => {
    const esYo = u.user_id === currentUserId;
    const badgeRole = {
      admin: '<span style="background:var(--accent); color:var(--accent-ink); padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">ADMIN</span>',
      operador: '<span style="background:var(--info); color:#fff; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">OPERADOR</span>',
      consulta: '<span style="background:var(--surface-3); color:var(--text-primary); padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">CONSULTA</span>'
    }[u.role];

    const badgeActivo = u.activo
      ? '<span style="color:var(--success); font-weight:600;">Activo</span>'
      : '<span style="color:var(--danger); font-weight:600;">Inactivo</span>';

    return `
      <tr style="border-bottom: 1px solid var(--border); ${esYo ? 'background: var(--surface-2);' : ''}">
        <td style="padding: 12px;">${esc(u.email || '—')} ${esYo ? '<span style="color:var(--accent); font-size:10px;">(Tú)</span>' : ''}</td>
        <td style="padding: 12px;">${esc(u.nombre || '—')}</td>
        <td style="padding: 12px;">${badgeRole}</td>
        <td style="padding: 12px;">${badgeActivo}</td>
        <td style="padding: 12px; text-align: right;">
          <button data-role="${u.user_id}" ${esYo ? 'disabled title="No puedes cambiar tu propio rol"' : ''} style="background: transparent; border: 1px solid var(--border); padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: ${esYo ? 'not-allowed' : 'pointer'}; margin-right: 4px; opacity: ${esYo ? '0.5' : '1'};">Cambiar Rol</button>
          <button data-state="${u.user_id}" data-activo="${u.activo}" ${esYo ? 'disabled title="No puedes desactivarte a ti mismo"' : ''} style="background: transparent; border: 1px solid ${u.activo ? 'var(--danger)' : 'var(--success)'}; color: ${u.activo ? 'var(--danger)' : 'var(--success)'}; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: ${esYo ? 'not-allowed' : 'pointer'}; opacity: ${esYo ? '0.5' : '1'};">
            ${u.activo ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Gestión de Usuarios</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Administra los roles y accesos al sistema.</p>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary);">Correo</th>
            <th style="padding: 12px; color: var(--text-secondary);">Nombre</th>
            <th style="padding: 12px; color: var(--text-secondary);">Rol</th>
            <th style="padding: 12px; color: var(--text-secondary);">Estado</th>
            <th style="padding: 12px; color: var(--text-secondary); text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-role]').forEach(btn => {
    btn.onclick = () => {
      const userId = btn.dataset.role;
      const u = usuarios.find(x => x.user_id === userId);
      const nuevoRol = prompt('Ingresa el nuevo rol (admin, operador, consulta):', u.role);
      if (nuevoRol && ['admin', 'operador', 'consulta'].includes(nuevoRol.toLowerCase())) {
        onChangeRole(userId, nuevoRol.toLowerCase());
      } else if (nuevoRol) {
        toast('Rol inválido. Debe ser admin, operador o consulta.', 'error');
      }
    };
  });

  container.querySelectorAll('[data-state]').forEach(btn => {
    btn.onclick = () => {
      const userId = btn.dataset.state;
      const activo = btn.dataset.activo === 'true';
      onToggleState(userId, !activo);
    };
  });
}