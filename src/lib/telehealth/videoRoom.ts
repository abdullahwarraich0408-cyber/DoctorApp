/**
 * Public meet host.
 * meet.jit.si REQUIRES a separate Google/GitHub/Facebook login for the room
 * moderator — that cannot use Medzoos credentials. meet.element.io joins with
 * the display name from the logged-in Medzoos session (no second login).
 */
export const JITSI_MEET_HOST = 'https://meet.element.io';

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
  return (
    `${meetHost}/${room}` +
    `#config.prejoinPageEnabled=false` +
    `&config.requireDisplayName=false` +
    `&config.disableDeepLinking=true` +
    `&config.startWithAudioMuted=false` +
    `&config.startWithVideoMuted=false` +
    `&config.disableInviteFunctions=true` +
    `&userInfo.displayName="${name}"`
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
