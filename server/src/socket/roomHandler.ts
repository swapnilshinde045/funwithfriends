import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { LudoEngine } from './ludoEngine.js';
import { SnakeEngine } from './snakeEngine.js';
import { MusicHandler } from './musicHandler.js';

export function registerRoomHandlers(
  io: Server,
  socket: Socket,
  ludoEngine: LudoEngine,
  snakeEngine: SnakeEngine,
  musicHandler: MusicHandler
) {
  // Join Room
  socket.on('join_room', ({ roomId, user }) => {
    try {
      if (!roomId || !user) return;

      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
      if (!room) {
        socket.emit('room_error', { message: 'Room does not exist' });
        return;
      }

      // Check member count
      const existingMember = db.prepare('SELECT * FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, user.id);
      const membersCount = (db.prepare('SELECT COUNT(*) as count FROM room_members WHERE room_id = ?').get(roomId) as any).count;

      if (!existingMember && membersCount >= room.max_players) {
        socket.emit('room_error', { message: 'Room is already full' });
        return;
      }

      if (!existingMember) {
        const memberId = uuidv4();
        db.prepare(`
          INSERT INTO room_members (id, room_id, user_id, is_ready, player_slot)
          VALUES (?, ?, ?, 0, ?)
        `).run(memberId, roomId, user.id, membersCount);
      }

      socket.join(roomId);

      // Update user status
      const newStatus = room.room_type === 'music' ? 'in_music' : 'in_game';
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(newStatus, user.id);
      io.emit('user_status_change', { userId: user.id, status: newStatus });

      // Broadcast updated member list to room
      const members = db.prepare(`
        SELECT rm.id as member_id, rm.user_id, rm.joined_at, rm.is_ready, rm.player_slot,
               u.username, u.avatar, u.status
        FROM room_members rm
        JOIN users u ON rm.user_id = u.id
        WHERE rm.room_id = ?
        ORDER BY rm.player_slot ASC
      `).all(roomId);

      const host = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(room.host_id);

      io.to(roomId).emit('room_updated', {
        room: {
          ...room,
          host,
          members
        }
      });

      // If game is in progress or music room, send current state
      if (room.room_type === 'ludo') {
        const gameState = ludoEngine.getGame(roomId);
        if (gameState) {
          socket.emit('ludo_state_update', gameState);
        }
      } else if (room.room_type === 'snakes') {
        const gameState = snakeEngine.createGame; // will fetch active if exists
        const active = (snakeEngine as any).getGame ? (snakeEngine as any).getGame(roomId) : null;
        if (active) {
          socket.emit('snakes_state_update', active);
        }
      } else if (room.room_type === 'music') {
        const musicState = musicHandler.getOrCreateRoom(roomId);
        socket.emit('music_state_update', musicState);
      }
    } catch (err) {
      console.error('join_room error:', err);
    }
  });

  // Toggle Ready
  socket.on('toggle_ready', ({ roomId, userId }) => {
    try {
      const member = db.prepare('SELECT is_ready FROM room_members WHERE room_id = ? AND user_id = ?').get(roomId, userId) as any;
      if (member) {
        const newReady = member.is_ready ? 0 : 1;
        db.prepare('UPDATE room_members SET is_ready = ? WHERE room_id = ? AND user_id = ?').run(newReady, roomId, userId);

        const members = db.prepare(`
          SELECT rm.id as member_id, rm.user_id, rm.joined_at, rm.is_ready, rm.player_slot,
                 u.username, u.avatar, u.status
          FROM room_members rm
          JOIN users u ON rm.user_id = u.id
          WHERE rm.room_id = ?
          ORDER BY rm.player_slot ASC
        `).all(roomId);

        io.to(roomId).emit('members_updated', members);
      }
    } catch (err) {
      console.error('toggle_ready error:', err);
    }
  });

  // Start Game
  socket.on('start_game', ({ roomId, hostId }) => {
    try {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
      if (!room || room.host_id !== hostId) {
        socket.emit('room_error', { message: 'Only host can start the game' });
        return;
      }

      const members = db.prepare(`
        SELECT rm.user_id, u.username, u.avatar
        FROM room_members rm
        JOIN users u ON rm.user_id = u.id
        WHERE rm.room_id = ?
        ORDER BY rm.player_slot ASC
      `).all(roomId) as { user_id: string; username: string; avatar: string }[];

      if (members.length < 2 && room.room_type !== 'music') {
        socket.emit('room_error', { message: 'Need at least 2 players to start a game' });
        return;
      }

      db.prepare("UPDATE rooms SET status = 'in_progress' WHERE id = ?").run(roomId);

      if (room.room_type === 'ludo') {
        const gameState = ludoEngine.createGame(roomId, members);
        io.to(roomId).emit('game_started', { gameType: 'ludo', gameState });
      } else if (room.room_type === 'snakes') {
        const gameState = snakeEngine.createGame(roomId, members);
        io.to(roomId).emit('game_started', { gameType: 'snakes', gameState });
      }
    } catch (err) {
      console.error('start_game error:', err);
    }
  });

  // Kick Player (Host action)
  socket.on('kick_player', ({ roomId, hostId, targetUserId }) => {
    try {
      const room = db.prepare('SELECT host_id FROM rooms WHERE id = ?').get(roomId) as any;
      if (!room || room.host_id !== hostId) return;

      db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, targetUserId);

      io.to(roomId).emit('player_kicked', { targetUserId });

      const members = db.prepare(`
        SELECT rm.id as member_id, rm.user_id, rm.joined_at, rm.is_ready, rm.player_slot,
               u.username, u.avatar, u.status
        FROM room_members rm
        JOIN users u ON rm.user_id = u.id
        WHERE rm.room_id = ?
        ORDER BY rm.player_slot ASC
      `).all(roomId);

      io.to(roomId).emit('members_updated', members);
    } catch (err) {
      console.error('kick_player error:', err);
    }
  });

  // Leave Room
  socket.on('leave_room', ({ roomId, userId }) => {
    try {
      if (!roomId || !userId) return;

      const room = db.prepare('SELECT host_id FROM rooms WHERE id = ?').get(roomId) as any;
      db.prepare('DELETE FROM room_members WHERE room_id = ? AND user_id = ?').run(roomId, userId);

      socket.leave(roomId);

      // Revert user status
      db.prepare("UPDATE users SET status = 'online' WHERE id = ?").run(userId);
      io.emit('user_status_change', { userId, status: 'online' });

      // If host left, assign new host or close room
      const remainingMembers = db.prepare('SELECT user_id FROM room_members WHERE room_id = ? ORDER BY joined_at ASC').all(roomId) as any[];

      if (remainingMembers.length === 0) {
        db.prepare("UPDATE rooms SET status = 'finished' WHERE id = ?").run(roomId);
      } else if (room && room.host_id === userId) {
        const newHostId = remainingMembers[0].user_id;
        db.prepare('UPDATE rooms SET host_id = ? WHERE id = ?').run(newHostId, roomId);
        io.to(roomId).emit('host_changed', { newHostId });
      }

      const updatedMembers = db.prepare(`
        SELECT rm.id as member_id, rm.user_id, rm.joined_at, rm.is_ready, rm.player_slot,
               u.username, u.avatar, u.status
        FROM room_members rm
        JOIN users u ON rm.user_id = u.id
        WHERE rm.room_id = ?
        ORDER BY rm.player_slot ASC
      `).all(roomId);

      io.to(roomId).emit('members_updated', updatedMembers);
    } catch (err) {
      console.error('leave_room error:', err);
    }
  });

  // Request Rematch
  socket.on('request_rematch', ({ roomId, hostId }) => {
    try {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId) as any;
      if (!room) return;

      db.prepare("UPDATE rooms SET status = 'waiting' WHERE id = ?").run(roomId);
      db.prepare('UPDATE room_members SET is_ready = 0 WHERE room_id = ?').run(roomId);

      io.to(roomId).emit('rematch_accepted', { roomId });
    } catch (err) {
      console.error('request_rematch error:', err);
    }
  });

  // Invite Friend to Room (Instant real-time notification)
  socket.on('invite_friend_to_room', ({ senderUser, targetUserId, roomCode, roomType }) => {
    try {
      const notifId = uuidv4();
      const message = `${senderUser.username} invited you to join a ${roomType.toUpperCase()} room!`;

      db.prepare(`
        INSERT INTO notifications (id, user_id, sender_id, type, message, data_json)
        VALUES (?, ?, ?, 'game_invite', ?, ?)
      `).run(notifId, targetUserId, senderUser.id, message, JSON.stringify({ roomCode, roomType }));

      io.emit(`notification_${targetUserId}`, {
        id: notifId,
        user_id: targetUserId,
        sender_id: senderUser.id,
        type: 'game_invite',
        message,
        data_json: JSON.stringify({ roomCode, roomType }),
        read: 0,
        created_at: new Date().toISOString(),
        sender_username: senderUser.username,
        sender_avatar: senderUser.avatar
      });
    } catch (err) {
      console.error('invite_friend_to_room error:', err);
    }
  });
}
