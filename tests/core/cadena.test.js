import { describe, it, expect } from 'vitest';
import { getCadena, unidadCompra, unidadConsumo, factorTotal } from '../../src/core/cadena.js';

describe('cadena de conversiones', () => {
  const insumoSimple = { unidad_medida: 'u', conversiones: [] };
  const insumoComplejo = {
    unidad_medida: 'caja',
    conversiones: [
      { unidad: 'caja', factor: 12 },
      { unidad: 'u', factor: 1 }
    ]
  };

  it('debe manejar insumos simples', () => {
    expect(unidadCompra(insumoSimple)).toBe('u');
    expect(unidadConsumo(insumoSimple)).toBe('u');
    expect(factorTotal(insumoSimple)).toBe(1);
  });

  it('debe calcular el factor total en cadenas complejas', () => {
    expect(unidadCompra(insumoComplejo)).toBe('caja');
    expect(unidadConsumo(insumoComplejo)).toBe('u');
    expect(factorTotal(insumoComplejo)).toBe(12);
  });
});