import { io } from "socket.io-client";

const ENDPOINT = process.env.REACT_APP_SERVER_URL || "http://localhost:5000";

// Create socket connection with proper authentication
const createSocket = () => {
  const userInfo = localStorage.getItem("userInfo");
  const token = userInfo ? JSON.parse(userInfo).token : null;

  if (!token) {
    console.warn('No token found for socket connection');
    return null;
  }

  return io(ENDPOINT, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
    transports: ['websocket', 'polling']
  });
};

let socket = createSocket();

// Function to reconnect socket with new token
const reconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
  socket = createSocket();
  if (socket) {
    setupSocketListeners();
  }
  return socket;
};

// Setup socket event listeners
const setupSocketListeners = () => {
  if (!socket) return;

  // Handle connection errors
  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error.message);
    
    // If JWT expired, try to reconnect with fresh token
    if (error.message.includes('jwt expired') || error.message.includes('Invalid token')) {
      console.log('Token expired, attempting to reconnect...');
      setTimeout(() => {
        reconnectSocket();
      }, 2000);
    }
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully');
  });
};

// Initialize socket listeners
if (socket) {
  setupSocketListeners();
}

export default socket;
export { createSocket, reconnectSocket };
