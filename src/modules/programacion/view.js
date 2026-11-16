import { esc, num } from '../../core/formatters.js';

export function renderProgramacion(container, ordenes) {
  // 1. Calcular fechas de la semana actual (Lunes a Viernes)
  const hoy = new Date();
  const diaSemana = hoy.getDay() || 7;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - diaSemana + 1);

  const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const fechasSemana = [];

  for (let i = 0; i < 5; i++) {
    const d = new Date(lunes);
    d.setDate(lunes.getDate() + i);
    // Ajuste de zona horaria para que no reste un día
    const offset = d.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 10);

    fechasSemana.push({
      fechaStr: localISOTime,
      diaNombre: dias[i],
      diaNumero: d.getDate(),
      mes: d.toLocaleString('es-CO', { month: 'short' })
    });
  }

  // 2. Renderizar columnas
  const columnasHTML = fechasSemana.map(dia => {
    // Buscar OPs que caen en este día
    const opsDelDia = ordenes.filter(op => {
      const ini = op.fecha_programada;
      const fin = op.fecha_fin_programada || ini;
      return dia.fechaStr >= ini && dia.fechaStr <= fin;
    });

    const tarjetas = opsDelDia.map(op => {
      const fin = op.fecha_fin_programada || op.fecha_programada;
      let tarea = 'Continuar';
      if (dia.fechaStr === op.fecha_programada && dia.fechaStr === fin) tarea = 'Hacer';
      else if (dia.fechaStr === op.fecha_programada) tarea = 'Iniciar';
      else if (dia.fechaStr === fin) tarea = 'Terminar';

      const colorBorde = tarea === 'Iniciar' ? 'var(--info)' : (tarea === 'Terminar' ? 'var(--success)' : 'var(--accent)');

      return `
        <div style="background: var(--surface-2); border: 1px solid var(--border); border-left: 3px solid ${colorBorde}; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
          <div style="font-size: 11px; font-weight: bold; font-family: var(--font-mono); color: var(--accent); margin-bottom: 2px;">${esc(op.numero_op)}</div>
          <div style="font-size: 12px; font-weight: 500; line-height: 1.2; margin-bottom: 4px;">${esc(op.productos_terminados?.nombre || op.codigo_pt)}</div>
          <div style="font-size: 11px; color: var(--text-secondary);">${num(op.cantidad_proyectada)} u</div>
          <div style="font-size: 10px; margin-top: 4px; display: inline-block; background: var(--surface-3); padding: 2px 4px; border-radius: 4px;">${tarea}</div>
        </div>
      `;
    }).join('');

    return `
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 8px; min-height: 300px; display: flex; flex-direction: column;">
        <div style="padding: 10px; text-align: center; border-bottom: 1px solid var(--border); background: var(--surface-2); border-radius: 8px 8px 0 0;">
          <div style="font-weight: 600; font-size: 13px;">${dia.diaNombre}</div>
          <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">${dia.diaNumero} ${dia.mes}</div>
        </div>
        <div style="padding: 8px; flex: 1; overflow-y: auto;">
          ${opsDelDia.length === 0 ? '<div style="text-align:center; font-size:11px; color:var(--text-muted); margin-top:20px; font-style:italic;">Libre</div>' : tarjetas}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Programación Semanal</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Tablero Kanban de OPs para la semana actual.</p>

    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;">
      ${columnasHTML}
    </div>
  `;
}