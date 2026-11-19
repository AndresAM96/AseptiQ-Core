import { esc, num, money } from '../../core/formatters.js';
import { estadoInsumo } from '../../core/estadoInsumo.js';
import { icono } from '../../shared/ui/icons.js';

export function renderDashboard(container, data, config) {
  const insumos = data.insumos || [];
  const subproductos = data.subproductos || [];
  const productos = data.productos || [];
  const movimientos = data.movimientos || [];
  const costos = data.costos || { subCosto: {}, paqCosto: {} };

  // --- CÁLCULOS ---
  let cIns = 0, rIns = 0, uIns = 0;
  insumos.forEach(i => {
    const e = estadoInsumo(i, config);
    if (e === 'Cubierto') cIns++;
    else if (e === 'Reorden') rIns++;
    else uIns++;
  });

  let subConStock = 0, subSinStock = 0;
  subproductos.forEach(s => (s.existencia_actual > 0 ? subConStock++ : subSinStock++));

  let ptConStock = 0, ptSinStock = 0;
  productos.forEach(p => (p.existencia_actual > 0 ? ptConStock++ : ptSinStock++));

  let valorIns = 0, valorSub = 0, valorPT = 0;
  insumos.forEach(i => valorIns += (i.existencia_actual * i.costo_unitario));
  subproductos.forEach(s => valorSub += (s.existencia_actual * (costos.subCosto[s.id] || 0)));
  productos.forEach(p => valorPT += (p.existencia_actual * (costos.paqCosto[p.codigo_pt] || 0)));
  const valorTotal = valorIns + valorSub + valorPT;

  // Top 5 críticos
  const criticos = insumos
    .filter(i => ['Urgente', 'Reorden'].includes(estadoInsumo(i, config)))
    .sort((a, b) => {
      const ea = estadoInsumo(a, config) === 'Urgente' ? 0 : 1;
      const eb = estadoInsumo(b, config) === 'Urgente' ? 0 : 1;
      if (ea !== eb) return ea - eb;
      return (a.existencia_actual / (a.punto_reorden || 1)) - (b.existencia_actual / (b.punto_reorden || 1));
    }).slice(0, 5);

  // --- RENDER HTML ---
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Dashboard</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Estado de existencias y valorización del inventario.</p>
      </div>
      <button id="btn-refresh-dash" title="Actualizar datos del dashboard" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); padding: 6px 12px; border-radius: 6px; cursor: pointer;">
        ${icono('clock','sm')} Actualizar
      </button>
    </div>

    <!-- BANNER ALERTA -->
    ${(uIns + rIns) > 0 ? `
      <div id="alert-banner" style="background: var(--danger-bg); border: 1px solid var(--danger); border-radius: 10px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 14px; color: var(--danger);">
        <div style="font-size: 20px;">${icono('alert-triangle','lg')}</div>
        <div style="flex: 1; font-size: 13px; line-height: 1.4;">
          <strong style="display: block; margin-bottom: 2px;">${uIns + rIns} insumos ${uIns > 0 ? 'en estado urgente' : 'en reorden'}.</strong>
          <span style="color: var(--text-secondary);">Revisa existencias y programa reposición.</span>
        </div>
        <a href="#/insumos" title="Ir al listado completo de insumos" style="background: var(--danger); color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600;">Ver Insumos</a>
        <button id="btn-close-alert" title="Ocultar esta alerta temporalmente" style="background: none; border: none; color: currentColor; font-size: 20px; cursor: pointer; opacity: 0.6;">&times;</button>
      </div>
    ` : ''}

    <!-- TABLA CRÍTICOS -->
    ${criticos.length > 0 ? `
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
        <div style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
            ${icono('alert-circle','sm')} Stock crítico del día
          </h3>
          <a href="#/insumos" title="Ver el inventario completo de insumos" style="font-size: 12px; color: var(--accent); text-decoration: none; background: var(--surface-2); padding: 4px 8px; border-radius: 4px;">Ver todos</a>
        </div>
        <table class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left;">
              <th style="padding: 12px 18px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
              <th style="padding: 12px 18px; color: var(--text-secondary); font-weight: 500; text-align: right;">Existencia</th>
              <th style="padding: 12px 18px; color: var(--text-secondary); font-weight: 500; text-align: right;">Mínimo</th>
              <th style="padding: 12px 18px; color: var(--text-secondary); font-weight: 500; width: 150px;">Cobertura</th>
              <th style="padding: 12px 18px; color: var(--text-secondary); font-weight: 500; text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${criticos.map(i => {
              const ex = Number(i.existencia_actual) || 0;
              const pr = Number(i.punto_reorden) || 0;
              const pct = pr > 0 ? Math.min(100, Math.round(ex / pr * 100)) : 0;
              const color = estadoInsumo(i, config) === 'Urgente' ? 'var(--danger)' : 'var(--warning)';
              return `
                <tr style="border-bottom: 1px solid var(--border);">
                  <td style="padding: 10px 18px;">${esc(i.nombre)} <span class="mono" style="color:var(--text-muted); font-size:11px;">${esc(i.codigo)}</span></td>
                  <td style="padding: 10px 18px; text-align: right; color: ${color}; font-weight: 600;">${num(ex)} ${esc(i.unidad_consumo)}</td>
                  <td style="padding: 10px 18px; text-align: right;">${num(pr)} ${esc(i.unidad_consumo)}</td>
                  <td style="padding: 10px 18px;">
                    <div style="background: var(--surface-3); border-radius: 6px; height: 6px; overflow: hidden;">
                      <div style="height: 100%; width: ${pct}%; background: ${color};"></div>
                    </div>
                    <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px;">${pct}%</div>
                  </td>
                  <td style="padding: 10px 18px; text-align: center;">
                    <span style="background: ${color}-bg; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">${estadoInsumo(i, config)}</span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- SECCIÓN INSUMOS -->
    <h3 class="section-title" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">Insumos</h3>
    <div class="grid-cols-4" style="gap: 12px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumos activos</div>
        <div style="font-size: 24px; font-weight: 600;">${insumos.length}</div>
      </div>
      <div style="background: var(--success-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--success); margin-bottom: 6px;">Cubiertos</div>
        <div style="font-size: 24px; font-weight: 600; color: var(--success);">${cIns}</div>
      </div>
      <div style="background: var(--warning-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--warning); margin-bottom: 6px;">En reorden</div>
        <div style="font-size: 24px; font-weight: 600; color: var(--warning);">${rIns}</div>
      </div>
      <div style="background: var(--danger-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--danger); margin-bottom: 6px;">Urgentes</div>
        <div style="font-size: 24px; font-weight: 600; color: var(--danger);">${uIns}</div>
      </div>
    </div>

    <!-- SECCIÓN SUBPRODUCTOS -->
    <h3 class="section-title" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">Subproductos <span style="text-transform: none; font-weight: 400;">· se producen por OP, sin reorden</span></h3>
    <div class="grid-cols-2" style="gap: 12px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Subproductos activos</div>
        <div style="font-size: 24px; font-weight: 600;">${subproductos.length}</div>
      </div>
      <div style="background: var(--success-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--success); margin-bottom: 6px;">Con existencia / sin existencia</div>
        <div style="font-size: 24px; font-weight: 600;"><span style="color:var(--success);">${subConStock}</span> / <span style="color:var(--danger);">${subSinStock}</span></div>
      </div>
    </div>

    <!-- SECCIÓN PAQUETES -->
    <h3 class="section-title" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">Paquetes (PT) <span style="text-transform: none; font-weight: 400;">· ingresan al inventario al terminar una OP</span></h3>
    <div class="grid-cols-2" style="gap: 12px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Paquetes en catálogo</div>
        <div style="font-size: 24px; font-weight: 600;">${productos.length}</div>
      </div>
      <div style="background: var(--success-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--success); margin-bottom: 6px;">Con stock / sin stock</div>
        <div style="font-size: 24px; font-weight: 600;"><span style="color:var(--success);">${ptConStock}</span> / <span style="color:var(--danger);">${ptSinStock}</span></div>
      </div>
    </div>

    <!-- SECCIÓN VALORIZACIÓN -->
    <h3 class="section-title" style="font-size: 11px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px; font-weight: 600;">Valorización de existencias</h3>
    <div class="grid-cols-4" style="gap: 12px; margin-bottom: 24px;">
      <div style="background: var(--info-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--info); margin-bottom: 6px;">Valor insumos</div>
        <div style="font-size: 18px; font-weight: 600; color: var(--info);">${money(valorIns)}</div>
      </div>
      <div style="background: var(--info-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--info); margin-bottom: 6px;">Valor subproductos</div>
        <div style="font-size: 18px; font-weight: 600; color: var(--info);">${money(valorSub)}</div>
      </div>
      <div style="background: var(--info-bg); border: 1px solid transparent; padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--info); margin-bottom: 6px;">Valor PT (stock)</div>
        <div style="font-size: 18px; font-weight: 600; color: var(--info);">${money(valorPT)}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--accent); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--accent); margin-bottom: 6px;">Valor total del inventario</div>
        <div style="font-size: 20px; font-weight: 700; color: var(--accent);">${money(valorTotal)}</div>
      </div>
    </div>

    <!-- ACTIVIDAD RECIENTE -->
    <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div style="padding: 14px 18px; border-bottom: 1px solid var(--border); background: var(--surface-2);">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          ${icono('clock','sm')} Actividad reciente
        </h3>
      </div>
      <div style="padding: 10px 0;">
        ${movimientos.length === 0 ? '<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">Sin actividad reciente.</div>' : movimientos.map(m => {
          const fecha = new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });

          // Identificar el nombre del ítem según la relación
          let itemName = 'Ítem';
          if (m.insumos) itemName = m.insumos.nombre;
          else if (m.subproducto_producciones?.subproductos) itemName = m.subproducto_producciones.subproductos.nombre;
          else if (m.lotes_pt) itemName = `PT (Lote ${m.lotes_pt.codigo_pt})`;

          let det = '';
          if (m.tipo === 'entrada') det = `<span style="color:var(--success);">+${num(m.cantidad)}</span> ${esc(itemName)}`;
          else if (m.tipo === 'salida') det = `<span style="color:var(--danger);">-${num(m.cantidad)}</span> ${esc(itemName)}`;
          else if (m.tipo === 'produccion_pt') det = `<span style="color:var(--info);">+${num(m.cantidad)}</span> Prod. ${esc(itemName)}`;
          else if (m.tipo === 'consumo') det = `<span style="color:var(--warning);">-${num(m.cantidad)}</span> Consumo ${esc(itemName)}`;
          else det = `<span style="font-weight:600;">${num(m.cantidad)}</span> ${esc(m.tipo)} ${esc(itemName)}`;

          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; border-bottom: 1px solid var(--border);">
              <div style="font-size: 13px;">${det}</div>
              <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${fecha}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Lógica para ocultar la alerta
  const btnCloseAlert = container.querySelector('#btn-close-alert');
  if (btnCloseAlert) {
    btnCloseAlert.onclick = () => {
      container.querySelector('#alert-banner').style.display = 'none';
    };
  }
}