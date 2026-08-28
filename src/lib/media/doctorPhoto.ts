import { Alert, Platform } from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { api } from '../api/client';
import { getApiBaseUrl } from '../../config/api';

const MAX_BYTES = 8 * 1024 * 1024;

const PICKER_OPTIONS = {
  mediaType: 'photo' as const,
  selectionLimit: 1,
  quality: 0.8 as const,
  maxWidth: 1200,
  maxHeight: 1200,
  includeBase64: false,
  saveToPhotos: false,
  presentationStyle:
    Platform.OS === 'ios' ? ('fullScreen' as const) : undefined,
};

export function resolveMediaUrl(url?: string | null) {
  const value = url != null ? String(url).trim() : '';
  if (!value || value === 'null' || value === 'undefined') return null;
  if (
    value.startsWith('https://') ||
    value.startsWith('http://') ||
    value.startsWith('data:') ||
    value.startsWith('file:') ||
    value.startsWith('content:')
  ) {
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      const base = getApiBaseUrl().replace(/\/api\/?$/, '');
      try {
        const parsed = new URL(value);
        return `${base}${parsed.pathname}`;
      } catch {
        return value;
      }
    }
    return value;
  }
  if (value.startsWith('/')) {
    return `${getApiBaseUrl().replace(/\/api\/?$/, '')}${value}`;
  }
  return value;
}

function mapAsset(asset: Asset) {
  const uri = asset.uri || '';
  const rawName =
    asset.fileName || uri.split('/').pop() || `doctor-${Date.now()}.jpg`;
  const name = rawName.includes('.') ? rawName : `${rawName}.jpg`;
  return {
    uri,
    name,
    type: asset.type || 'image/jpeg',
  };
}

function assertNativePickerReady() {
  // Native module is null until the Android/iOS app is rebuilt after installing
  // react-native-image-picker. Metro reload alone is not enough.
  try {
    if (typeof launchImageLibrary !== 'function') {
      throw new Error('missing');
    }
  } catch {
    throw new Error(
      'Photo picker is not installed in this build. Rebuild the doctor app with npm run android.',
    );
  }
}

function parsePickerResult(result: ImagePickerResponse) {
  if (result.didCancel) return null;
  if (result.errorCode) {
    if (result.errorCode === 'permission') {
      throw new Error('Allow camera / photos access in phone settings, then try again.');
    }
    throw new Error(result.errorMessage || 'Could not open the camera or gallery.');
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) return null;
  if (asset.fileSize && asset.fileSize > MAX_BYTES) {
    throw new Error('Choose an image under 8 MB.');
  }
  return mapAsset(asset);
}

async function openGallery() {
  assertNativePickerReady();
  try {
    const result = await launchImageLibrary(PICKER_OPTIONS);
    return parsePickerResult(result);
  } catch (err: any) {
    const message = String(err?.message || err || '');
    if (
      message.includes('null') ||
      message.includes('undefined') ||
      message.includes('launchImageLibrary')
    ) {
      throw new Error(
        'Photo gallery needs a native rebuild. Run: npm run android',
      );
    }
    throw err;
  }
}

async function openCamera() {
  assertNativePickerReady();
  try {
    const result = await launchCamera({
      ...PICKER_OPTIONS,
      cameraType: 'front',
    });
    return parsePickerResult(result);
  } catch (err: any) {
    const message = String(err?.message || err || '');
    if (
      message.includes('null') ||
      message.includes('undefined') ||
      message.includes('launchCamera')
    ) {
      throw new Error(
        'Camera needs a native rebuild. Run: npm run android',
      );
    }
    throw err;
  }
}

/** Shows Camera / Gallery choices, then returns the picked file. */
export function pickDoctorPhoto(): Promise<{
  uri: string;
  name: string;
  type: string;
} | null> {
  return new Promise((resolve, reject) => {
    Alert.alert('Profile photo', 'Choose a source', [
      {
        text: 'Camera',
        onPress: () => {
          openCamera().then(resolve).catch(reject);
        },
      },
      {
        text: 'Gallery',
        onPress: () => {
          openGallery().then(resolve).catch(reject);
        },
      },
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(null),
      },
    ]);
  });
}

export async function uploadDoctorPhoto(file: {
  uri: string;
  name: string;
  type: string;
}) {
  const formData = new FormData();
  formData.append('image', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const data = await api.post<{ url?: string } | any>('/upload/image', formData);
  const url = data?.url || data?.data?.url;
  if (!url) throw new Error('Upload succeeded but no image URL was returned.');
  return String(url);
}
