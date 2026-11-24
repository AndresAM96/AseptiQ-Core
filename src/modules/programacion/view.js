import { esc, num } from '../../core/formatters.js';
import { icono } from '../../shared/ui/icons.js';
import { imprimirHTML } from '../../shared/ui/print.js';

export function renderProgramacion(container, handlers) {
  const hoy = new Date();
  const diaSemana = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diaSemana + 1);
  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);

  const defaultDesde = lunes.toISOString().slice(0, 10);
  const defaultHasta = viernes.toISOString().slice(0, 10);

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Programación Semanal</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Planificación de tareas por día y resumen de entregas.</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-prog" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
      <div class="panel-header" id="header-prog" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Semana a programar</h3>
        <button class="panel-toggle-btn" title="Expandir/Colapsar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
        </button>
      </div>
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="padding: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Desde (Lunes)</label>
              <input type="date" id="prog-desde" value="${defaultDesde}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            </div>
            <div>
              <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Hasta (Viernes)</label>
              <input type="date" id="prog-hasta" value="${defaultHasta}" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            </div>
          </div>
          <div style="padding: 0 18px 18px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <button data-rango="anterior" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">← Semana anterior</button>
            <button data-rango="actual" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Semana actual</button>
            <button data-rango="siguiente" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Semana siguiente →</button>
            <button id="btn-generar-prog" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; margin-left: auto;">Generar programación</button>
            <button id="btn-print-prog" style="background: var(--surface-3); border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; display: none; align-items: center; gap: 6px;">
              ${icono('printer', 'sm')} Imprimir PDF
            </button>
          </div>
        </div>
      </div>
    </div>

    <div id="prog-resultado">
      <div style="text-align: center; color: var(--text-muted); padding: 40px; font-size: 13px;">
        Elegí la semana y presioná "Generar programación".
      </div>
    </div>
  `;

  // Lógica de UI
  const panel = container.querySelector('#panel-prog');
  const header = container.querySelector('#header-prog');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  const inpDesde = container.querySelector('#prog-desde');
  const inpHasta = container.querySelector('#prog-hasta');

  container.querySelectorAll('[data-rango]').forEach((btn) => {
    btn.onclick = () => {
      const hoy = new Date();
      const diaSemana = hoy.getDay() || 7;
      const lunesBase = new Date(hoy);
      lunesBase.setDate(hoy.getDate() - diaSemana + 1);

      const lunesTarget = new Date(lunesBase);
      if (btn.dataset.rango === 'anterior') lunesTarget.setDate(lunesBase.getDate() - 7);
      else if (btn.dataset.rango === 'siguiente') lunesTarget.setDate(lunesBase.getDate() + 7);

      const viernesTarget = new Date(lunesTarget);
      viernesTarget.setDate(lunesTarget.getDate() + 4);

      inpDesde.value = lunesTarget.toISOString().slice(0, 10);
      inpHasta.value = viernesTarget.toISOString().slice(0, 10);
    };
  });

  container.querySelector('#btn-generar-prog').onclick = () => {
    handlers.onGenerar(inpDesde.value, inpHasta.value);
  };
}

export function renderResultadoProgramacion(container, desde, hasta, data, onPrint) {
  const { ordenes, entregas } = data;
  const resultado = container.querySelector('#prog-resultado');

  // Calcular días (Lunes a Viernes)
  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const fechas = [];
  const base = new Date(desde + 'T12:00:00');
  for (let i = 0; i < 5; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    fechas.push(d);
  }

  // Armar columnas
  const columnas = fechas
    .map((fecha, idx) => {
      const fechaStr = fecha.toISOString().slice(0, 10);

      // Filtrar OPs para este día
      const opsDia = ordenes.filter((o) => {
        const ini = o.fecha_programada;
        const fin = o.fecha_fin_programada || o.fecha_programada;
        return ini && fechaStr >= ini && fechaStr <= fin;
      });

      const tarjetas = opsDia
        .map((o) => {
          const fin = o.fecha_fin_programada || o.fecha_programada;
          let tarea = 'Continuar';
          if (fechaStr === o.fecha_programada && fechaStr === fin) tarea = 'Hacer';
          else if (fechaStr === o.fecha_programada) tarea = 'Iniciar';
          else if (fechaStr === fin) tarea = 'Terminar';

          const color =
            tarea === 'Iniciar'
              ? 'var(--info)'
              : tarea === 'Terminar'
                ? 'var(--success)'
                : 'var(--accent)';

          return `
        <div style="background: var(--surface-2); border: 1px solid var(--border); border-left: 3px solid ${color}; border-radius: 6px; padding: 10px; margin-bottom: 8px;">
          <div style="font-size: 11px; font-weight: bold; font-family: var(--font-mono); color: var(--accent); margin-bottom: 4px;">${esc(o.numero_op)}</div>
          <div style="font-size: 12px; font-weight: 500; line-height: 1.2; margin-bottom: 4px;">${esc(o.productos_terminados?.nombre || o.codigo_pt)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${num(o.cantidad_proyectada)} u</div>
          <div style="font-size: 10px; margin-top: 6px; display: inline-block; background: var(--surface-3); padding: 2px 6px; border-radius: 4px; font-weight: 600;">${tarea}</div>
        </div>
      `;
        })
        .join('');

      return `
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; display: flex; flex-direction: column; min-height: 200px;">
        <div style="padding: 12px 10px; text-align: center; border-bottom: 1px solid var(--border); background: var(--surface-2); border-radius: 8px 8px 0 0;">
          <div style="font-weight: 600; font-size: 13px;">${dias[idx]}</div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</div>
        </div>
        <div style="padding: 10px; flex: 1; overflow-y: auto;">
          ${opsDia.length === 0 ? '<div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:20px; font-style:italic;">Libre</div>' : tarjetas}
        </div>
      </div>
    `;
    })
    .join('');

  // Armar tabla de entregas
  const filasEntregas = entregas
    .map((e) => {
      const fecha = new Date(e.fecha).toLocaleString('es-CO', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const op = e.ordenes_semanales ? e.ordenes_semanales.numero_op : '—';
      const prod = e.ordenes_semanales?.productos_terminados
        ? e.ordenes_semanales.productos_terminados.nombre
        : '—';
      return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${fecha}</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(op)}</td>
        <td style="padding: 10px 12px;">${esc(prod)}</td>
        <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">+${num(e.cantidad)} u</td>
        <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(e.lote_entrega || '—')}</td>
      </tr>
    `;
    })
    .join('');

  resultado.innerHTML = `
    <div class="grid-cols-5" style="gap: 12px; margin-bottom: 24px;">
      ${columnas}
    </div>

    <div class="panel-collapsible" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border);">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Resumen de Entregas de la Semana</h3>
      </div>
      <div style="overflow-x: auto;">
        <table class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">OP</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Producto</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cantidad</th>
              <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Lote</th>
            </tr>
          </thead>
          <tbody>${entregas.length === 0 ? '<tr><td colspan="5" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay entregas registradas en esta semana.</td></tr>' : filasEntregas}</tbody>
        </table>
      </div>
    </div>
  `;

  // Mostrar botón de impresión y conectar
  const btnPrint = container.querySelector('#btn-print-prog');
  btnPrint.style.display = 'inline-flex';
  btnPrint.onclick = () => onPrint(desde, hasta, dias, fechas, ordenes, entregas);
}

export function imprimirProgramacion(desde, hasta, dias, fechas, ordenes, entregas) {
  const fDesde = fechas[0];
  const fHasta = fechas[4];
  const meses = [
    'ENERO',
    'FEBRERO',
    'MARZO',
    'ABRIL',
    'MAYO',
    'JUNIO',
    'JULIO',
    'AGOSTO',
    'SEPTIEMBRE',
    'OCTUBRE',
    'NOVIEMBRE',
    'DICIEMBRE',
  ];

  let tituloSemana = '';
  if (fDesde.getMonth() === fHasta.getMonth()) {
    tituloSemana = `SEMANA ${fDesde.getDate()} AL ${fHasta.getDate()} DE ${meses[fDesde.getMonth()]}`;
  } else {
    tituloSemana = `SEMANA ${fDesde.getDate()} DE ${meses[fDesde.getMonth()]} AL ${fHasta.getDate()} DE ${meses[fHasta.getMonth()]}`;
  }

  let tabla =
    '<table class="print-table" style="width:100%; border-collapse:collapse; font-size:9.5pt; margin-top:20px;">';
  tabla +=
    '<thead><tr><th style="width:20%; border:1px solid #000; padding:8px; background:#eee;">DÍA</th><th style="border:1px solid #000; padding:8px; background:#eee;">TAREAS POR EJECUTAR</th></tr></thead><tbody>';

  fechas.forEach((fecha, idx) => {
    const fechaStr = fecha.toISOString().slice(0, 10);
    const opsDia = ordenes.filter((o) => {
      const ini = o.fecha_programada;
      const fin = o.fecha_fin_programada || o.fecha_programada;
      return ini && fechaStr >= ini && fechaStr <= fin;
    });

    const nombreDia = dias[idx];
    const labelFecha = `${nombreDia} ${fecha.getDate()} de ${meses[fecha.getMonth()].toLowerCase()}`;

    tabla += `<tr><td style="border:1px solid #000; padding:8px; font-weight:bold; vertical-align:top;">${labelFecha}</td><td style="border:1px solid #000; padding:8px; vertical-align:top; line-height:1.5;">`;

    if (opsDia.length === 0) {
      tabla += '<span style="color:#999; font-style:italic;">—</span>';
    } else {
      opsDia.forEach((o) => {
        const numOP = o.numero_op || 'S/N';
        const prod = o.productos_terminados ? o.productos_terminados.nombre : o.codigo_pt;
        const cant = o.cantidad_proyectada;
        const fin = o.fecha_fin_programada || o.fecha_programada;

        let tarea = 'Continuar';
        if (fechaStr === o.fecha_programada && fechaStr === fin) tarea = 'Hacer';
        else if (fechaStr === o.fecha_programada) tarea = 'Iniciar';
        else if (fechaStr === fin) tarea = 'Terminar';

        tabla += `<div style="margin-bottom:6px;"><b>${esc(numOP)}:</b> ${tarea} ${num(cant)} ${esc(prod)}</div>`;
      });
    }
    tabla += `</td></tr>`;
  });

  // Entregas
  tabla += `<tr><td colspan="2" style="border:1px solid #000; padding:0;"><table style="width:100%; border-collapse:collapse;"><tr><td colspan="2" style="background:#eee; border-bottom:1px solid #000; padding:6px 8px; font-weight:bold; text-align:center;">FECHAS DE ENTREGA DE PRODUCTOS</td></tr>`;

  const entregasPorDia = {};
  entregas.forEach((e) => {
    const d = new Date(e.fecha);
    const idx = fechas.findIndex(
      (f) => f.toISOString().slice(0, 10) === d.toISOString().slice(0, 10)
    );
    if (idx !== -1) {
      if (!entregasPorDia[idx]) entregasPorDia[idx] = [];
      entregasPorDia[idx].push(e);
    }
  });

  let hayEntregas = false;
  fechas.forEach((fecha, idx) => {
    if (entregasPorDia[idx] && entregasPorDia[idx].length > 0) {
      hayEntregas = true;
      const txtEntregas = entregasPorDia[idx]
        .map((e) => {
          const prod = e.ordenes_semanales?.productos_terminados
            ? e.ordenes_semanales.productos_terminados.nombre
            : 'Producto';
          return `${num(e.cantidad)} ${esc(prod)}`;
        })
        .join(', ');

      tabla += `<tr><td style="border-bottom:1px solid #000; border-right:1px solid #000; padding:6px 8px; font-weight:bold; width:20%;">${dias[idx].toUpperCase()}:</td><td style="border-bottom:1px solid #000; padding:6px 8px;">${txtEntregas}</td></tr>`;
    }
  });

  if (!hayEntregas) {
    tabla += `<tr><td colspan="2" style="padding:10px; text-align:center; color:#666;">No hay entregas programadas.</td></tr>`;
  }
  tabla += `</table></td></tr></tbody></table>`;

  const firmas = `
    <div class="print-signatures" style="grid-template-columns: 1fr 1fr 1fr; margin-top:60px;">
      <div class="print-signature"><div class="name">JEFE DE PRODUCCIÓN</div></div>
      <div class="print-signature"><div class="name">JEFE DE LOGÍSTICA</div></div>
      <div class="print-signature"><div class="name">GERENTE DE OPERACIONES</div></div>
    </div>
  `;

  const html = `
    <div style="font-family: Arial; color:#000;">
      <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1b75bb; padding-bottom:10px; margin-bottom:20px;">
        <div><h2 style="margin:0; color:#1b75bb;">AseptiQ</h2><div style="font-size:8pt;">Programación Semanal</div></div>
        <div style="text-align:right; font-size:10pt;"><b>${tituloSemana}</b></div>
      </div>
      ${tabla}
      ${firmas}
    </div>
  `;

  const cssPrint = `@page { size: letter portrait; margin: 15mm; } body { padding: 0; } .print-table td { font-size: 9.5pt; }`;
  imprimirHTML(html, 'Programacion Semanal', cssPrint);
}
