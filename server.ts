import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const PORT = 3000;

  // Matchmaking Queue
  // We store sockets and their interests
  interface QueuedUser {
    id: string;
    interests: string[];
    socket: any;
  }

  const waitingQueue: QueuedUser[] = [];
  const activeRooms = new Map<string, string[]>(); // roomId -> [socketId1, socketId2]
  const userToRoom = new Map<string, string>(); // socketId -> roomId

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-queue', ({ interests }: { interests: string[] }) => {
      // Clean up previous room if exists
      const oldRoomId = userToRoom.get(socket.id);
      if (oldRoomId) {
        socket.to(oldRoomId).emit('peer-disconnected');
        socket.leave(oldRoomId);
        userToRoom.delete(socket.id);
        activeRooms.delete(oldRoomId);
      }

      // Check for match
      let matchIdx = -1;

      // 1. Try interest-based match
      if (interests.length > 0) {
        matchIdx = waitingQueue.findIndex(u => 
          u.interests.some(interest => interests.includes(interest))
        );
      }

      // 2. Fallback to any random match
      if (matchIdx === -1 && waitingQueue.length > 0) {
        matchIdx = 0;
      }

      if (matchIdx !== -1) {
        const peer = waitingQueue.splice(matchIdx, 1)[0];
        const roomId = `room-${socket.id}-${peer.id}`;

        socket.join(roomId);
        peer.socket.join(roomId);

        activeRooms.set(roomId, [socket.id, peer.id]);
        userToRoom.set(socket.id, roomId);
        userToRoom.set(peer.id, roomId);

        // Tell both users they are matched
        // Peer 1 (initiator) gets one role, Peer 2 (receiver) gets the other
        socket.emit('matched', { roomId, initiator: true });
        peer.socket.emit('matched', { roomId, initiator: false });
      } else {
        waitingQueue.push({ id: socket.id, interests, socket });
      }
    });

    socket.on('send-message', ({ roomId, message }) => {
      socket.to(roomId).emit('receive-message', {
        id: Math.random().toString(36).substring(7),
        text: message,
        sender: 'Stranger',
        timestamp: new Date().toISOString(),
      });
    });

    // WebRTC Signaling
    socket.on('signal', ({ roomId, signal }) => {
      socket.to(roomId).emit('signal', { signal });
    });

    socket.on('leave-room', () => {
      handleDisconnect(socket);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      handleDisconnect(socket);
    });

    function handleDisconnect(s: any) {
      // Remove from queue
      const qIdx = waitingQueue.findIndex(u => u.id === s.id);
      if (qIdx !== -1) {
        waitingQueue.splice(qIdx, 1);
      }

      // Notify peer in room
      const roomId = userToRoom.get(s.id);
      if (roomId) {
        s.to(roomId).emit('peer-disconnected');
        userToRoom.delete(s.id);
        
        const peers = activeRooms.get(roomId);
        if (peers) {
          const otherPeerId = peers.find(id => id !== s.id);
          if (otherPeerId) {
            userToRoom.delete(otherPeerId);
          }
          activeRooms.delete(roomId);
        }
      }
    }
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
