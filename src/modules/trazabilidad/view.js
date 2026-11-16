import { esc, num } from '../../core/formatters.js';

export function renderTrazabilidad(container) {
  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 20px; margin: 0 0 4px;">Trazabilidad INVIMA</h2>
        <p style="color: var(--text-secondary); font-size: 13px; margin: 0;">Rastrea el origen y destino de los lotes de principio a fin.</p>
      </div>
    </div>

    <div style="display: flex; gap: 6px; margin-bottom: 16px;">
      <button id="tab-forward" class="tab-btn active" style="background: var(--surface-3); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-primary); font-weight: 600;">⬅ ¿De dónde vino? (PT a Insumos)</button>
      <button id="tab-backward" class="tab-btn" style="background: transparent; border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-secondary);">➡ ¿A dónde fue? (Insumo a PT)</button>
    </div>

    <div id="trazabilidad-panel" style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 24px; min-height: 300px;">
      <!-- Panel dinámico -->
    </div>
  `;

  // Lógica de pestañas
  const btnFwd = container.querySelector('#tab-forward');
  const btnBwd = container.querySelector('#tab-backward');
  const panel = container.querySelector('#trazabilidad-panel');

  const setActiveTab = (isForward) => {
    if (isForward) {
      btnFwd.style.cssText = 'background: var(--surface-3); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-primary); font-weight: 600;';
      btnBwd.style.cssText = 'background: transparent; border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-secondary);';
    } else {
      btnBwd.style.cssText = 'background: var(--surface-3); border: 1px solid var(--border); padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-primary); font-weight: 600;';
      btnFwd.style.cssText = 'background: transparent; border: 1px solid transparent; padding: 8px 16px; border-radius: 8px; cursor: pointer; color: var(--text-secondary);';
    }
    panel.innerHTML = '';
  };

  btnFwd.onclick = () => setActiveTab(true);
  btnBwd.onclick = () => setActiveTab(false);
}

export function renderPanelForward(panel, lotesPT, onTrazar) {
  // Agrupar por codigo_pt
  const prodsUnicos = [...new Map(lotesPT.map(item => [item.codigo_pt, item])).values()];

  panel.innerHTML = `
    <h3 style="margin: 0 0 16px; font-size: 15px;">Rastrear Producto Terminado</h3>
    <div style="display: flex; gap: 12px; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Producto</label>
        <select id="fwd-pt" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="">— Seleccionar —</option>
          ${prodsUnicos.map(p => `<option value="${p.codigo_pt}">${esc(p.productos_terminados?.nombre)} (${esc(p.codigo_pt)})</option>`).join('')}
        </select>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote OP</label>
        <select id="fwd-lote-op" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;" disabled>
          <option value="">Selecciona Producto</option>
        </select>
      </div>
      <div style="flex: 1; min-width: 150px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote EO</label>
        <select id="fwd-lote-eo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;" disabled>
          <option value="">Selecciona Lote OP</option>
        </select>
      </div>
      <button id="btn-fwd-trazar" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; height: 39px;">Trazar</button>
    </div>
    <div id="fwd-resultado"></div>
  `;

  const selPT = panel.querySelector('#fwd-pt');
  const selOp = panel.querySelector('#fwd-lote-op');
  const selEo = panel.querySelector('#fwd-lote-eo');
  const res = panel.querySelector('#fwd-resultado');

  selPT.onchange = () => {
    const pt = selPT.value;
    selOp.innerHTML = '<option value="">— Seleccionar —</option>';
    selEo.innerHTML = '<option value="">— Seleccionar —</option>';
    selEo.disabled = true;

    if (!pt) { selOp.disabled = true; return; }

    const ops = [...new Set(lotesPT.filter(l => l.codigo_pt === pt).map(l => l.lote_op))];
    selOp.innerHTML += ops.map(op => `<option value="${op}">${op}</option>`).join('');
    selOp.disabled = false;
  };

  selOp.onchange = () => {
    const pt = selPT.value;
    const op = selOp.value;
    selEo.innerHTML = '<option value="">— Seleccionar —</option>';

    if (!op) { selEo.disabled = true; return; }

    const eos = lotesPT.filter(l => l.codigo_pt === pt && l.lote_op === op).map(l => l.lote_eo).filter(Boolean);
    if (eos.length === 0) {
      selEo.innerHTML = '<option value="">No tiene lote EO</option>';
      selEo.disabled = true;
    } else {
      selEo.innerHTML += eos.map(eo => `<option value="${eo}">${eo}</option>`).join('');
      selEo.disabled = false;
    }
  };

  panel.querySelector('#btn-fwd-trazar').onclick = async () => {
    if (!selPT.value || !selOp.value) return alert('Selecciona PT y Lote OP');
    res.innerHTML = '<div style="text-align:center; color:var(--text-muted);">Rastreando...</div>';

    try {
      const data = await onTrazar(selPT.value, selOp.value, selEo.value);
      renderResultadoForward(res, data, selPT.value, selOp.value, selEo.value);
    } catch (e) {
      res.innerHTML = `<div style="color:var(--danger)">Error: ${e.message}</div>`;
    }
  };
}

function renderResultadoForward(container, data, pt, op, eo) {
  if (data.error) {
    container.innerHTML = `<div style="color: var(--danger);">${data.error}</div>`;
    return;
  }

  const insumos = data.insumos || [];
  const subs = data.subproductos || [];

  const filas = insumos.map(i => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px;">${esc(i.insumo_nombre)} <span class="mono" style="color:var(--text-muted)">${esc(i.insumo_codigo)}</span></td>
      <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--accent); font-weight: 600;">${esc(i.lote)}</td>
      <td style="padding: 10px 12px; text-align: right;">${num(i.cantidad)}</td>
      <td style="padding: 10px 12px; color: var(--text-secondary);">${esc(i.proveedor || '—')}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="background: var(--surface-2); padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px 0;">Trazabilidad: ${pt} (OP: ${op} ${eo ? '| EO: ' + eo : ''})</h4>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">Se consumieron ${insumos.length} lotes de insumos y ${subs.length} subproductos.</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); text-align: left;">
          <th style="padding: 10px 12px; color: var(--text-secondary);">Insumo</th>
          <th style="padding: 10px 12px; color: var(--text-secondary);">Lote Utilizado</th>
          <th style="padding: 10px 12px; color: var(--text-secondary); text-align: right;">Cant. Usada</th>
          <th style="padding: 10px 12px; color: var(--text-secondary);">Proveedor</th>
        </tr>
      </thead>
      <tbody>${filas || '<tr><td colspan="4" style="text-align:center; padding:16px; color:var(--text-muted)">No hay consumos directos registrados (puede ser un PT sin receta).</td></tr>'}</tbody>
    </table>
  `;
}

export function renderPanelBackward(panel, insumos, onTrazar) {
  panel.innerHTML = `
    <h3 style="margin: 0 0 16px; font-size: 15px;">Rastrear Insumo</h3>
    <div style="display: flex; gap: 12px; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 250px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Insumo</label>
        <select id="bwd-insumo" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;">
          <option value="">— Seleccionar —</option>
          ${insumos.map(i => `<option value="${i.id}">${esc(i.nombre)} (${esc(i.codigo)})</option>`).join('')}
        </select>
      </div>
      <div style="flex: 1; min-width: 200px;">
        <label style="display: block; font-size: 12px; color: var(--text-secondary); margin-bottom: 6px;">Lote del Insumo</label>
        <select id="bwd-lote" style="width: 100%; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); padding: 10px; font-size: 13.5px;" disabled>
          <option value="">Selecciona Insumo</option>
        </select>
      </div>
      <button id="btn-bwd-trazar" style="background: var(--accent); color: var(--accent-ink); border: none; padding: 10px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; height: 39px;">Trazar</button>
    </div>
    <div id="bwd-resultado"></div>
  `;

  const selIns = panel.querySelector('#bwd-insumo');
  const selLote = panel.querySelector('#bwd-lote');
  const res = panel.querySelector('#bwd-resultado');

  selIns.onchange = () => {
    const id = selIns.value;
    selLote.innerHTML = '<option value="">— Seleccionar —</option>';
    if (!id) { selLote.disabled = true; return; }

    const ins = insumos.find(i => i.id === id);
    const lotes = ins.insumo_lotes || [];

    if (lotes.length === 0) {
      selLote.innerHTML = '<option value="">Sin lotes</option>';
      selLote.disabled = true;
    } else {
      selLote.innerHTML += lotes.map(l => `<option value="${l.lote}">${l.lote}</option>`).join('');
      selLote.disabled = false;
    }
  };

  panel.querySelector('#btn-bwd-trazar').onclick = async () => {
    if (!selIns.value || !selLote.value) return alert('Selecciona Insumo y Lote');
    res.innerHTML = '<div style="text-align:center; color:var(--text-muted);">Rastreando...</div>';

    try {
      const data = await onTrazar(selIns.value, selLote.value);
      renderResultadoBackward(res, data);
    } catch (e) {
      res.innerHTML = `<div style="color:var(--danger)">Error: ${e.message}</div>`;
    }
  };
}

function renderResultadoBackward(container, data) {
  if (data.error) {
    container.innerHTML = `<div style="color: var(--danger);">${data.error}</div>`;
    return;
  }

  const ops = data.ops_afectadas || [];

  const filas = ops.map(o => `
    <tr style="border-bottom: 1px solid var(--border);">
      <td style="padding: 10px 12px; font-family: var(--font-mono); font-weight: 600;">${esc(o.numero_op)}</td>
      <td style="padding: 10px 12px;">${esc(o.codigo_pt)}</td>
      <td style="padding: 10px 12px; font-family: var(--font-mono);">${esc(o.lote_op)}</td>
      <td style="padding: 10px 12px; font-family: var(--font-mono); color: var(--accent);">${esc(o.lote_eo || '—')}</td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div style="background: var(--surface-2); padding: 16px; border-radius: 8px; border: 1px solid var(--border); margin-bottom: 16px;">
      <h4 style="margin: 0 0 8px 0;">El lote ${data.lote} fue utilizado en ${ops.length} órdenes de producción.</h4>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 1px solid var(--border); text-align: left;">
          <th style="padding: 10px 12px; color: var(--text-secondary);">OP</th>
          <th style="padding: 10px 12px; color: var(--text-secondary);">Producto Terminado</th>
          <th style="padding: 10px 12px; color: var(--text-secondary);">Lote OP</th>
          <th style="padding: 10px 12px; color: var(--text-secondary);">Lote EO</th>
        </tr>
      </thead>
      <tbody>${filas || '<tr><td colspan="4" style="text-align:center; padding:16px; color:var(--text-muted)">Este lote no registra consumos en OPs.</td></tr>'}</tbody>
    </table>
  `;
}