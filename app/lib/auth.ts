export const AUTH_TOKEN_KEY = 'auth_token';

let tokenCache: string | null | undefined = undefined;
const supportsLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

function readTokenFromStorage(): string | null {
  if (!supportsLocalStorage) return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeToken(token: string) {
  tokenCache = token;
  if (supportsLocalStorage) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    (globalThis as any)[AUTH_TOKEN_KEY] = token;
  }
}

export function getToken(): string | null {
  if (tokenCache !== undefined) {
    return tokenCache ?? null;
  }

  const storedToken = readTokenFromStorage();
  if (storedToken) {
    tokenCache = storedToken;
    return storedToken;
  }

  const runtimeToken = (globalThis as any)[AUTH_TOKEN_KEY];
  tokenCache = runtimeToken ?? null;
  return tokenCache;
}

export function clearToken() {
  tokenCache = null;

  if (supportsLocalStorage) {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  try {
    delete (globalThis as any)[AUTH_TOKEN_KEY];
  } catch {
    (globalThis as any)[AUTH_TOKEN_KEY] = undefined;
  }
}
