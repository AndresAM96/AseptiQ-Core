import { esc, num } from '../../core/formatters.js';

export function renderKardex(container, insumos, movs, insumoSeleccionado) {
  // Generar opciones del select
  const opciones = insumos.map(i =>
    `<option value="${i.id}" ${insumoSeleccionado === i.id ? 'selected' : ''}>${esc(i.nombre)} (${esc(i.codigo)})</option>`
  ).join('');

  let tablaHtml = '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">Selecciona un insumo para ver su historial.</td></tr>';
  let kpisHtml = '';

  if (insumoSeleccionado && movs) {
    const ins = insumos.find(i => i.id === insumoSeleccionado);

    // Cálculos matemáticos para el Kardex
    let totalEntradas = 0;
    let totalSalidas = 0;

    // Primero sumamos todos los movimientos para deducir el saldo inicial
    movs.forEach(m => {
      if (m.tipo === 'entrada' || m.tipo === 'ajuste') totalEntradas += Number(m.cantidad);
      else totalSalidas += Number(m.cantidad);
    });

    const saldoInicial = Number(ins.existencia_actual) - totalEntradas + totalSalidas;
    let saldoCorrido = saldoInicial;

    // Generar las filas del kardex
    const filas = movs.map(m => {
      const esEntrada = m.tipo === 'entrada' || m.tipo === 'ajuste';
      const valEntrada = esEntrada ? Number(m.cantidad) : 0;
      const valSalida = !esEntrada ? Number(m.cantidad) : 0;

      saldoCorrido = saldoCorrido + valEntrada - valSalida;

      const fecha = new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

      // Formatear el documento/referencia
      let ref = m.observaciones || '—';
      if (m.documento_tipo && m.documento_numero) {
        ref = `${m.documento_tipo}: ${m.documento_numero} | ${ref}`;
      }

      const lote = m.insumo_lotes?.lote || 'S/N';

      return `
        <tr style="border-bottom: 1px solid var(--border);">
          <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${fecha}</td>
          <td style="padding: 10px 12px; text-transform: capitalize; font-weight: 500;">${esc(m.tipo)}</td>
          <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 11px;">${esc(lote)}</td>
          <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${esc(ref)}</td>
          <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">${valEntrada > 0 ? '+' + num(valEntrada) : '—'}</td>
          <td style="padding: 10px 12px; text-align: right; color: var(--danger); font-weight: 600;">${valSalida > 0 ? '-' + num(valSalida) : '—'}</td>
          <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--accent);">${num(saldoCorrido)} ${esc(ins.unidad_consumo)}</td>
        </tr>
      `;
    }).join('');

    tablaHtml = filas || '<tr><td colspan="7" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay movimientos registrados para este insumo.</td></tr>';

    kpisHtml = `
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px;">
        <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 16px; border-radius: 8px;">
          <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 4px;">Saldo Inicial</div>
          <div style="font-size: 18px; font-weight: 600;">${num(saldoInicial)} <span style="font-size:12px; color:var(--text-muted);">${esc(ins.unidad_consumo)}</span></div>
        </div>
        <div style="background: var(--success-bg); border: 1px solid var(--success); padding: 16px; border-radius: 8px;">
          <div style="font-size: 11px; color: var(--success); margin-bottom: 4px;">Entradas</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--success);">+${num(totalEntradas)}</div>
        </div>
        <div style="background: var(--danger-bg); border: 1px solid var(--danger); padding: 16px; border-radius: 8px;">
          <div style="font-size: 11px; color: var(--danger); margin-bottom: 4px;">Salidas / Consumos</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--danger);">-${num(totalSalidas)}</div>
        </div>
        <div style="background: var(--surface-1); border: 1px solid var(--accent); padding: 16px; border-radius: 8px;">
          <div style="font-size: 11px; color: var(--accent); margin-bottom: 4px;">Saldo Actual</div>
          <div style="font-size: 18px; font-weight: 600; color: var(--accent);">${num(ins.existencia_actual)} <span style="font-size:12px; opacity:0.7;">${esc(ins.unidad_consumo)}</span></div>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Kardex de Insumos</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Historial cronológico de movimientos y saldo corrido.</p>

    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 24px; display: flex; gap: 16px; align-items: flex-end;">
      <div style="flex: 1; max-width: 400px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Seleccionar Insumo</label>
        <select id="kdx-insumo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="">— Seleccionar —</option>
          ${opciones}
        </select>
      </div>
    </div>

    <div id="kdx-resultado">
      ${kpisHtml}
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Tipo</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Referencia</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Entrada</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Salida</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Saldo</th>
            </tr>
          </thead>
          <tbody>${tablaHtml}</tbody>
        </table>
      </div>
    </div>
  `;
}