import { esc, num } from '../../core/formatters.js';
import { toast } from '../../shared/ui/toast.js';
import { abrirModal, cerrarModal } from '../../shared/ui/modal.js';
import { icono } from '../../shared/ui/icons.js';

export function renderProduccion(container, data, handlers) {
  const { movimientos } = data;

  const filas = movimientos
    .map((m) => {
      const sub = m.subproducto_producciones?.subproductos;
      const fecha = new Date(m.fecha).toLocaleString('es-CO', {
        dateStyle: 'short',
        timeStyle: 'short',
      });
      return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${fecha}</td>
        <td style="padding: 10px 12px; font-weight: 500;">${esc(sub?.nombre || '—')} <span class="mono" style="font-size:11px; color:var(--text-muted);">${esc(sub?.codigo || '')}</span></td>
        <td style="padding: 10px 12px; text-align: right; color: var(--success); font-weight: 600;">+${num(m.cantidad)} u</td>
        <td style="padding: 10px 12px; color: var(--text-secondary); font-size: 12px;">${esc(m.observaciones || '—')}</td>
      </tr>
    `;
    })
    .join('');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Producción Interna</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Fabrica subproductos por adelantado. El sistema descontará los insumos (FIFO).</p>
      </div>
    </div>

    <div class="panel-collapsible" id="panel-prod" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; overflow: hidden;">
      <div class="panel-header" id="header-prod" style="padding: 14px 18px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; cursor: pointer;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <h3 style="margin: 0; font-size: 14px; font-weight: 600;">Historial de Producción</h3>
          <span class="badge" style="font-size: 11px; background: var(--info); color: #fff; padding: 3px 8px; border-radius: 4px; font-weight: 600;">${movimientos.length} registros</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="btn-refresh-prod" title="Actualizar historial" style="background: transparent; border: 1px solid var(--border); color: var(--text-secondary); width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">
            ${icono('clock', 'sm')}
          </button>
          <button id="btn-nuevo-prod" class="btn-add" title="Registrar nueva producción" style="background: var(--accent); color: var(--accent-ink); border: none; width: 30px; height: 30px; border-radius: 8px; font-size: 18px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center;" onclick="event.stopPropagation();">+</button>
          <button class="panel-toggle-btn" title="Expandir/Colapsar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
          </button>
        </div>
      </div>
      
      <div class="panel-body-wrapper">
        <div class="panel-body-inner">
          <div style="overflow-x: auto;">
            <table id="tablaProd" class="responsive-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border); text-align: left; background: var(--surface-2);">
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Fecha</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Subproducto</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500; text-align: right;">Cantidad</th>
                  <th style="padding: 12px; color: var(--text-secondary); font-weight: 500;">Motivo</th>
                </tr>
              </thead>
              <tbody>${movimientos.length === 0 ? '<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-muted);">No hay producciones registradas.</td></tr>' : filas}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  // Lógica del acordeón
  const panel = container.querySelector('#panel-prod');
  const header = container.querySelector('#header-prod');
  header.onclick = (e) => {
    if (e.target.closest('button') && !e.target.closest('.panel-toggle-btn')) return;
    panel.classList.toggle('collapsed');
  };

  // Eventos de botones
  container.querySelector('#btn-nuevo-prod').onclick = () => handlers.onNuevo(data.subproductos);
  container.querySelector('#btn-refresh-prod').onclick = (e) => {
    const btn = e.currentTarget;
    btn.style.transform = 'rotate(360deg)';
    btn.style.transition = 'transform 0.5s ease';
    setTimeout(() => {
      btn.style.transform = 'rotate(0deg)';
      btn.style.transition = 'none';
    }, 500);
    handlers.onRefrescar();
  };
}

export function abrirModalProduccion(subproductos, onSave) {
  const opciones = subproductos
    .map(
      (s) =>
        `<option value="${s.id}">${esc(s.nombre)} (Stock: ${num(s.existencia_actual)})</option>`
    )
    .join('');

  abrirModal({
    title: 'Registrar Producción Interna',
    subtitle: 'El sistema consumirá los insumos de la receta bajo la regla FIFO.',
    icon: icono('wrench', 'lg'),
    size: 'md',
    body: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Subproducto a Producir</label>
          <select id="prod-sub" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
            <option value="">— Seleccionar —</option>
            ${opciones}
          </select>
        </div>

        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Cantidad a Producir</label>
          <input type="number" id="prod-cant" step="0.0001" placeholder="0" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>

        <div>
          <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Motivo / Observación (Opcional)</label>
          <input type="text" id="prod-motivo" placeholder="Ej: Stock de seguridad" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px;">
        </div>
      </div>
    `,
    footer: `
      <button id="btn-cancel" style="background: transparent; border: 1px solid var(--border); color: var(--text-primary); padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cancelar</button>
      <button id="btn-save" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer;">Ejecutar Producción</button>
    `,
    onOpen: (overlay) => {
      overlay.querySelector('#btn-cancel').onclick = () => cerrarModal();

      overlay.querySelector('#btn-save').onclick = async () => {
        const subId = overlay.querySelector('#prod-sub').value;
        const cant = parseFloat(overlay.querySelector('#prod-cant').value);
        const motivo = overlay.querySelector('#prod-motivo').value.trim();

        if (!subId || !cant || cant <= 0) {
          return toast('Selecciona un subproducto y una cantidad válida.', 'error');
        }

        const btn = overlay.querySelector('#btn-save');
        btn.disabled = true;
        btn.textContent = 'Produciendo...';

        try {
          await onSave(subId, cant, motivo);
          cerrarModal();
        } catch (err) {
          toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'Ejecutar Producción';
        }
      };
    },
  });
}