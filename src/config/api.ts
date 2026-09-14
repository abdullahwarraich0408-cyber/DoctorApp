import { Platform } from 'react-native';

/**
 * Live Medzoos API — same URL as the website
 * (`Frontend/.env.local.example` → NEXT_PUBLIC_API_URL).
 * Verified: https://backend.medzoos.com/api/health
 */
export const PRODUCTION_API = 'https://backend.medzoos.com/api';

const LOCAL_API_PORT = 5001;
const LOCAL_ANDROID_USB = `http://127.0.0.1:${LOCAL_API_PORT}/api`;
const LOCAL_ANDROID_EMULATOR = `http://10.0.2.2:${LOCAL_API_PORT}/api`;
const LOCAL_IOS = `http://localhost:${LOCAL_API_PORT}/api`;

/**
 * Debug only: hit the PC backend.
 * Release / production builds (`__DEV__ === false`) always use PRODUCTION_API.
 * Flip to `false` in debug if you want Metro to talk to live as well.
 */
const USE_LOCAL_API_IN_DEV = true;

export const USE_LOCAL_API = __DEV__ && USE_LOCAL_API_IN_DEV;

export const ANDROID_CONNECTION: 'usb' | 'wifi' | 'emulator' = 'emulator';
export const LOCAL_DEV_HOST = '172.31.2.189';

export function getApiBaseUrl(): string {
  if (!USE_LOCAL_API) return PRODUCTION_API;
  if (Platform.OS === 'android') {
    if (ANDROID_CONNECTION === 'emulator') return LOCAL_ANDROID_EMULATOR;
    if (ANDROID_CONNECTION === 'usb') return LOCAL_ANDROID_USB;
    return `http://${LOCAL_DEV_HOST}:${LOCAL_API_PORT}/api`;
  }
  return LOCAL_IOS;
}

export function getSocketUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}

export function getApiConnectionLabel(): string {
  if (!USE_LOCAL_API) return `Production · ${PRODUCTION_API}`;
  return getApiBaseUrl();
}
