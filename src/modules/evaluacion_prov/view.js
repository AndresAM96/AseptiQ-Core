import { esc, num, money } from '../../core/formatters.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { toast } from '../../shared/ui/toast.js';

export function renderEvaluacion(container, data, onEvaluar) {
  const { proveedores } = data;

  const filas = proveedores.map(p => {
    let badgeEval = '<span class="badge neutral" style="font-size:10px;">Sin eval.</span>';
    if (p.ultimaEval) {
      const color = p.ultimaEval.resultado === 'Excelente' ? 'success' : (p.ultimaEval.resultado === 'Bueno' ? 'info' : (p.ultimaEval.resultado === 'Regular' ? 'warning' : 'danger'));
      badgeEval = `<span style="background:var(--${color}-bg); color:var(--${color}); padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">${p.ultimaEval.resultado} (${num(p.ultimaEval.promedio,1)})</span>`;
    }

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-weight: 500;">${esc(p.razon_social)}</td>
        <td style="padding: 10px 12px; text-align: right;">${money(p.comprado)}</td>
        <td style="padding: 10px 12px; text-align: right; color: ${p.tasaDev > 5 ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${num(p.tasaDev, 2)}%</td>
        <td style="padding: 10px 12px; text-align: center;">${badgeEval}</td>
        <td style="padding: 10px 12px; text-align: right;">
          <button data-eval="${p.id}" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Evaluar</button>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Evaluación de Proveedores</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Análisis de desempeño (SGC - CYC-GEF-FR-06).</p>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Proveedor</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Compras ($)</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Tasa Devolución</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Última Evaluación</th>
            <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Acciones</th>
          </tr>
        </thead>
        <tbody>${proveedores.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay compras registradas para evaluar.</td></tr>' : filas}</tbody>
      </table>
    </div>
  `;

  container.querySelectorAll('[data-eval]').forEach(btn => {
    btn.onclick = () => {
      const prov = proveedores.find(p => p.id === btn.dataset.eval);
      onEvaluar(prov);
    };
  });
}

export function abrirModalEvaluacion(prov, onSave) {
  // Sugerir nota de calidad según tasa de devolución
  let sugerenciaCalidad = 5.0;
  if (prov.tasaDev > 10) sugerenciaCalidad = 2.0;
  else if (prov.tasaDev > 5) sugerenciaCalidad = 3.0;

  abrirModal({
    title: 'Nueva Evaluación',
    subtitle: prov.razon_social,
    body: `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
        <div><label style="font-size:12px; color:var(--text-secondary);">Cumplimiento Entrega (0-5)</label><input type="number" id="eval-entrega" value="5.0" step="0.1" max="5" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-primary);"></div>
        <div><label style="font-size:12px; color:var(--text-secondary);">Calidad (0-5)</label><input type="number" id="eval-calidad" value="${sugerenciaCalidad}" step="0.1" max="5" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-primary);"></div>
        <div><label style="font-size:12px; color:var(--text-secondary);">Servicio Postventa (0-5)</label><input type="number" id="eval-postventa" value="5.0" step="0.1" max="5" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-primary);"></div>
        <div><label style="font-size:12px; color:var(--text-secondary);">Precio (0-5)</label><input type="number" id="eval-precio" value="5.0" step="0.1" max="5" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-primary);"></div>
        <div style="grid-column: 1/-1;"><label style="font-size:12px; color:var(--text-secondary);">Certificado Fumigación</label>
          <select id="eval-fumi" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-primary);">
            <option value="5.0">Sí aplica (Envía) - 5.0</option>
            <option value="3.5">Sí aplica (No envía) - 3.5</option>
            <option value="5.0">No aplica - 5.0</option>
          </select>
        </div>
        <div style="grid-column: 1/-1;"><label style="font-size:12px; color:var(--text-secondary);">Observaciones</label><textarea id="eval-obs" rows="2" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border); background:var(--surface-2); color:var(--text-primary);"></textarea></div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Guardar Evaluación</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = cerrarModal;
      overlay.querySelector('#btn-save').onclick = async () => {
        const ent = parseFloat(overlay.querySelector('#eval-entrega').value) || 0;
        const cal = parseFloat(overlay.querySelector('#eval-calidad').value) || 0;
        const post = parseFloat(overlay.querySelector('#eval-postventa').value) || 0;
        const prec = parseFloat(overlay.querySelector('#eval-precio').value) || 0;
        const fumi = parseFloat(overlay.querySelector('#eval-fumi').value) || 0;

        const promedio = (ent + cal + post + prec + fumi) / 5;
        let resultado = 'No Confiable';
        if (promedio >= 4.5) resultado = 'Excelente';
        else if (promedio >= 3.9) resultado = 'Bueno';
        else if (promedio >= 3.0) resultado = 'Regular';

        try {
          await onSave({
            proveedor_id: prov.id, proveedor_nombre: prov.razon_social, proveedor_nit: prov.nit,
            nota_entrega: ent, nota_calidad: cal, nota_postventa: post, nota_precio: prec, nota_fumigacion: fumi,
            promedio, resultado, observaciones: overlay.querySelector('#eval-obs').value.trim()
          });
          toast(`Evaluación guardada. Promedio: ${promedio.toFixed(1)}`, 'success');
          cerrarModal();
        } catch (err) { toast(err.message, 'error'); }
      };
    }
  });
}