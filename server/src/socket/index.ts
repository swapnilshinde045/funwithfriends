import { Server, Socket } from 'socket.io';
import { db } from '../db/database.js';
import { LudoEngine } from './ludoEngine.js';
import { SnakeEngine } from './snakeEngine.js';
import { MusicHandler } from './musicHandler.js';
import { registerRoomHandlers } from './roomHandler.js';
import { registerChatHandlers } from './chatHandler.js';

export function setupSocketServer(io: Server) {
  const ludoEngine = new LudoEngine(io);
  const snakeEngine = new SnakeEngine(io);
  const musicHandler = new MusicHandler(io);

  io.on('connection', (socket: Socket) => {
    let currentUserId: string | null = null;

    // User identification on socket connect
    socket.on('user_connected', ({ userId }) => {
      if (userId) {
        currentUserId = userId;
        db.prepare("UPDATE users SET status = 'online', last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(userId);
        io.emit('user_status_change', { userId, status: 'online' });
      }
    });

    // Register modular handlers
    registerRoomHandlers(io, socket, ludoEngine, snakeEngine, musicHandler);
    registerChatHandlers(io, socket);

    // Ludo Game Actions
    socket.on('ludo_roll_dice', ({ roomId, userId }) => {
      ludoEngine.rollDice(roomId, userId);
    });

    socket.on('ludo_move_token', ({ roomId, userId, tokenId }) => {
      ludoEngine.moveToken(roomId, userId, tokenId);
    });

    // Snakes Game Actions
    socket.on('snakes_roll_dice', ({ roomId, userId }) => {
      snakeEngine.rollDice(roomId, userId);
    });

    // Music Room Actions
    socket.on('music_add_track', ({ roomId, track }) => {
      musicHandler.addTrack(roomId, track);
    });

    socket.on('music_remove_track', ({ roomId, trackId }) => {
      musicHandler.removeTrack(roomId, trackId);
    });

    socket.on('music_play_pause', ({ roomId, isPlaying, currentTime }) => {
      musicHandler.setPlayback(roomId, isPlaying, currentTime);
    });

    socket.on('music_next_track', ({ roomId }) => {
      musicHandler.nextTrack(roomId);
    });

    socket.on('music_prev_track', ({ roomId }) => {
      musicHandler.prevTrack(roomId);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (currentUserId) {
        db.prepare("UPDATE users SET status = 'offline', last_seen = CURRENT_TIMESTAMP WHERE id = ?").run(currentUserId);
        io.emit('user_status_change', { userId: currentUserId, status: 'offline' });
      }
    });
  });

  return { ludoEngine, snakeEngine, musicHandler };
}
