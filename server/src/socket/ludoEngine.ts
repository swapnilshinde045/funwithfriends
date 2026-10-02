import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'orange';

export interface LudoToken {
  id: number; // 0..3
  position: number; // main track index or -1
  stepCount: number; // -1 = base, 0..51 on track, 52..56 home stretch, 57 = finished/home
  isHome: boolean;
}

export interface LudoPlayer {
  odId: string;
  userId: string;
  username: string;
  avatar: string;
  color: LudoColor;
  tokens: LudoToken[];
  hasWon: boolean;
  rank: number; // 0 if playing, 1 for 1st, 2 for 2nd etc.
  score: number;
}

export interface LudoGameState {
  gameId: string;
  roomId: string;
  playerCount: number;
  players: LudoPlayer[];
  currentTurnIndex: number;
  currentDiceValue: number | null;
  hasRolled: boolean;
  validTokenMoves: number[]; // token IDs that can legally move
  consecutiveSixes: number;
  status: 'playing' | 'finished';
  winners: { userId: string; username: string; rank: number; color: string }[];
  turnTimer: number;
  lastAction: string;
}

// Map player colors to starting indices on 52-tile track (4-player standard)
const PLAYER_START_POS_4: Record<LudoColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
  purple: 0,
  orange: 26
};

// Safe squares on 4-player board (starts + star spots)
const SAFE_POSITIONS_4 = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// In-memory active games map
export const activeLudoGames = new Map<string, LudoGameState>();

export class LudoEngine {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public createGame(roomId: string, members: { user_id: string; username: string; avatar: string }[]): LudoGameState {
    const colors: LudoColor[] = members.length <= 4 
      ? ['red', 'green', 'yellow', 'blue'].slice(0, members.length) as LudoColor[]
      : ['red', 'green', 'yellow', 'blue', 'purple', 'orange'].slice(0, members.length) as LudoColor[];

    const players: LudoPlayer[] = members.map((m, idx) => ({
      odId: uuidv4(),
      userId: m.user_id,
      username: m.username,
      avatar: m.avatar,
      color: colors[idx],
      tokens: [
        { id: 0, position: -1, stepCount: -1, isHome: false },
        { id: 1, position: -1, stepCount: -1, isHome: false },
        { id: 2, position: -1, stepCount: -1, isHome: false },
        { id: 3, position: -1, stepCount: -1, isHome: false },
      ],
      hasWon: false,
      rank: 0,
      score: 0
    }));

    const gameId = uuidv4();
    const gameState: LudoGameState = {
      gameId,
      roomId,
      playerCount: members.length,
      players,
      currentTurnIndex: 0,
      currentDiceValue: null,
      hasRolled: false,
      validTokenMoves: [],
      consecutiveSixes: 0,
      status: 'playing',
      winners: [],
      turnTimer: 20,
      lastAction: 'Game started! Turn: ' + players[0].username
    };

    activeLudoGames.set(roomId, gameState);

    // Save game record in DB
    db.prepare(`
      INSERT INTO games (id, room_id, game_type, status, game_state_json)
      VALUES (?, ?, 'ludo', 'in_progress', ?)
    `).run(gameId, roomId, JSON.stringify(gameState));

    players.forEach(p => {
      db.prepare(`
        INSERT INTO game_players (id, game_id, user_id, player_color, position_score, rank)
        VALUES (?, ?, ?, ?, 0, 0)
      `).run(uuidv4(), gameId, p.userId, p.color);
    });

    return gameState;
  }

  public getGame(roomId: string): LudoGameState | undefined {
    return activeLudoGames.get(roomId);
  }

  public rollDice(roomId: string, userId: string): { success: boolean; dice?: number; error?: string } {
    const game = activeLudoGames.get(roomId);
    if (!game || game.status !== 'playing') {
      return { success: false, error: 'Game not active' };
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    if (currentPlayer.userId !== userId) {
      return { success: false, error: "Not your turn!" };
    }

    if (game.hasRolled) {
      return { success: false, error: 'Dice already rolled for this turn' };
    }

    // Server-authoritative random dice roll 1..6
    const dice = Math.floor(Math.random() * 6) + 1;
    game.currentDiceValue = dice;
    game.hasRolled = true;

    if (dice === 6) {
      game.consecutiveSixes++;
      if (game.consecutiveSixes === 3) {
        // 3 consecutive 6s penalty -> forfeit turn
        game.lastAction = `${currentPlayer.username} rolled three 6s in a row! Turn forfeited!`;
        this.nextTurn(game);
        this.broadcastState(roomId);
        return { success: true, dice };
      }
    } else {
      game.consecutiveSixes = 0;
    }

    // Determine valid token moves for current player
    const validMoves = this.calculateValidMoves(currentPlayer, dice);
    game.validTokenMoves = validMoves;

    if (validMoves.length === 0) {
      game.lastAction = `${currentPlayer.username} rolled a ${dice}. No valid moves available.`;
      // Delay slightly before passing turn so players can see the dice
      setTimeout(() => {
        const currentGame = activeLudoGames.get(roomId);
        if (currentGame && currentGame.gameId === game.gameId && currentGame.currentTurnIndex === game.currentTurnIndex) {
          this.nextTurn(currentGame);
          this.broadcastState(roomId);
        }
      }, 1200);
    } else if (validMoves.length === 1) {
      // Auto move if exactly 1 token is valid (optional or player can click)
      game.lastAction = `${currentPlayer.username} rolled a ${dice}. Auto-moving or click token #${validMoves[0] + 1}.`;
    } else {
      game.lastAction = `${currentPlayer.username} rolled a ${dice}. Choose a token to move!`;
    }

    this.broadcastState(roomId);
    return { success: true, dice };
  }

  public moveToken(roomId: string, userId: string, tokenId: number): { success: boolean; error?: string } {
    const game = activeLudoGames.get(roomId);
    if (!game || game.status !== 'playing') {
      return { success: false, error: 'Game not active' };
    }

    const currentPlayer = game.players[game.currentTurnIndex];
    if (currentPlayer.userId !== userId) {
      return { success: false, error: "Not your turn!" };
    }

    if (!game.hasRolled || game.currentDiceValue === null) {
      return { success: false, error: 'Must roll dice first' };
    }

    if (!game.validTokenMoves.includes(tokenId)) {
      return { success: false, error: 'Invalid token move' };
    }

    const token = currentPlayer.tokens[tokenId];
    const dice = game.currentDiceValue;
    const startPos = PLAYER_START_POS_4[currentPlayer.color];
    let extraTurn = dice === 6;
    let capturedOpponent = false;

    if (token.stepCount === -1 && dice === 6) {
      // Release from yard to board starting square
      token.stepCount = 0;
      token.position = startPos;
      game.lastAction = `${currentPlayer.username} brought token #${tokenId + 1} onto the board!`;
    } else {
      // Move token along the track
      token.stepCount += dice;
      if (token.stepCount === 57) {
        token.isHome = true;
        token.position = 999; // finished
        currentPlayer.score += 50;
        extraTurn = true; // extra turn on reaching home!
        game.lastAction = `🎉 ${currentPlayer.username}'s token reached HOME! Extra roll awarded!`;
      } else if (token.stepCount < 52) {
        // Token is on main track
        token.position = (startPos + token.stepCount) % 52;

        // Check capture if not on a safe star tile
        if (!SAFE_POSITIONS_4.has(token.position)) {
          game.players.forEach(otherPlayer => {
            if (otherPlayer.userId !== currentPlayer.userId) {
              otherPlayer.tokens.forEach(otherToken => {
                if (otherToken.stepCount >= 0 && otherToken.stepCount < 52 && otherToken.position === token.position) {
                  // Capture! Send back to yard
                  otherToken.stepCount = -1;
                  otherToken.position = -1;
                  capturedOpponent = true;
                  extraTurn = true; // Bonus roll for capture
                  game.lastAction = `💥 ${currentPlayer.username} captured ${otherPlayer.username}'s token! Bonus roll awarded!`;
                }
              });
            }
          });
        }
      } else {
        // Token is on home stretch (52..56)
        token.position = 100 + token.stepCount;
      }
    }

    // Check if current player has all 4 tokens home
    const allHome = currentPlayer.tokens.every(t => t.isHome);
    if (allHome && !currentPlayer.hasWon) {
      currentPlayer.hasWon = true;
      const rank = game.winners.length + 1;
      currentPlayer.rank = rank;
      game.winners.push({
        userId: currentPlayer.userId,
        username: currentPlayer.username,
        rank,
        color: currentPlayer.color
      });

      game.lastAction = `🏆 ${currentPlayer.username} finished in ${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} place!`;

      // Check if game is finished (all but 1 player finished or 1st place in 2-player)
      const remainingPlayers = game.players.filter(p => !p.hasWon);
      if (remainingPlayers.length <= 1 || (game.players.length === 2 && game.winners.length >= 1)) {
        game.status = 'finished';
        if (remainingPlayers.length === 1) {
          const lastPlayer = remainingPlayers[0];
          lastPlayer.rank = game.winners.length + 1;
          game.winners.push({
            userId: lastPlayer.userId,
            username: lastPlayer.username,
            rank: lastPlayer.rank,
            color: lastPlayer.color
          });
        }
        this.saveGameResults(game);
        this.broadcastState(roomId);
        return { success: true };
      }
    }

    // Reset turn state
    game.hasRolled = false;
    game.currentDiceValue = null;
    game.validTokenMoves = [];

    if (!extraTurn) {
      this.nextTurn(game);
    } else {
      game.lastAction += ' Roll again!';
    }

    this.broadcastState(roomId);
    return { success: true };
  }

  private calculateValidMoves(player: LudoPlayer, dice: number): number[] {
    const valid: number[] = [];
    player.tokens.forEach(token => {
      if (token.isHome) return;

      if (token.stepCount === -1) {
        // In yard, need a 6 to come out
        if (dice === 6) {
          valid.push(token.id);
        }
      } else {
        // On board, must not exceed 57
        if (token.stepCount + dice <= 57) {
          valid.push(token.id);
        }
      }
    });
    return valid;
  }

  private nextTurn(game: LudoGameState): void {
    game.hasRolled = false;
    game.currentDiceValue = null;
    game.validTokenMoves = [];
    game.consecutiveSixes = 0;

    let nextIndex = (game.currentTurnIndex + 1) % game.players.length;
    let attempts = 0;
    // Skip players who have already won/finished
    while (game.players[nextIndex].hasWon && attempts < game.players.length) {
      nextIndex = (nextIndex + 1) % game.players.length;
      attempts++;
    }

    game.currentTurnIndex = nextIndex;
    const nextPlayer = game.players[nextIndex];
    game.lastAction = `Turn: ${nextPlayer.username}`;
  }

  private saveGameResults(game: LudoGameState): void {
    try {
      const winner = game.winners[0];
      db.prepare(`
        UPDATE games 
        SET status = 'finished', winner_id = ?, rankings_json = ?, game_state_json = ?, ended_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(winner?.userId || null, JSON.stringify(game.winners), JSON.stringify(game), game.gameId);

      // Update player ranks and stats
      game.players.forEach(p => {
        db.prepare(`
          UPDATE game_players 
          SET rank = ?, position_score = ?
          WHERE game_id = ? AND user_id = ?
        `).run(p.rank, p.score, game.gameId, p.userId);
      });
    } catch (err) {
      console.error('Error saving Ludo results:', err);
    }
  }

  public broadcastState(roomId: string): void {
    const game = activeLudoGames.get(roomId);
    if (game) {
      this.io.to(roomId).emit('ludo_state_update', game);
    }
  }
}
