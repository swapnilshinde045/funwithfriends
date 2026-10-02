import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';

export interface SnakePlayer {
  userId: string;
  username: string;
  avatar: string;
  color: string;
  position: number; // 0 (off-board) to 100
  hasWon: boolean;
  rank: number;
}

export interface SnakeGameState {
  gameId: string;
  roomId: string;
  playerCount: number;
  players: SnakePlayer[];
  currentTurnIndex: number;
  currentDiceValue: number | null;
  lastEvent: {
    type: 'move' | 'ladder' | 'snake' | 'win' | 'extra_turn';
    from?: number;
    to?: number;
    player: string;
    description: string;
  } | null;
  status: 'playing' | 'finished';
  winners: { userId: string; username: string; rank: number; color: string }[];
  lastAction: string;
}

// Ladders: [start, end]
export const LADDERS: Record<number, number> = {
  4: 14,
  9: 31,
  20: 38,
  28: 84,
  40: 59,
  51: 67,
  63: 81,
  71: 91
};

// Snakes: [head, tail]
export const SNAKES: Record<number, number> = {
  17: 7,
  54: 34,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  99: 78
};

export const activeSnakeGames = new Map<string, SnakeGameState>();

export class SnakeEngine {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public createGame(roomId: string, members: { user_id: string; username: string; avatar: string }[]): SnakeGameState {
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b']; // Indigo, Pink, Emerald, Amber

    const players: SnakePlayer[] = members.map((m, idx) => ({
      userId: m.user_id,
      username: m.username,
      avatar: m.avatar,
      color: colors[idx % colors.length],
      position: 0,
      hasWon: false,
      rank: 0
    }));

    const gameId = uuidv4();
    const gameState: SnakeGameState = {
      gameId,
      roomId,
      playerCount: members.length,
      players,
      currentTurnIndex: 0,
      currentDiceValue: null,
      lastEvent: null,
      status: 'playing',
      winners: [],
      lastAction: `Game started! ${players[0].username}'s turn to roll.`
    };

    activeSnakeGames.set(roomId, gameState);

    db.prepare(`
      INSERT INTO games (id, room_id, game_type, status, game_state_json)
      VALUES (?, ?, 'snakes', 'in_progress', ?)
    `).run(gameId, roomId, JSON.stringify(gameState));

    players.forEach(p => {
      db.prepare(`
        INSERT INTO game_players (id, game_id, user_id, player_color, position_score, rank)
        VALUES (?, ?, ?, ?, 0, 0)
      `).run(uuidv4(), gameId, p.userId, p.color);
    });

    return gameState;
  }

  public rollDice(roomId: string, userId: string): { success: boolean; dice?: number; error?: string } {
    const game = activeSnakeGames.get(roomId);
    if (!game || game.status !== 'playing') {
      return { success: false, error: 'Game not active' };
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    if (currentPlayer.userId !== userId) {
      return { success: false, error: "Not your turn!" };
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    game.currentDiceValue = dice;

    const oldPos = currentPlayer.position;
    let newPos = oldPos + dice;

    if (newPos > 100) {
      // Bounce back rule
      const overshoot = newPos - 100;
      newPos = 100 - overshoot;
      game.lastAction = `${currentPlayer.username} rolled a ${dice}! Bounced back to tile ${newPos}.`;
    } else {
      game.lastAction = `${currentPlayer.username} rolled a ${dice} and stepped from ${oldPos} to ${newPos}.`;
    }

    // Check ladders and snakes
    let eventType: 'move' | 'ladder' | 'snake' | 'win' | 'extra_turn' = 'move';
    if (LADDERS[newPos]) {
      const ladderEnd = LADDERS[newPos];
      game.lastEvent = {
        type: 'ladder',
        from: newPos,
        to: ladderEnd,
        player: currentPlayer.username,
        description: `🚀 Wow! ${currentPlayer.username} climbed a ladder from ${newPos} up to ${ladderEnd}!`
      };
      newPos = ladderEnd;
      game.lastAction = game.lastEvent.description;
    } else if (SNAKES[newPos]) {
      const snakeTail = SNAKES[newPos];
      game.lastEvent = {
        type: 'snake',
        from: newPos,
        to: snakeTail,
        player: currentPlayer.username,
        description: `🐍 Oops! ${currentPlayer.username} was bitten by a snake at ${newPos} and slid down to ${snakeTail}!`
      };
      newPos = snakeTail;
      game.lastAction = game.lastEvent.description;
    } else {
      game.lastEvent = {
        type: 'move',
        from: oldPos,
        to: newPos,
        player: currentPlayer.username,
        description: `${currentPlayer.username} moved to tile ${newPos}.`
      };
    }

    currentPlayer.position = newPos;

    // Check win condition
    if (currentPlayer.position === 100 && !currentPlayer.hasWon) {
      currentPlayer.hasWon = true;
      const rank = game.winners.length + 1;
      currentPlayer.rank = rank;
      game.winners.push({
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        rank,
        color: currentPlayer.color
      });

      game.lastAction = `🏆 ${currentPlayer.username} reached tile 100 in ${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} place!`;

      const remaining = game.players.filter(p => !p.hasWon);
      if (remaining.length <= 1 || (game.players.length === 2 && game.winners.length >= 1)) {
        game.status = 'finished';
        if (remaining.length === 1) {
          const last = remaining[0];
          last.rank = game.winners.length + 1;
          game.winners.push({
            userId: last.userId,
            username: last.username,
            rank: last.rank,
            color: last.color
          });
        }
        this.saveGameResults(game);
        this.broadcastState(roomId);
        return { success: true, dice };
      }
    }

    // Pass turn if not a 6
    if (dice === 6) {
      game.lastAction += ' Rolled a 6! Roll again!';
    } else {
      let nextIndex = (game.currentTurnIndex + 1) % game.players.length;
      let attempts = 0;
      while (game.players[nextIndex].hasWon && attempts < game.players.length) {
        nextIndex = (nextIndex + 1) % game.players.length;
        attempts++;
      }
      game.currentTurnIndex = nextIndex;
    }

    this.broadcastState(roomId);
    return { success: true, dice };
  }

  private saveGameResults(game: SnakeGameState): void {
    try {
      const winner = game.winners[0];
      db.prepare(`
        UPDATE games 
        SET status = 'finished', winner_id = ?, rankings_json = ?, game_state_json = ?, ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(winner?.userId || null, JSON.stringify(game.winners), JSON.stringify(game), game.gameId);

      game.players.forEach(p => {
        db.prepare(`
          UPDATE game_players 
          SET rank = ?, position_score = ?
          WHERE game_id = ? AND user_id = ?
        `).run(p.rank, p.position, game.gameId, p.userId);
      });
    } catch (err) {
      console.error('Error saving Snakes results:', err);
    }
  }

  public broadcastState(roomId: string): void {
    const game = activeSnakeGames.get(roomId);
    if (game) {
      this.io.to(roomId).emit('snakes_state_update', game);
    }
  }
}
