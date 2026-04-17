// ============================================================
// src/hooks/useSocket.js
// ============================================================
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
let sharedSocket = null;

export function getSocket() {
  if (!sharedSocket) {
    const token = localStorage.getItem("token");
    sharedSocket = io(BASE, {
      auth: { token },
      autoConnect: false,
    });
  }
  return sharedSocket;
}

export function useSocket() {
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const s = socketRef.current;
    if (!s.connected) s.connect();
    return () => {
      // Don't disconnect on unmount — keep shared connection alive
    };
  }, []);

  return socketRef.current;
}
