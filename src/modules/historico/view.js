import Chart from 'chart.js/auto';

export function renderHistorico(container, data) {
  container.innerHTML = `
    <h2 style="font-size: 20px; margin: 0 0 4px;">Histórico y Tendencias</h2>
    <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 24px;">Análisis visual del movimiento de inventario y producción.</p>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="font-size: 14px; margin: 0 0 16px;">Top 5 Insumos por Valor en Stock</h3>
        <div style="height: 250px;"><canvas id="chart-top-insumos"></canvas></div>
      </div>
      <div style="background: var(--surface-1); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
        <h3 style="font-size: 14px; margin: 0 0 16px;">Movimientos por Tipo</h3>
        <div style="height: 250px;"><canvas id="chart-movs"></canvas></div>
      </div>
    </div>
  `;

  // Configurar colores base
  const textColor = '#8d95a6';
  Chart.defaults.color = textColor;
  Chart.defaults.font.family = "'Space Grotesk', sans-serif";

  // 1. Gráfico Top Insumos
  const insumosOrdenados = data.insumos
    .filter(i => i.existencia_actual > 0 && i.costo_unitario > 0)
    .map(i => ({ nombre: i.nombre, valor: i.existencia_actual * i.costo_unitario }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  new Chart(container.querySelector('#chart-top-insumos'), {
    type: 'bar',
    data: {
      labels: insumosOrdenados.map(i => i.nombre),
      datasets: [{
        label: 'Valor Stock ($)',
        data: insumosOrdenados.map(i => i.valor),
        backgroundColor: '#ffb020',
        borderRadius: 4
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' }
  });

  // 2. Gráfico Movimientos por Tipo
  const conteo = { entrada: 0, salida: 0, consumo: 0 };
  data.movimientos.forEach(m => {
    if (conteo[m.tipo] !== undefined) conteo[m.tipo]++;
  });

  new Chart(container.querySelector('#chart-movs'), {
    type: 'doughnut',
    data: {
      labels: ['Entradas', 'Salidas (Ajustes)', 'Consumos (OP)'],
      datasets: [{
        data: [conteo.entrada, conteo.salida, conteo.consumo],
        backgroundColor: ['#3ddc84', '#ff5c5c', '#6ab7ff'],
        borderWidth: 0
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%' }
  });
}