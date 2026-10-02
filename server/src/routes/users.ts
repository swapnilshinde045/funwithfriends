import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { User, UserStats } from '../types/index.js';

const router = Router();

// Get user profile & stats by ID or username
router.get('/:identifier', authenticateToken, (req: AuthenticatedRequest, res: Response): void => {
  const { identifier } = req.params;

  const user = db.prepare(`
    SELECT id, username, email, avatar, role, bio, status, last_seen, created_at 
    FROM users 
    WHERE id = ? OR LOWER(username) = LOWER(?)
  `).get(identifier, identifier) as User | undefined;

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Calculate statistics from game_players and games table
  const ludoStats = db.prepare(`
    SELECT 
      COUNT(*) as games,
      SUM(CASE WHEN gp.rank = 1 THEN 1 ELSE 0 END) as wins
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.user_id = ? AND g.game_type = 'ludo' AND g.status = 'finished'
  `).get(user.id) as { games: number; wins: number | null };

  const snakesStats = db.prepare(`
    SELECT 
      COUNT(*) as games,
      SUM(CASE WHEN gp.rank = 1 THEN 1 ELSE 0 END) as wins
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.user_id = ? AND g.game_type = 'snakes' AND g.status = 'finished'
  `).get(user.id) as { games: number; wins: number | null };

  const friendsCount = (db.prepare(`
    SELECT COUNT(*) as count FROM friends 
    WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
  `).get(user.id, user.id) as { count: number }).count;

  const ludoWins = ludoStats.wins || 0;
  const ludoGames = ludoStats.games || 0;
  const snakesWins = snakesStats.wins || 0;
  const snakesGames = snakesStats.games || 0;
  const totalGames = ludoGames + snakesGames;
  const totalWins = ludoWins + snakesWins;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const stats: UserStats = {
    userId: user.id,
    ludoWins,
    ludoGames,
    snakesWins,
    snakesGames,
    totalGames,
    totalWins,
    winRate,
    friendsCount
  };

  // Recent match history
  const recentGames = db.prepare(`
    SELECT 
      g.id as game_id, g.game_type, g.started_at, g.ended_at,
      gp.player_color, gp.rank, gp.position_score,
      u_win.username as winner_username, u_win.avatar as winner_avatar
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    LEFT JOIN users u_win ON g.winner_id = u_win.id
    WHERE gp.user_id = ? AND g.status = 'finished'
    ORDER BY g.ended_at DESC
    LIMIT 10
  `).all(user.id);

  // Check friendship status with current requesting user
  let friendshipStatus = null;
  if (req.user && req.user.id !== user.id) {
    const rel = db.prepare(`
      SELECT status, sender_id FROM friends 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
    `).get(req.user.id, user.id, user.id, req.user.id) as any;
    if (rel) {
      friendshipStatus = {
        status: rel.status,
        isSender: rel.sender_id === req.user.id
      };
    }
  }

  res.json({
    user,
    stats,
    recentGames,
    friendshipStatus
  });
});

export default router;
