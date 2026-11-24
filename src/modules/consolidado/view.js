import { esc, num, money } from '../../core/formatters.js';
import { icono } from '../../shared/ui/icons.js';
import { imprimirHTML } from '../../shared/ui/print.js';
import { exportarCSV } from '../../shared/ui/csv.js';

export function renderConsolidado(container, handlers) {
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - (hoy.getDay() || 7) + 1);
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);

  const defaultDesde = lunes.toISOString().slice(0, 10);
  const defaultHasta = viernes.toISOString().slice(0, 10);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Consolidado de Materias Primas</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Requerimiento total de insumos según las OPs programadas para una semana.</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-filtros-cons" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div class="panel-header" id="header-filtros-cons" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Filtros</h3>
        <button class="panel-toggle-btn" title="Expandir/Colapsar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Desde</label>
              <input type="date" id="cons-desde" value="${defaultDesde}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Hasta</label>
              <input type="date" id="cons-hasta" value="${defaultHasta}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            </div>
          </div>
          <div style="padding: 0 18px 18px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button data-rango="actual" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Semana actual</button>
            <button data-rango="siguiente" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Próxima semana</button>
            <button id="btn-generar-cons" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-left: auto;">Generar consolidado</button>
          </div>
        </div>
      </div>
    </div>

    <div id="cons-resultado">
      <div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px;">
        Elegí un rango y presioná "Generar consolidado".
      </div>
    </div>
  `;

  // Lógica UI
  const panel = container.querySelector('#panel-filtros-cons');
  const header = container.querySelector('#header-filtros-cons');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  const inpDesde = container.querySelector('#cons-desde');
  const inpHasta = container.querySelector('#cons-hasta');

  container.querySelectorAll('[data-rango]').forEach((btn) => {
    btn.onclick = () => {
      const hoy = new Date();
      const diaSemana = hoy.getDay() || 7;
      const lunesBase = new Date(hoy);
      lunesBase.setDate(hoy.getDate() - diaSemana + 1);

      const lunesTarget = new Date(lunesBase);
      if (btn.dataset.rango === 'siguiente') lunesTarget.setDate(lunesBase.getDate() + 7);

      const viernesTarget = new Date(lunesTarget);
      viernesTarget.setDate(lunesTarget.getDate() + 4);

      inpDesde.value = lunesTarget.toISOString().slice(0, 10);
      inpHasta.value = viernesTarget.toISOString().slice(0, 10);
    };
  });

  container.querySelector('#btn-generar-cons').onclick = () => {
    handlers.onGenerar(inpDesde.value, inpHasta.value);
  };
}

export function renderResultadoConsolidado(container, desde, hasta, data, onPrint) {
  const { resultado, totalOps } = data;
  const box = container.querySelector('#cons-resultado');

  let totalCostoCompra = 0;
  let insumosFaltantes = 0;

  const filas = resultado
    .map((r) => {
      const u = esc(r.ins.unidad_consumo);
      const colorFaltante = r.faltante > 0 ? 'var(--danger)' : 'var(--success)';

      if (r.faltante > 0) {
        insumosFaltantes++;
        totalCostoCompra += r.faltante * r.ins.costo_unitario;
      }

      return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; font-family: var(--font-mono); font-size: 11px;">${esc(r.ins.codigo)}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(r.ins.nombre)}</td>
        <td style="padding: 10px 12px; text-align: right;">${num(r.requerido)} ${u}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--text-secondary);">${num(r.stock)} ${u}</td>
        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: ${colorFaltante};">
          ${r.faltante > 0 ? num(r.faltante) + ' ' + u : '—'}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span class="badge ${r.faltante > 0 ? 'danger' : 'success'}">${r.faltante > 0 ? 'Comprar' : 'Cubierto'}</span>
        </td>
      </tr>
    `;
    })
    .join('');

  box.innerHTML = `
    <div class="grid-cols-3" style="gap: 16px; margin-bottom: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">OPs Analizadas</div>
        <div style="font-size: 24px; font-weight: 600;">${totalOps}</div>
      </div>
      <div style="background: var(--danger-bg); border: 1px solid var(--danger); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--danger); margin-bottom: 6px;">Insumos a Comprar</div>
        <div style="font-size: 24px; font-weight: 600; color: var(--danger);">${insumosFaltantes}</div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--accent); padding: 16px; border-radius: 12px;">
        <div style="font-size: 12px; color: var(--accent); margin-bottom: 6px;">Costo Estimado de Compra</div>
        <div style="font-size: 24px; font-weight: 700; color: var(--accent);">${money(totalCostoCompra)}</div>
      </div>
    </div>

    <div class="panel-collapsible" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Requerimiento de Materias Primas</h3>
        <div style="display: flex; gap: 8px;">
          <button id="btn-cons-export" class="secondary small" title="Descargar CSV" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
            ${icono('download', 'sm')} Exportar CSV
          </button>
          <button id="btn-cons-print" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            ${icono('printer', 'sm')} Imprimir PDF
          </button>
        </div>
      </div>
      
      <div style="overflow-x: auto;">
        <table id="tablaCons" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Código</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Insumo</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Requerido</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">En Stock</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">A Comprar</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: center;">Estado</th>
            </tr>
          </thead>
          <tbody>${resultado.length === 0 ? '<tr><td colspan="6" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay requerimientos pendientes.</td></tr>' : filas}</tbody>
        </table>
      </div>
    </div>
  `;

  // Botones
  box.querySelector('#btn-cons-export').onclick = () => {
    const headers = ['Código', 'Insumo', 'Requerido', 'En Stock', 'A Comprar', 'Estado'];
    const csvFilas = resultado.map((r) => [
      r.ins.codigo,
      r.ins.nombre,
      r.requerido,
      r.stock,
      r.faltante,
      r.faltante > 0 ? 'Comprar' : 'Cubierto',
    ]);
    exportarCSV(`consolidado_${desde}_al_${hasta}`, headers, csvFilas);
  };

  box.querySelector('#btn-cons-print').onclick = () => {
    onPrint(desde, hasta, resultado);
  };
}

export function imprimirConsolidado(desde, hasta, resultado) {
  let tabla =
    '<table class="print-table" style="width:100%; border-collapse:collapse; font-size:9.5pt; margin-top:15px;">';
  tabla += '<thead><tr>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#eee; text-align:left;">Código</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#eee; text-align:left;">Insumo</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#eee; text-align:right;">Requerido</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#eee; text-align:right;">En Stock</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#eee; text-align:right;">A Comprar</th>';
  tabla +=
    '<th style="border:1px solid #000; padding:6px; background:#eee; text-align:center;">Estado</th>';
  tabla += '</tr></thead><tbody>';

  resultado.forEach((r) => {
    const u = esc(r.ins.unidad_consumo);
    const txtFaltante = r.faltante > 0 ? `${num(r.faltante)} ${u}` : '—';
    const colorFaltante = r.faltante > 0 ? '#dc3545' : '#28a745';

    tabla += `<tr>
      <td style="border:1px solid #000; padding:6px; font-family:monospace;">${esc(r.ins.codigo)}</td>
      <td style="border:1px solid #000; padding:6px;">${esc(r.ins.nombre)}</td>
      <td style="border:1px solid #000; padding:6px; text-align:right;">${num(r.requerido)} ${u}</td>
      <td style="border:1px solid #000; padding:6px; text-align:right;">${num(r.stock)} ${u}</td>
      <td style="border:1px solid #000; padding:6px; text-align:right; font-weight:bold; color:${colorFaltante};">${txtFaltante}</td>
      <td style="border:1px solid #000; padding:6px; text-align:center;">${r.faltante > 0 ? 'Comprar' : 'Cubierto'}</td>
    </tr>`;
  });

  tabla += '</tbody></table>';

  const firmas = `
    <div class="print-signatures" style="grid-template-columns: 1fr 1fr; margin-top:60px;">
      <div class="print-signature"><div class="name">JEFE DE COMPRAS</div></div>
      <div class="print-signature"><div class="name">COORDINADOR DE PRODUCCIÓN</div></div>
    </div>
  `;

  const html = `
    <div style="font-family: Arial; color:#000;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1b75bb; padding-bottom:10px; margin-bottom:20px;">
        <div><h2 style="margin:0; color:#1b75bb;">AseptiQ</h2><div style="font-size:8pt;">Consolidado de Materias Primas</div></div>
        <div style="text-align:right; font-size:10pt;"><b>Semana del ${desde} al ${hasta}</b></div>
      </div>
      ${tabla}
      ${firmas}
    </div>
  `;

  const cssPrint = `@page { size: letter portrait; margin: 15mm; } body { padding: 0; } .print-table td { font-size: 9.5pt; }`;
  imprimirHTML(html, 'Consolidado Materias Primas', cssPrint);
}