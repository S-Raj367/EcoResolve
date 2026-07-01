import { io } from "socket.io-client";

let socket;

export function getSocket() {
    if (socket) return socket;

    const url =
        import.meta.env.VITE_SOCKET_URL ||
        import.meta.env.VITE_API_BASE_URL;

    socket = io(url, {
        transports: ["websocket", "polling"],
    });

    return socket;
}