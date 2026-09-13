import { Platform } from 'react-native';

const PRODUCTION_API = 'https://backend.medzoos.com/api';
const LOCAL_ANDROID_USB = 'http://127.0.0.1:5001/api';
const LOCAL_ANDROID_EMULATOR = 'http://10.0.2.2:5001/api';
const LOCAL_IOS = 'http://localhost:5001/api';

/** Match medzoos backend: true = PC backend on :5001 */
export const USE_LOCAL_API = true;
export const ANDROID_CONNECTION: 'usb' | 'wifi' | 'emulator' = 'emulator';
export const LOCAL_DEV_HOST = '172.31.2.189';

export function getApiBaseUrl(): string {
  if (!USE_LOCAL_API) return PRODUCTION_API;
  if (Platform.OS === 'android') {
    if (ANDROID_CONNECTION === 'emulator') return LOCAL_ANDROID_EMULATOR;
    if (ANDROID_CONNECTION === 'usb') return LOCAL_ANDROID_USB;
    return `http://${LOCAL_DEV_HOST}:5001/api`;
  }
  return LOCAL_IOS;
}

export function getSocketUrl(): string {
  return getApiBaseUrl().replace(/\/api\/?$/, '');
}
