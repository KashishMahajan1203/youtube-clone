import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { getAllowedOrigins } from './constants/origins.js';
import { verifyToken } from './services/token.js';

const rooms = new Map();
let ioInstance = null;

const userRoom = (userId) => `user:${userId}`;

// Push an event to every open tab of a signed-in user.
export function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(userRoom(userId)).emit(event, payload);
}

export function initializeSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioInstance = io;

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Signed-in clients join a personal room for notifications. They prove
    // who they are with their session token, not a bare user id.
    socket.on('register', (token) => {
      const userId = verifyToken(token);
      if (!userId) return;
      if (socket.data.userId && socket.data.userId !== userId) {
        socket.leave(userRoom(socket.data.userId));
      }
      socket.data.userId = userId;
      socket.join(userRoom(userId));
    });

    socket.on('unregister', () => {
      if (socket.data.userId) socket.leave(userRoom(socket.data.userId));
      socket.data.userId = null;
    });

    // Create a new room. The creator isn't added as a participant: the call
    // page opens its own socket and joins with that, like everyone else.
    socket.on('create-room', (callback) => {
      const roomId = uuidv4();
      rooms.set(roomId, { participants: [], host: socket.id });
      callback({ roomId });
      console.log(`Room created: ${roomId}`);
    });

    // Join an existing room or create if it doesn't exist
    socket.on('join-room', (roomId, callback) => {
      let room = rooms.get(roomId);
      if (!room) {
        room = { participants: [], host: socket.id };
        rooms.set(roomId, room);
        console.log(`Room created: ${roomId}`);
      }
      // Drop sockets that have gone away without a clean leave.
      room.participants = room.participants.filter((id) => io.sockets.sockets.has(id));
      if (!room.participants.includes(socket.id)) {
        room.participants.push(socket.id);
      }
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', socket.id);
      if (typeof callback === 'function') {
        callback({ success: true, participants: room.participants });
      }
      console.log(`User ${socket.id} joined room: ${roomId} (${room.participants.length} in call)`);
    });

    // WebRTC signalling: relay each message to the one peer it is meant for.
    const relay = (event, payloadKey) => (data) => {
      if (!data || typeof data.to !== 'string') return;
      const target = io.sockets.sockets.get(data.to);
      // Only relay between members of the same call.
      if (!target || !target.rooms.has(data.roomId) || !socket.rooms.has(data.roomId)) return;
      target.emit(event, { from: socket.id, [payloadKey]: data[payloadKey] });
    };
    socket.on('offer', relay('offer', 'offer'));
    socket.on('answer', relay('answer', 'answer'));
    socket.on('ice-candidate', relay('ice-candidate', 'candidate'));

    // Screen sharing
    socket.on('start-screen-share', (roomId) => {
      socket.to(roomId).emit('screen-share-started', socket.id);
    });

    socket.on('stop-screen-share', (roomId) => {
      socket.to(roomId).emit('screen-share-stopped', socket.id);
    });

    // Recording
    socket.on('start-recording', (roomId) => {
      socket.to(roomId).emit('recording-started', socket.id);
    });

    socket.on('stop-recording', (roomId) => {
      socket.to(roomId).emit('recording-stopped', socket.id);
    });

    // Camera enable request
    socket.on('request-camera-enable', (data) => {
      // Send request to specific participant
      socket.to(data.roomId).emit('camera-enable-request', { from: socket.id, to: data.to });
      console.log(`Camera enable request from ${socket.id} to ${data.to} in room ${data.roomId}`);
    });

    socket.on('camera-enable-response', (data) => {
      // Send response back to the requester
      socket.to(data.roomId).emit('camera-enable-response', { from: socket.id, response: data.response });
      console.log(`Camera enable response from ${socket.id}: ${data.response} in room ${data.roomId}`);
    });

    // Leave room
    socket.on('leave-room', (roomId) => {
      const room = rooms.get(roomId);
      if (room) {
        room.participants = room.participants.filter(id => id !== socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        socket.leave(roomId);
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      // Clean up rooms
      for (const [roomId, room] of rooms.entries()) {
        room.participants = room.participants.filter(id => id !== socket.id);
        socket.to(roomId).emit('user-left', socket.id);
        if (room.participants.length === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });

  return io;
}
