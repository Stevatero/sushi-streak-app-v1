import Constants from 'expo-constants';

// Configurazione centralizzata dell'app.
// In sviluppo si può puntare a un backend locale creando un file .env con:
//   EXPO_PUBLIC_API_URL=http://<ip-del-pc>:3000
const DEFAULT_API_URL = 'https://sushi.dietalab.net';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

// Il link di invito punta sempre al dominio pubblico, così funziona anche fuori dalla rete locale
export const PUBLIC_URL = (process.env.EXPO_PUBLIC_PUBLIC_URL || DEFAULT_API_URL).replace(/\/+$/, '');

export const PRIVACY_POLICY_URL = `${PUBLIC_URL}/privacy`;

export type AppVariant = 'development' | 'preview' | 'production';

export const APP_VARIANT: AppVariant = (Constants.expoConfig?.extra?.appVariant as AppVariant) ?? 'production';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

export const REQUEST_TIMEOUT_MS = 15000;

// Regole condivise con il backend
export const SESSION_CODE_MAX_LENGTH = 20;
export const SESSION_CODE_MIN_LENGTH = 3;
export const PLAYER_NAME_MAX_LENGTH = 20;
export const RESTAURANT_NAME_MAX_LENGTH = 60;
