import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { WebView } from 'react-native-webview';

type Props = {
  url: string;
  style?: StyleProp<ViewStyle>;
  muted?: boolean;
  cameraOff?: boolean;
  onReadyChange?: (ready: boolean) => void;
  loadingLabel?: string;
};

// RN WebView typings in this repo resolve props as `never`; keep runtime API.
const VideoWebView = WebView as unknown as React.ComponentType<any>;

const INJECTED_BRIDGE = `
(function() {
  function applyMedia(muted, cameraOff) {
    try {
      if (typeof APP !== 'undefined' && APP.conference) {
        if (typeof APP.conference.muteAudio === 'function') {
          APP.conference.muteAudio(!!muted);
        }
        if (typeof APP.conference.muteVideo === 'function') {
          APP.conference.muteVideo(!!cameraOff);
        }
      }
    } catch (e) {}
  }
  window.__medzoosApplyMedia = applyMedia;
  true;
})();
`;

async function ensureAndroidMediaPermissions() {
  if (Platform.OS !== 'android') return true;
  try {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Jitsi WebView for telehealth.
 * IMPORTANT: container must fill its parent with absolute positioning — flex:1
 * inside StyleSheet.absoluteFill parents collapses to 0 height on Android.
 */
export function TelehealthVideoWebView({
  url,
  style,
  muted = false,
  cameraOff = false,
  onReadyChange,
  loadingLabel = 'Connecting secure session…',
}: Props) {
  const webRef = useRef<any>(null);
  const [permissionsReady, setPermissionsReady] = useState(
    Platform.OS !== 'android',
  );
  const [pageReady, setPageReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await ensureAndroidMediaPermissions();
      if (!cancelled) setPermissionsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPageReady(false);
    setLoadError(null);
    onReadyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (!pageReady) return;
    const script = `
      (function() {
        try {
          if (typeof window.__medzoosApplyMedia === 'function') {
            window.__medzoosApplyMedia(${muted ? 'true' : 'false'}, ${
              cameraOff ? 'true' : 'false'
            });
          }
        } catch (e) {}
        true;
      })();
    `;
    webRef.current?.injectJavaScript?.(script);
  }, [muted, cameraOff, pageReady]);

  const markReady = () => {
    setPageReady(true);
    onReadyChange?.(true);
    webRef.current?.injectJavaScript?.(`
      (function() {
        try {
          if (typeof window.__medzoosApplyMedia === 'function') {
            window.__medzoosApplyMedia(${muted ? 'true' : 'false'}, ${
              cameraOff ? 'true' : 'false'
            });
          }
        } catch (e) {}
        true;
      })();
    `);
  };

  if (!url) return null;

  if (!permissionsReady) {
    return (
      <View style={[styles.host, style]}>
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>Allow camera & mic for video</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.host, style]}>
      <VideoWebView
        ref={webRef}
        source={{ uri: url }}
        style={styles.webview}
        allowsInlineMediaPlayback
        allowsFullscreenVideo
        allowsProtectedMedia
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mediaCapturePermissionGrantType="grant"
        mixedContentMode="always"
        androidLayerType="hardware"
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        scalesPageToFit
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        originWhitelist={['https://*', 'http://*']}
        injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE}
        onLoadEnd={markReady}
        onError={(event: { nativeEvent?: { description?: string } }) => {
          setLoadError(event?.nativeEvent?.description || 'Video failed to load');
          onReadyChange?.(false);
        }}
        onHttpError={(event: { nativeEvent?: { statusCode?: number } }) => {
          const code = event?.nativeEvent?.statusCode || 0;
          if (code >= 400) {
            setLoadError(`Video room error (${code})`);
          }
        }}
        onShouldStartLoadWithRequest={(request: { url?: string }) => {
          const u = request?.url || '';
          if (
            u.startsWith('intent:') ||
            u.startsWith('jitsi-meet:') ||
            u.startsWith('element:') ||
            u.startsWith('market:') ||
            u.includes('play.google.com') ||
            u.includes('apps.apple.com')
          ) {
            return false;
          }
          return true;
        }}
      />

      {!pageReady && !loadError ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#14B8A6" />
          <Text style={styles.loadingText}>{loadingLabel}</Text>
        </View>
      ) : null}

      {loadError ? (
        <View style={styles.overlay}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.loadingText}>Go back and reopen video to retry</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  webview: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(7, 20, 28, 0.92)',
    gap: 10,
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#14B8A6',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FCA5A5',
    textAlign: 'center',
  },
});
