import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';

export function registerChatHandlers(io: Server, socket: Socket) {
  // Send Room Message
  socket.on('send_room_message', ({ roomId, senderUser, message, replyToId }) => {
    try {
      if (!roomId || !senderUser || !message.trim()) return;

      const messageId = uuidv4();
      const cleanMessage = message.trim().slice(0, 1000);

      db.prepare(`
        INSERT INTO messages (id, room_id, sender_id, message, reply_to_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(messageId, roomId, senderUser.id, cleanMessage, replyToId || null);

      const payload = {
        id: messageId,
        room_id: roomId,
        sender_id: senderUser.id,
        sender_username: senderUser.username,
        sender_avatar: senderUser.avatar,
        message: cleanMessage,
        reply_to_id: replyToId || null,
        created_at: new Date().toISOString()
      };

      io.to(roomId).emit('new_room_message', payload);
    } catch (err) {
      console.error('send_room_message error:', err);
    }
  });

  // Fetch Room Message History
  socket.on('get_room_messages', ({ roomId }, callback) => {
    try {
      const messages = db.prepare(`
        SELECT m.*, u.username as sender_username, u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.room_id = ?
        ORDER BY m.created_at ASC
        LIMIT 60
      `).all(roomId);

      if (typeof callback === 'function') {
        callback({ messages });
      }
    } catch (err) {
      console.error('get_room_messages error:', err);
    }
  });

  // Typing Indicator (Room)
  socket.on('room_typing', ({ roomId, username, isTyping }) => {
    socket.to(roomId).emit('room_user_typing', { username, isTyping });
  });

  // Send Direct Message (1-to-1)
  socket.on('send_direct_message', ({ senderUser, receiverId, message }) => {
    try {
      if (!senderUser || !receiverId || !message.trim()) return;

      const messageId = uuidv4();
      const cleanMessage = message.trim().slice(0, 1000);

      db.prepare(`
        INSERT INTO messages (id, room_id, sender_id, receiver_id, message)
        VALUES (?, NULL, ?, ?, ?)
      `).run(messageId, senderUser.id, receiverId, cleanMessage);

      const payload = {
        id: messageId,
        sender_id: senderUser.id,
        receiver_id: receiverId,
        sender_username: senderUser.username,
        sender_avatar: senderUser.avatar,
        message: cleanMessage,
        created_at: new Date().toISOString()
      };

      // Broadcast to both user channels
      io.emit(`direct_msg_${receiverId}`, payload);
      io.emit(`direct_msg_${senderUser.id}`, payload);
    } catch (err) {
      console.error('send_direct_message error:', err);
    }
  });

  // Fetch Direct Messages History between two users
  socket.on('get_direct_messages', ({ userId1, userId2 }, callback) => {
    try {
      const messages = db.prepare(`
        SELECT m.*, u.username as sender_username, u.avatar as sender_avatar
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
        ORDER BY m.created_at ASC
        LIMIT 60
      `).all(userId1, userId2, userId2, userId1);

      if (typeof callback === 'function') {
        callback({ messages });
      }
    } catch (err) {
      console.error('get_direct_messages error:', err);
    }
  });

  // Delete own message
  socket.on('delete_message', ({ messageId, userId, roomId }) => {
    try {
      const msg = db.prepare('SELECT sender_id FROM messages WHERE id = ?').get(messageId) as any;
      if (msg && msg.sender_id === userId) {
        db.prepare('DELETE FROM messages WHERE id = ?').run(messageId);
        if (roomId) {
          io.to(roomId).emit('message_deleted', { messageId });
        }
      }
    } catch (err) {
      console.error('delete_message error:', err);
    }
  });
}
