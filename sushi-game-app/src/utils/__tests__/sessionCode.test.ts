import { extractSessionCode, generateSessionCode, isValidSessionCode, sanitizeSessionCode } from '../sessionCode';

describe('sanitizeSessionCode', () => {
  it('converte in maiuscolo, sostituisce gli spazi e rimuove i caratteri non ammessi', () => {
    expect(sanitizeSessionCode('cena da mario!')).toBe('CENA-DA-MARIO');
    expect(sanitizeSessionCode('àbc<script>')).toBe('BCSCRIPT');
  });

  it('tronca alla lunghezza massima consentita dal backend', () => {
    expect(sanitizeSessionCode('a'.repeat(40))).toHaveLength(20);
  });
});

describe('isValidSessionCode', () => {
  it.each([
    ['ABC', true],
    ['CENA-2026', true],
    ['AB', false],
    ['abc', false],
    ['A B C', false],
    ['A'.repeat(21), false],
  ])('%s -> %s', (code, expected) => {
    expect(isValidSessionCode(code)).toBe(expected);
  });
});

describe('generateSessionCode', () => {
  it('genera codici validi senza caratteri ambigui', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateSessionCode();
      expect(isValidSessionCode(code)).toBe(true);
      expect(code).not.toMatch(/[01OI]/);
    }
  });
});

describe('extractSessionCode', () => {
  it.each([
    ['sushi-streak://join/abc123', 'ABC123'],
    ['https://sushi.dietalab.net/join/CENA-1?utm=x', 'CENA-1'],
    ['https://sushi.dietalab.net/?session=xyz9', 'XYZ9'],
    ['https://sushi.dietalab.net/join/%E0%A4%A', 'E0A4A'], // percent-encoding malformato: nessuna eccezione
    ['https://sushi.dietalab.net/join/ab', null],
    ['https://sushi.dietalab.net/', null],
  ])('%s -> %s', (url, expected) => {
    expect(extractSessionCode(url)).toBe(expected);
  });
});
