import AsyncStorage from '@react-native-async-storage/async-storage';

const candidates = [
  'http://sushi.dietalab.net:3005',
  'http://57.131.31.119:3005',
  'https://sushi.dietalab.net'
];

const STORAGE_KEY = 'serverBaseUrl';

async function probe(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/api/sessions/nonexistent/info`, { method: 'GET' });
    return !!res;
  } catch {
    return false;
  }
}

export async function resolveServerUrl(): Promise<string> {
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  if (cached) return cached;
  for (const url of candidates) {
    const ok = await probe(url);
    if (ok) {
      await AsyncStorage.setItem(STORAGE_KEY, url);
      return url;
    }
  }
  return candidates[0];
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, url);
}
