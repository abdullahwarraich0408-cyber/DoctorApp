/**
 * Public meet host.
 * meet.jit.si REQUIRES a separate Google/GitHub/Facebook login for the room
 * moderator — that cannot use Medzoos credentials. meet.element.io joins with
 * the display name from the logged-in Medzoos session (no second login).
 */
export const JITSI_MEET_HOST = 'https://meet.element.io';

/**
 * Hide Jitsi / Element Meet native chrome so DoctorApp owns
 * header + mic/camera/end overlays (avoids double trays).
 */
const JITSI_APP_OWNED_CHROME_PARAMS = [
  'config.prejoinPageEnabled=false',
  'config.prejoinConfig.enabled=false',
  'config.requireDisplayName=false',
  'config.disableDeepLinking=true',
  'config.disableInviteFunctions=true',
  'config.startWithAudioMuted=false',
  'config.startWithVideoMuted=false',
  'config.hideConferenceSubject=true',
  'config.hideConferenceTimer=true',
  'config.disableModeratorIndicator=true',
  'config.toolbarButtons=[]',
  'config.buttonsWithNotifyClick=[]',
  'config.toolbarConfig.alwaysVisible=false',
  'config.toolbarConfig.timeout=1',
  'config.toolbarConfig.initialTimeout=1',
  'config.notifications=[]',
  'config.disabledNotifications=["notify.chatMessages","notify.participantJoined","notify.participantLeft"]',
  'interfaceConfig.TOOLBAR_BUTTONS=[]',
  'interfaceConfig.TOOLBAR_ALWAYS_VISIBLE=false',
  'interfaceConfig.INITIAL_TOOLBAR_TIMEOUT=1',
  'interfaceConfig.TOOLBAR_TIMEOUT=1',
  'interfaceConfig.SHOW_JITSI_WATERMARK=false',
  'interfaceConfig.SHOW_WATERMARK_FOR_GUESTS=false',
  'interfaceConfig.SHOW_BRAND_WATERMARK=false',
  'interfaceConfig.MOBILE_APP_PROMO=false',
  'interfaceConfig.HIDE_INVITE_MORE_HEADER=true',
  'interfaceConfig.DISABLE_JOIN_LEAVE_NOTIFICATIONS=true',
  'interfaceConfig.DISABLE_FOCUS_INDICATOR=true',
  'interfaceConfig.DISPLAY_WELCOME_PAGE_CONTENT=false',
  'interfaceConfig.DISPLAY_WELCOME_FOOTER=false',
];

function mergeMeetHashParams(url: string, params: string[]): string {
  const value = String(url || '').trim();
  if (!value) return '';

  const hashIndex = value.indexOf('#');
  const base = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const existingHash = hashIndex >= 0 ? value.slice(hashIndex + 1) : '';

  const map = new Map<string, string>();
  const ingest = (chunk: string) => {
    const raw = String(chunk || '').trim();
    if (!raw) return;
    const parts = raw.split('&');
    for (const part of parts) {
      if (!part) continue;
      const eq = part.indexOf('=');
      if (eq <= 0) {
        map.set(part, '');
        continue;
      }
      map.set(part.slice(0, eq), part.slice(eq + 1));
    }
  };

  ingest(existingHash);
  for (const param of params) ingest(param);

  const hash = Array.from(map.entries())
    .map(([k, v]) => (v === '' ? k : `${k}=${v}`))
    .join('&');

  return hash ? `${base}#${hash}` : base;
}

/**
 * Ensure a meet URL uses app-owned chrome (no native Jitsi trays).
 * Safe to call on already-configured URLs / backend embed_url.
 */
export function applyJitsiAppOwnedChrome(url: string): string {
  if (!isDirectMeetUrl(url)) return String(url || '');
  return mergeMeetHashParams(url, JITSI_APP_OWNED_CHROME_PARAMS);
}

/** Build meet URL — prefers backend embed_url (already includes app display name). */
export function buildJitsiMeetUrl(
  jitsiRoom: string | null | undefined,
  displayName: string,
  host: string = JITSI_MEET_HOST,
) {
  const room = String(jitsiRoom || '').trim();
  if (!room) return '';
  const name = encodeURIComponent(displayName || 'Guest');
  const meetHost = String(host || JITSI_MEET_HOST).replace(/\/$/, '');
  return applyJitsiAppOwnedChrome(
    `${meetHost}/${room}#userInfo.displayName="${name}"`,
  );
}

/** Only accept direct meet URLs — never the website /consultation/ page. */
export function isDirectMeetUrl(url: string | null | undefined) {
  const value = String(url || '');
  return (
    value.includes('meet.element.io/') ||
    value.includes('meet.jit.si/') ||
    value.includes('8x8.vc/')
  );
}

export function resolveVideoRoomFromAccess(payload: unknown): {
  jitsiRoom: string | null;
  embedUrl: string | null;
  displayName: string | null;
  host: string | null;
  allowed: boolean;
  reason: string | null;
  joinUrl: string | null;
} {
  const data = (payload || {}) as Record<string, unknown>;
  const videoRoom = (data.videoRoom || data.video_room || null) as
    | Record<string, unknown>
    | null;
  const videoAccess = (data.videoAccess || data.video_access || null) as
    | Record<string, unknown>
    | null;
  const participant = (data.participant || null) as Record<string, unknown> | null;

  const jitsiRoom =
    (videoRoom?.jitsi_room as string) ||
    (videoRoom?.room_id ? `Medzoos_${videoRoom.room_id}` : null) ||
    null;

  return {
    jitsiRoom,
    embedUrl: (videoRoom?.embed_url as string) || null,
    displayName:
      (participant?.displayName as string) ||
      (videoRoom?.display_name as string) ||
      null,
    host: (videoRoom?.jitsi_host as string) || null,
    allowed: videoAccess?.allowed !== false,
    reason: (videoAccess?.reason as string) || null,
    joinUrl:
      (videoAccess?.joinUrl as string) ||
      (videoRoom?.join_url as string) ||
      null,
  };
}
