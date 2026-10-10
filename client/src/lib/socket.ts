import { io, Socket } from "socket.io-client";
import { BACKEND_URL } from "./media";

// One shared connection for app-wide realtime features (notifications, call
// room creation). Video calls open their own connection in VideoCall.tsx.
let socket: Socket | null = null;

export function getSocket() {
  if (typeof window === "undefined") return null;
  if (!socket) socket = io(BACKEND_URL);
  return socket;
}
