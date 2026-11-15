import { describe, it, expect } from 'vitest';
import { esc, num, fmtCSV } from '../../src/core/formatters.js';

describe('formatters', () => {
  it('esc() debe escapar HTML', () => {
    expect(esc('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(esc(null)).toBe('');
  });

  it('num() debe formatear números', () => {
    expect(num(1500.5)).toBe('1.500,5');
    expect(num(null)).toBe('—');
  });

  it('fmtCSV() debe usar coma decimal', () => {
    expect(fmtCSV(1500.5)).toBe('1500,50');
    expect(fmtCSV(null)).toBe('');
  });
});