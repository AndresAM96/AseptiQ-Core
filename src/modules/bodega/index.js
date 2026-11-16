import { esc } from '../../core/formatters.js';
import { getCajas, guardarUbicacion } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';

export const moduloBodega = {
  id: 'bodega',
  mount: async (container) => {
    container.innerHTML = '<div style="color: var(--text-muted);">Cargando bodega...</div>';

    try {
      const cajas = await getCajas();

      const filas = cajas.map(c => `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 11px;">${esc(c.codigo_caja)}</td>
          <td style="padding: 10px 12px; font-weight: 500;">${esc(c.ubicacion)}</td>
          <td style="padding: 10px 12px;">
            <span style="background: var(--success-bg); color: var(--success); padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">
              ${esc(c.estado)}
            </span>
          </td>
          <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 11px;">
            ${new Date(c.actualizado_en).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
          </td>
        </tr>
      `).join('');

      container.innerHTML = `
        <h2 style="font-size: 20px; margin: 0 0 4px;">Bodega PT</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Registra la ubicación física de las cajas.</p>
        
        <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px; align-items: start;">
          
          <!-- Formulario -->
          <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
            <h3 style="margin: 0 0 16px; font-size: 14px;">Asignar Ubicación</h3>
            <div style="margin-bottom: 16px;">
              <label style="font-size: 12px; color: var(--text-secondary);">Código de la Caja (Escanear)</label>
              <input type="text" id="bod-codigo" placeholder="Ej: PT-0001-C001-LOTE-123" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); margin-top: 6px;">
            </div>
            <div style="margin-bottom: 16px;">
              <label style="font-size: 12px; color: var(--text-secondary);">Ubicación Física</label>
              <input type="text" id="bod-ubicacion" placeholder="Ej: Estante A - Nivel 2" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-primary); margin-top: 6px;">
            </div>
            <button id="btn-guardar-bod" style="width: 100%; background: var(--accent); color: var(--accent-ink); border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer;">Guardar Ubicación</button>
          </div>

          <!-- Historial -->
          <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
            <div style="padding: 16px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
              <h3 style="margin: 0; font-size: 14px;">Cajas Ubicadas</h3>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left;">
                  <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Código Caja</th>
                  <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Ubicación</th>
                  <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Estado</th>
                  <th style="padding: 10px 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                </tr>
              </thead>
              <tbody>${cajas.length === 0 ? '<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay cajas registradas.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      `;

      container.querySelector('#btn-guardar-bod').onclick = async () => {
        const codigo = container.querySelector('#bod-codigo').value.trim();
        const ubicacion = container.querySelector('#bod-ubicacion').value.trim();
        if(!codigo || !ubicacion) return toast('Completa ambos campos', 'error');

        try {
          await guardarUbicacion({ codigo, ubicacion, estado: 'En bodega' });
          toast('Ubicación guardada', 'success');
          moduloBodega.mount(container); // Recargar la tabla
        } catch(err) {
          toast(traducirError(err.message), 'error');
        }
      };

    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};