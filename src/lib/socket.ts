import { io, Socket } from "socket.io-client";
import { API_URL, tokenStore } from "./api";

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = tokenStore.get();
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (socket) { socket.auth = { token }; socket.connect(); return socket; }
  socket = io(API_URL, { auth: { token }, autoConnect: true, transports: ["websocket", "polling"] });
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
