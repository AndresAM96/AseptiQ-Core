import JSZip from 'jszip';
import { renderBackup } from './view.js';
import { getBackupLog, generarDatosBackup, registrarLogBackup } from './repository.js';
import { toast } from '../../shared/ui/toast.js';
import { traducirError } from '../../shared/http/errores.js';
import { getProfile } from '../../shared/auth/session.js';

// Función para convertir un array de objetos a CSV
function jsonToCSV(jsonArray) {
  if (!jsonArray || !jsonArray.length) return '';
  const headers = Object.keys(jsonArray[0]);
  const csvRows = [];

  // Headers
  csvRows.push(headers.join(';'));

  // Data
  for (const row of jsonArray) {
    const values = headers.map(h => {
      const escaped = ('' + (row[h] ?? '')).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(';'));
  }

  return csvRows.join('\r\n');
}

export const moduloBackup = {
  id: 'backup',
  mount: async (container) => {
    const profile = getProfile();
    if (profile.role !== 'admin') {
      container.innerHTML = '<div style="color: var(--danger); padding: 24px; text-align: center;">Solo el administrador puede acceder a este módulo.</div>';
      return;
    }

    container.innerHTML = '<div style="color: var(--text-muted);">Cargando historial...</div>';

    try {
      const logs = await getBackupLog();

      const handleGenerar = async (rango) => {
        const btn = container.querySelector('#btn-generar');
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Generando backup (esto puede tardar)...';

        try {
          // 1. Traer datos
          const datos = await generarDatosBackup(rango);

          // 2. Armar ZIP
          const zip = new JSZip();
          let totalRegistros = 0;
          const tablasIncluidas = [];

          for (const [nombre, array] of Object.entries(datos)) {
            const csvStr = jsonToCSV(array);
            // Agregar BOM UTF-8 para que Excel respete tildes
            zip.file(`${nombre}.csv`, '\uFEFF' + csvStr);
            totalRegistros += array.length;
            tablasIncluidas.push(nombre);
          }

          const blob = await zip.generateAsync({ type: 'blob' });

          // 3. Descargar
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `aseptiq_backup_${new Date().toISOString().slice(0,10)}.zip`;
          a.click();
          URL.revokeObjectURL(url);

        // 4. Registrar en el log
        try {
            await registrarLogBackup(tablasIncluidas, rango, totalRegistros, blob.size);
          } catch (logErr) {
            console.warn('El archivo se descargó, pero no se pudo guardar el historial:', logErr);
          }

          toast('Backup generado exitosamente', 'success');
          moduloBackup.mount(container); // Recargar para ver el log nuevo
        } catch (err) {
          toast('Error al generar backup: ' + err.message, 'error');
        } finally {
          btn.disabled = false;
          btn.textContent = textoOriginal;
        }
      };

      renderBackup(container, logs, handleGenerar);
    } catch (error) {
      container.innerHTML = `<div style="color: var(--danger);">Error: ${traducirError(error.message)}</div>`;
    }
  },
  unmount: () => {}
};