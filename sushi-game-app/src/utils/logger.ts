// Logger centralizzato dell'app.
// - In sviluppo scrive in console con tutti i dettagli.
// - In produzione scrive solo avvisi ed errori e li inoltra a un eventuale reporter
//   (es. Sentry), registrabile con setErrorReporter senza toccare il resto del codice.

type Context = Record<string, unknown>;
export type ErrorReporter = (error: unknown, context?: Context) => void;

let reporter: ErrorReporter | null = null;

export function setErrorReporter(fn: ErrorReporter | null) {
  reporter = fn;
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return String(error);
}

export const logger = {
  debug(message: string, context?: Context) {
    if (__DEV__) console.log(`[debug] ${message}`, context ?? '');
  },
  info(message: string, context?: Context) {
    if (__DEV__) console.log(`[info] ${message}`, context ?? '');
  },
  warn(message: string, error?: unknown, context?: Context) {
    console.warn(`[warn] ${message}`, error !== undefined ? describe(error) : '', context ?? '');
  },
  error(message: string, error?: unknown, context?: Context) {
    console.error(`[error] ${message}`, error !== undefined ? describe(error) : '', context ?? '');
    try {
      reporter?.(error ?? new Error(message), { message, ...context });
    } catch {
      // Il reporting degli errori non deve mai interrompere l'app
    }
  },
};
