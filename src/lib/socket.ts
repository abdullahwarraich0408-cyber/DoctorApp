import { io, type Socket } from 'socket.io-client';
import { getSocketUrl } from '../config/api';
import { getAccessToken } from './auth/session';

let socket: Socket | null = null;
let activeToken: string | null = null;

export function getDoctorSocket() {
  const token = getAccessToken();
  if (!token) return null;

  if (socket && activeToken === token) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  activeToken = token;
  socket = io(getSocketUrl(), {
    auth: { token },
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
  activeToken = null;
}
