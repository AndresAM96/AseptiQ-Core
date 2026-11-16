import { renderConfiguracion } from './view.js';
import { getConfig, updateConfig } from './repository.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloConfiguracion = {
  id: 'configuracion',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando configuración...</div>';
    try {
      const config = await getConfig();

      const handleSave = async (nuevaConfig) => {
        await updateConfig(nuevaConfig);
        // Recargar la app para aplicar cambios en el menú o tema (si lo hubiera)
        moduloConfiguracion.mount(container);
      };

      renderConfiguracion(container, config, handleSave);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};