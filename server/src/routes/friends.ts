import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { User } from '../types/index.js';

const router = Router();

// Search users by query
router.get('/search', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const query = (req.query.q as string || '').trim();
  const currentUserId = req.user!.id;

  if (!query || query.length < 2) {
    res.json({ users: [] });
    return;
  }

  // Find users matching query (excluding self)
  const users = db.prepare(`
    SELECT u.id, u.username, u.avatar, u.status, u.bio, u.last_seen,
      (SELECT status FROM friends WHERE 
        (sender_id = ? AND receiver_id = u.id) OR 
        (sender_id = u.id AND receiver_id = ?)
      ) as friendship_status,
      (SELECT sender_id FROM friends WHERE 
        (sender_id = ? AND receiver_id = u.id) OR 
        (sender_id = u.id AND receiver_id = ?)
      ) as friendship_sender
    FROM users u
    WHERE u.id != ? AND LOWER(u.username) LIKE LOWER(?)
    LIMIT 20
  `).all(currentUserId, currentUserId, currentUserId, currentUserId, currentUserId, `%${query}%`);

  res.json({ users });
});

// Get accepted friends list
router.get('/list', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.id;

  const friends = db.prepare(`
    SELECT 
      f.id as friendship_id,
      f.created_at as friendship_created_at,
      u.id, u.username, u.avatar, u.status, u.bio, u.last_seen
    FROM friends f
    JOIN users u ON (
      CASE 
        WHEN f.sender_id = ? THEN f.receiver_id = u.id
        ELSE f.sender_id = u.id
      END
    )
    WHERE (f.sender_id = ? OR f.receiver_id = ?) AND f.status = 'accepted'
    ORDER BY u.status = 'online' DESC, u.last_seen DESC
  `).all(currentUserId, currentUserId, currentUserId);

  res.json({ friends });
});

// Get pending friend requests
router.get('/requests', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const currentUserId = req.user!.id;

  // Incoming
  const incoming = db.prepare(`
    SELECT f.id as request_id, f.created_at, u.id as user_id, u.username, u.avatar, u.bio
    FROM friends f
    JOIN users u ON f.sender_id = u.id
    WHERE f.receiver_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(currentUserId);

  // Outgoing
  const outgoing = db.prepare(`
    SELECT f.id as request_id, f.created_at, u.id as user_id, u.username, u.avatar
    FROM friends f
    JOIN users u ON f.receiver_id = u.id
    WHERE f.sender_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(currentUserId);

  res.json({ incoming, outgoing });
});

// Send a friend request
router.post('/request/:targetUserId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const senderId = req.user!.id;
  const receiverId = req.params.targetUserId;

  if (senderId === receiverId) {
    res.status(400).json({ error: 'Cannot send friend request to yourself' });
    return;
  }

  const receiver = db.prepare('SELECT id, username FROM users WHERE id = ?').get(receiverId) as User | undefined;
  if (!receiver) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Check existing relationship
  const existing = db.prepare(`
    SELECT id, sender_id, receiver_id, status FROM friends 
    WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
  `).get(senderId, receiverId, receiverId, senderId) as any;

  if (existing) {
    if (existing.status === 'accepted') {
      res.status(400).json({ error: 'Already friends' });
      return;
    }
    if (existing.status === 'blocked') {
      res.status(403).json({ error: 'Cannot connect with this user' });
      return;
    }
    if (existing.status === 'pending') {
      if (existing.sender_id === senderId) {
        res.status(400).json({ error: 'Friend request already sent' });
        return;
      } else {
        // Automatically accept if target had already sent request to us
        db.prepare("UPDATE friends SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(existing.id);
        
        // Notify both
        const notifId = uuidv4();
        db.prepare(`
          INSERT INTO notifications (id, user_id, sender_id, type, message)
          VALUES (?, ?, ?, 'friend_accepted', ?)
        `).run(notifId, existing.sender_id, senderId, `${req.user!.username} accepted your friend request!`);

        res.json({ message: 'Friend request accepted automatically', status: 'accepted' });
        return;
      }
    }
  }

  const friendshipId = uuidv4();
  db.prepare(`
    INSERT INTO friends (id, sender_id, receiver_id, status)
    VALUES (?, ?, ?, 'pending')
  `).run(friendshipId, senderId, receiverId);

  // Create notification for receiver
  const notifId = uuidv4();
  db.prepare(`
    INSERT INTO notifications (id, user_id, sender_id, type, message)
    VALUES (?, ?, ?, 'friend_request', ?)
  `).run(notifId, receiverId, senderId, `${req.user!.username} sent you a friend request!`);

  res.status(201).json({ message: 'Friend request sent', status: 'pending' });
});

// Accept a friend request
router.post('/accept/:requestId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const currentUserId = req.user!.id;
  const requestId = req.params.requestId;

  const request = db.prepare(`
    SELECT id, sender_id, receiver_id FROM friends WHERE id = ? AND receiver_id = ? AND status = 'pending'
  `).get(requestId, currentUserId) as { id: string; sender_id: string; receiver_id: string } | undefined;

  if (!request) {
    res.status(404).json({ error: 'Friend request not found' });
    return;
  }

  db.prepare("UPDATE friends SET status = 'accepted', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(requestId);

  // Send notification to the original sender
  const notifId = uuidv4();
  db.prepare(`
    INSERT INTO notifications (id, user_id, sender_id, type, message)
    VALUES (?, ?, ?, 'friend_accepted', ?)
  `).run(notifId, request.sender_id, currentUserId, `${req.user!.username} accepted your friend request!`);

  res.json({ message: 'Friend request accepted' });
});

// Reject a friend request
router.post('/reject/:requestId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const currentUserId = req.user!.id;
  const requestId = req.params.requestId;

  const deleted = db.prepare(`
    DELETE FROM friends WHERE id = ? AND receiver_id = ? AND status = 'pending'
  `).run(requestId, currentUserId);

  if (deleted.changes === 0) {
    res.status(404).json({ error: 'Friend request not found' });
    return;
  }

  res.json({ message: 'Friend request rejected' });
});

// Remove friend
router.delete('/:friendUserId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const currentUserId = req.user!.id;
  const targetId = req.params.friendUserId;

  const deleted = db.prepare(`
    DELETE FROM friends 
    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
  `).run(currentUserId, targetId, targetId, currentUserId);

  if (deleted.changes === 0) {
    res.status(404).json({ error: 'Friendship record not found' });
    return;
  }

  res.json({ message: 'Friend removed' });
});

// Block user
router.post('/block/:targetUserId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const currentUserId = req.user!.id;
  const targetId = req.params.targetUserId;

  if (currentUserId === targetId) {
    res.status(400).json({ error: 'Cannot block yourself' });
    return;
  }

  // Remove existing friend relation or set blocked
  db.prepare(`
    DELETE FROM friends 
    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
  `).run(currentUserId, targetId, targetId, currentUserId);

  const blockId = uuidv4();
  db.prepare(`
    INSERT INTO friends (id, sender_id, receiver_id, status)
    VALUES (?, ?, ?, 'blocked')
  `).run(blockId, currentUserId, targetId);

  res.json({ message: 'User blocked' });
});

// Unblock user
router.post('/unblock/:targetUserId', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const currentUserId = req.user!.id;
  const targetId = req.params.targetUserId;

  db.prepare(`
    DELETE FROM friends 
    WHERE sender_id = ? AND receiver_id = ? AND status = 'blocked'
  `).run(currentUserId, targetId);

  res.json({ message: 'User unblocked' });
});

export default router;
