import { SESSION_CODE_MAX_LENGTH, SESSION_CODE_MIN_LENGTH } from '../config';

const SESSION_CODE_RE = new RegExp(`^[A-Z0-9-]{${SESSION_CODE_MIN_LENGTH},${SESSION_CODE_MAX_LENGTH}}$`);

// Alfabeto senza caratteri ambigui (0/O, 1/I) per i codici generati automaticamente
const GENERATED_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GENERATED_CODE_LENGTH = 6;

// Normalizza il codice sessione mentre l'utente scrive: maiuscolo, solo lettere, numeri e trattino
export function sanitizeSessionCode(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, SESSION_CODE_MAX_LENGTH);
}

export function isValidSessionCode(value: string): boolean {
  return SESSION_CODE_RE.test(value);
}

export function generateSessionCode(random: () => number = Math.random): string {
  let result = '';
  for (let i = 0; i < GENERATED_CODE_LENGTH; i++) {
    result += GENERATED_CODE_ALPHABET.charAt(Math.floor(random() * GENERATED_CODE_ALPHABET.length));
  }
  return result;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

// Estrae il codice sessione da sushi-streak://join/ABC, https://.../join/ABC o ...?session=ABC
export function extractSessionCode(url: string): string | null {
  const pathMatch = url.match(/\/join\/([^/?#]+)/i);
  const queryMatch = url.match(/[?&]session=([^&#]+)/i);
  const raw = pathMatch?.[1] ?? queryMatch?.[1];
  if (!raw) return null;
  const code = sanitizeSessionCode(safeDecode(raw));
  return isValidSessionCode(code) ? code : null;
}
