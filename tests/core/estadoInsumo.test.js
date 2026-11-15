import { describe, it, expect } from 'vitest';
import { estadoInsumo, peorEstado } from '../../src/core/estadoInsumo.js';

describe('estadoInsumo', () => {
  const config = { umbralUrgente: 30, umbralReorden: 60 };

  it('debe marcar Urgente si está por debajo del umbral urgente', () => {
    expect(estadoInsumo({ existencia_actual: 10, punto_reorden: 100 }, config)).toBe('Urgente');
  });

  it('debe marcar Reorden si está entre urgente y reorden', () => {
    expect(estadoInsumo({ existencia_actual: 50, punto_reorden: 100 }, config)).toBe('Reorden');
  });

  it('debe marcar Cubierto si supera el umbral de reorden', () => {
    expect(estadoInsumo({ existencia_actual: 80, punto_reorden: 100 }, config)).toBe('Cubierto');
  });

  it('peorEstado debe priorizar Urgente sobre todo', () => {
    expect(peorEstado(['Cubierto', 'Reorden', 'Urgente'])).toBe('Urgente');
  });
});