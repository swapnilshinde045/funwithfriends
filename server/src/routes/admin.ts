import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { authenticateToken, requireAdmin, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Protect all admin routes
router.use(authenticateToken, requireAdmin);

// Dashboard overview metrics
router.get('/metrics', (_req: AuthenticatedRequest, res: Response) => {
  const totalUsers = (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count;
  const onlineUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status != 'offline'").get() as any).count;
  const activeRooms = (db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status != 'finished'").get() as any).count;
  const totalGames = (db.prepare('SELECT COUNT(*) as count FROM games').get() as any).count;
  const totalMessages = (db.prepare('SELECT COUNT(*) as count FROM messages').get() as any).count;

  const gameBreakdown = db.prepare(`
    SELECT game_type, COUNT(*) as count 
    FROM games 
    GROUP BY game_type
  `).all();

  const recentUsers = db.prepare(`
    SELECT id, username, email, avatar, role, status, created_at, last_seen
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  res.json({
    metrics: {
      totalUsers,
      onlineUsers,
      activeRooms,
      totalGames,
      totalMessages,
      gameBreakdown
    },
    recentUsers
  });
});

// List all users with pagination and search
router.get('/users', (req: AuthenticatedRequest, res: Response) => {
  const search = (req.query.search as string || '').trim();
  let query = 'SELECT id, username, email, avatar, role, bio, status, last_seen, created_at FROM users';
  let params: any[] = [];

  if (search) {
    query += ' WHERE LOWER(username) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC LIMIT 50';
  const users = db.prepare(query).all(...params);

  res.json({ users });
});

// Update user role or reset password
router.patch('/users/:userId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { userId } = req.params;
  const { role, newPassword } = req.body;

  const target = db.prepare('SELECT id, role FROM users WHERE id = ?').get(userId) as any;
  if (!target) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (role && ['user', 'admin'].includes(role)) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
  }

  if (newPassword && typeof newPassword === 'string' && newPassword.length >= 6) {
    const hash = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  }

  const updated = db.prepare('SELECT id, username, email, avatar, role, bio, status, last_seen, created_at FROM users WHERE id = ?').get(userId);
  res.json({ message: 'User updated successfully', user: updated });
});

// Delete user
router.delete('/users/:userId', (req: AuthenticatedRequest, res: Response): void => {
  const { userId } = req.params;

  if (req.user!.id === userId) {
    res.status(400).json({ error: 'Cannot delete your own admin account' });
    return;
  }

  const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  if (result.changes === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ message: 'User account removed' });
});

// Get active rooms list
router.get('/rooms', (_req: AuthenticatedRequest, res: Response) => {
  const rooms = db.prepare(`
    SELECT r.*, u.username as host_username,
      (SELECT COUNT(*) FROM room_members WHERE room_id = r.id) as member_count
    FROM rooms r
    JOIN users u ON r.host_id = u.id
    ORDER BY r.created_at DESC
  `).all();

  res.json({ rooms });
});

// Force close room
router.delete('/rooms/:roomId', (_req: AuthenticatedRequest, res: Response): void => {
  const { roomId } = _req.params;
  db.prepare("UPDATE rooms SET status = 'finished' WHERE id = ?").run(roomId);
  res.json({ message: 'Room closed' });
});

export default router;
