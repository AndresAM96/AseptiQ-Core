import { esc, num, money } from '../../core/formatters.js';
import { estadoInsumo } from '../../core/estadoInsumo.js';

export function renderDashboard(container, data, config) {
  const { insumos, ops, movimientos, lotesCentral } = data;

  // 1. Calcular KPIs
  let valorInventario = 0;
  let insumosUrgentes = 0;

  insumos.forEach(ins => {
    valorInventario += (ins.existencia_actual * ins.costo_unitario);
    if (estadoInsumo(ins, config) === 'Urgente') insumosUrgentes++;
  });

  const cajasCentral = lotesCentral.reduce((acc, lote) => acc + Number(lote.cantidad_actual), 0);
  const opsActivas = ops.length;

  // 2. Filtrar stock crítico (top 5 urgentes)
  const criticos = insumos
    .filter(ins => estadoInsumo(ins, config) === 'Urgente')
    .sort((a, b) => (a.existencia_actual / a.punto_reorden) - (b.existencia_actual / b.punto_reorden))
    .slice(0, 5);

  const filasCriticos = criticos.map(ins => `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
      <div>
        <div style="font-size: 13px; font-weight: 500;">${esc(ins.nombre)}</div>
        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${esc(ins.codigo)}</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 13px; font-weight: 600; color: var(--danger);">${num(ins.existencia_actual)} ${esc(ins.unidad_consumo)}</div>
        <div style="font-size: 11px; color: var(--text-muted);">Min: ${num(ins.punto_reorden)}</div>
      </div>
    </div>
  `).join('') || '<div style="padding: 16px 0; text-align: center; color: var(--text-muted); font-size: 13px;">Todo el inventario está en orden.</div>';

  // 3. Historial de movimientos
  const filasMovs = movimientos.map(m => {
    const fecha = new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    let detalle = '';

    if (m.tipo === 'entrada') detalle = `<span style="color:var(--success); font-weight:600;">+${num(m.cantidad)}</span> ${esc(m.insumos?.nombre || 'Insumo')}`;
    else if (m.tipo === 'salida' || m.tipo === 'consumo') detalle = `<span style="color:var(--danger); font-weight:600;">-${num(m.cantidad)}</span> ${esc(m.insumos?.nombre || 'Insumo')}`;
    else if (m.tipo === 'produccion_pt') detalle = `<span style="color:var(--info); font-weight:600;">+${num(m.cantidad)}</span> Producción PT`;
    else if (m.tipo === 'recepcion_central') detalle = `<span style="color:var(--accent); font-weight:600;">+${num(m.cantidad)}</span> Esterilizado`;
    else detalle = `<span style="font-weight:600;">${num(m.cantidad)}</span> ${esc(m.tipo)}`;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border);">
        <div>
          <div style="font-size: 13px;">${detalle}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${esc(m.observaciones || '—')}</div>
        </div>
        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${fecha}</div>
      </div>
    `;
  }).join('') || '<div style="padding: 16px 0; text-align: center; color: var(--text-muted); font-size: 13px;">No hay movimientos recientes.</div>';

  // Render HTML
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Dashboard</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Resumen operativo en tiempo real.</p>
      </div>
      <div style="font-size: 12px; color: var(--text-muted);">${new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <!-- Tarjetas KPI -->
    <div class="grid-cols-4" style="display: grid; gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">Valor Inventario</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${money(valorInventario)}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">Insumos Críticos</div>
        <div style="font-size: 24px; font-weight: 700; color: ${insumosUrgentes > 0 ? 'var(--danger)' : 'var(--success)'};">${insumosUrgentes}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">OPs Activas</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--info);">${opsActivas}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 20px; border-radius: 12px;">
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 600; margin-bottom: 8px;">En Central EO</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--text-primary);">${num(cajasCentral)} <span style="font-size:12px; color:var(--text-muted);">u</span></div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Panel Stock Crítico -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 14px; margin: 0;">⚠️ Alerta de Stock Crítico</h3>
          <a href="#/insumos" style="font-size: 12px; color: var(--accent); text-decoration: none;">Ver todos</a>
        </div>
        ${filasCriticos}
      </div>

      <!-- Panel Movimientos Recientes -->
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="font-size: 14px; margin: 0;">🕒 Actividad Reciente</h3>
          <a href="#/kardex" style="font-size: 12px; color: var(--accent); text-decoration: none;">Ver Kardex</a>
        </div>
        ${filasMovs}
      </div>
    </div>
  `;
}