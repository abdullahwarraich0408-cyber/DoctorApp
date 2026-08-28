import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'doctor_access_token';
const REFRESH_KEY = 'doctor_refresh_token';
const ROLE_KEY = 'doctor_role';
const PROFILE_KEY = 'doctor_partner';

export type PartnerProfile = {
  id?: string;
  name?: string;
  email?: string;
  specialty?: string;
  photo_url?: string;
  [key: string]: unknown;
};

type Session = {
  accessToken: string | null;
  refreshToken: string | null;
  role: string | null;
  partner: PartnerProfile | null;
};

let memory: Session = {
  accessToken: null,
  refreshToken: null,
  role: null,
  partner: null,
};

export function getAccessToken() {
  return memory.accessToken;
}

export function getRefreshToken() {
  return memory.refreshToken;
}

export function getPartner() {
  return memory.partner;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      },
    );
  });
}

async function readItem(key: string) {
  return withTimeout(AsyncStorage.getItem(key), 800, null);
}

export async function hydrateSession(): Promise<Session> {
  const [accessToken, refreshToken, role, raw] = await Promise.all([
    readItem(TOKEN_KEY),
    readItem(REFRESH_KEY),
    readItem(ROLE_KEY),
    readItem(PROFILE_KEY),
  ]);
  let partner: PartnerProfile | null = null;
  try {
    partner = raw ? JSON.parse(raw) : null;
  } catch {
    partner = null;
  }
  memory = { accessToken, refreshToken, role, partner };
  return memory;
}

export async function setSession(input: {
  tokens?: { accessToken?: string; refreshToken?: string };
  role?: string;
  partner?: PartnerProfile | null;
}) {
  try {
    if (input.tokens?.accessToken) {
      memory.accessToken = input.tokens.accessToken;
      await AsyncStorage.setItem(TOKEN_KEY, input.tokens.accessToken);
    }
    if (input.tokens?.refreshToken) {
      memory.refreshToken = input.tokens.refreshToken;
      await AsyncStorage.setItem(REFRESH_KEY, input.tokens.refreshToken);
    }
    if (input.role) {
      memory.role = input.role;
      await AsyncStorage.setItem(ROLE_KEY, input.role);
    }
    if (input.partner !== undefined) {
      memory.partner = input.partner;
      if (input.partner) {
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(input.partner));
      } else {
        await AsyncStorage.removeItem(PROFILE_KEY);
      }
    }
  } catch {
    // Keep the in-memory session even if device storage is unavailable.
  }
}

export async function clearSession() {
  memory = { accessToken: null, refreshToken: null, role: null, partner: null };
  const keys = [TOKEN_KEY, REFRESH_KEY, ROLE_KEY, PROFILE_KEY];
  try {
    if (typeof AsyncStorage.removeMany === 'function') {
      await AsyncStorage.removeMany(keys);
    } else {
      await Promise.all(keys.map(key => AsyncStorage.removeItem(key)));
    }
  } catch {
    // Ignore storage failures so logout/boot cannot hang.
  }
}

export function isDoctorSession() {
  return Boolean(memory.accessToken && memory.role === 'doctor');
}
