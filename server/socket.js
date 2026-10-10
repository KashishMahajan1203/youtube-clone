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

    // Create a new room
    socket.on('create-room', (callback) => {
      const roomId = uuidv4();
      rooms.set(roomId, { participants: [socket.id], host: socket.id });
      socket.join(roomId);
      callback({ roomId });
      console.log(`Room created: ${roomId}`);
    });

    // Join an existing room or create if it doesn't exist
    socket.on('join-room', (roomId, callback) => {
      let room = rooms.get(roomId);
      if (!room) {
        // Create the room if it doesn't exist
        room = { participants: [], host: socket.id };
        rooms.set(roomId, room);
        console.log(`Room created: ${roomId}`);
      }
      if (!room.participants.includes(socket.id)) {
        room.participants.push(socket.id);
      }
      socket.join(roomId);
      socket.to(roomId).emit('user-joined', socket.id);
      callback({ success: true, participants: room.participants });
      console.log(`User ${socket.id} joined room: ${roomId}`);
    });

    // WebRTC signaling
    socket.on('offer', (data) => {
      // Broadcast offer to the room
      socket.to(data.roomId).emit('offer', { offer: data.offer, from: socket.id });
      console.log(`Broadcast offer from ${socket.id} to room ${data.roomId}`);
    });

    socket.on('answer', (data) => {
      // Broadcast answer to the room
      socket.to(data.roomId).emit('answer', { answer: data.answer, from: socket.id });
      console.log(`Broadcast answer from ${socket.id} to room ${data.roomId}`);
    });

    socket.on('ice-candidate', (data) => {
      // Broadcast ICE candidate to the room
      socket.to(data.roomId).emit('ice-candidate', { candidate: data.candidate, from: socket.id });
      console.log(`Broadcast ICE candidate from ${socket.id} to room ${data.roomId}`);
    });

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
