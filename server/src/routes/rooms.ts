import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Helper to generate 6-character alphanumeric room codes
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new room
router.post('/create', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const { roomType, maxPlayers, isPrivate } = req.body;
    const hostId = req.user!.id;

    if (!['ludo', 'snakes', 'music'].includes(roomType)) {
      res.status(400).json({ error: 'Invalid room type. Must be ludo, snakes, or music' });
      return;
    }

    let code = generateRoomCode();
    // Ensure uniqueness
    let exists = db.prepare('SELECT id FROM rooms WHERE room_code = ?').get(code);
    while (exists) {
      code = generateRoomCode();
      exists = db.prepare('SELECT id FROM rooms WHERE room_code = ?').get(code);
    }

    const roomId = uuidv4();
    const capacity = roomType === 'ludo' ? (maxPlayers || 4) : roomType === 'snakes' ? (maxPlayers || 4) : 20;

    db.prepare(`
      INSERT INTO rooms (id, room_code, room_type, host_id, status, max_players, is_private)
      VALUES (?, ?, ?, ?, 'waiting', ?, ?)
    `).run(roomId, code, roomType, hostId, capacity, isPrivate ? 1 : 0);

    // Add host as first member
    const memberId = uuidv4();
    db.prepare(`
      INSERT INTO room_members (id, room_id, user_id, is_ready, player_slot)
      VALUES (?, ?, ?, 1, 0)
    `).run(memberId, roomId, hostId);

    // If music room, initialize state
    if (roomType === 'music') {
      const musicId = uuidv4();
      db.prepare(`
        INSERT INTO music_rooms (id, room_id, current_content_json, queue_json, playback_state_json)
        VALUES (?, ?, NULL, '[]', '{"isPlaying":false,"currentTime":0}')
      `).run(musicId, roomId);
    }

    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
    res.status(201).json({ message: 'Room created successfully', room });
  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// Get room details by room code
router.get('/code/:roomCode', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const code = String(req.params.roomCode).toUpperCase();
  const room = db.prepare('SELECT * FROM rooms WHERE room_code = ?').get(code) as any;

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const host = db.prepare('SELECT id, username, avatar FROM users WHERE id = ?').get(room.host_id);
  const members = db.prepare(`
    SELECT rm.id as member_id, rm.user_id, rm.joined_at, rm.is_ready, rm.player_slot,
           u.username, u.avatar, u.status
    FROM room_members rm
    JOIN users u ON rm.user_id = u.id
    WHERE rm.room_id = ?
    ORDER BY rm.player_slot ASC
  `).all(room.id);

  res.json({
    room: {
      ...room,
      host,
      members
    }
  });
});

// Get active public rooms for dashboard
router.get('/active', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const rooms = db.prepare(`
    SELECT r.*, u.username as host_username, u.avatar as host_avatar,
           (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
    FROM rooms r
    JOIN users u ON r.host_id = u.id
    WHERE r.status != 'finished' AND r.is_private = 0
    ORDER BY r.created_at DESC
    LIMIT 15
  `).all();

  res.json({ rooms });
});

// Get notifications
router.get('/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const notifications = db.prepare(`
    SELECT n.*, u.username as sender_username, u.avatar as sender_avatar
    FROM notifications n
    JOIN users u ON n.sender_id = u.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 30
  `).all(userId);

  const unreadCount = (db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0
  `).get(userId) as { count: number }).count;

  res.json({ notifications, unreadCount });
});

// Mark notifications read
router.post('/notifications/read', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(userId);
  res.json({ message: 'Notifications marked as read' });
});

export default router;
