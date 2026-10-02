import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  Home, 
  Sparkles, 
  Crown, 
  Volume2, 
  ArrowRight,
  Shield,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LudoGameState, LudoPlayer, LudoToken, LudoColor } from '../../types';
import { sound } from '../../utils/sound';

interface LudoBoardProps {
  roomId: string;
  gameState: LudoGameState;
  onRematch: () => void;
  onExit: () => void;
}

// 4-Player Board Coordinate Mapping (15x15 grid, cells 0..14)
// Main track 52 cells mapped to [col, row] in 15x15 matrix
const TRACK_COORDS_4: [number, number][] = [
  // Red start & stretch (indices 0..4)
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // Green base approach (5..10)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], // 11 (top divider)
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // 12..17 (Green track)
  // Yellow base approach (18..23)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], // 24 (right divider)
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // 25..30 (Yellow track)
  // Blue base approach (31..36)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], // 37 (bottom divider)
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], // 38..43 (Blue track)
  // Red completion (44..50)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7] // 51 (left divider)
];

// Home column paths (5 cells each)
const HOME_PATHS_4: Record<LudoColor, [number, number][]> = {
  red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  purple: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  orange: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]]
};

// Safe star spots
const SAFE_STAR_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Color theme details
const COLOR_CONFIG: Record<LudoColor, { name: string; hex: string; bg: string; border: string; glow: string }> = {
  red: { name: 'Red', hex: '#ef4444', bg: 'bg-red-500', border: 'border-red-500', glow: 'shadow-red-500/50' },
  green: { name: 'Green', hex: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-500', glow: 'shadow-emerald-500/50' },
  yellow: { name: 'Yellow', hex: '#f59e0b', bg: 'bg-amber-400', border: 'border-amber-400', glow: 'shadow-amber-400/50' },
  blue: { name: 'Blue', hex: '#06b6d4', bg: 'bg-cyan-500', border: 'border-cyan-500', glow: 'shadow-cyan-500/50' },
  purple: { name: 'Purple', hex: '#a855f7', bg: 'bg-purple-500', border: 'border-purple-500', glow: 'shadow-purple-500/50' },
  orange: { name: 'Orange', hex: '#f97316', bg: 'bg-orange-500', border: 'border-orange-500', glow: 'shadow-orange-500/50' },
};

export const LudoBoard: React.FC<LudoBoardProps> = ({
  roomId,
  gameState,
  onRematch,
  onExit,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [isRolling, setIsRolling] = useState(false);
  const [confettiTriggered, setConfettiTriggered] = useState(false);

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;

  // Trigger celebration on victory
  useEffect(() => {
    if (gameState.status === 'finished' && !confettiTriggered) {
      setConfettiTriggered(true);
      sound.playVictory();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    }
  }, [gameState.status, confettiTriggered]);

  const handleRollDice = () => {
    if (!isMyTurn || gameState.hasRolled || isRolling || !socket) return;
    setIsRolling(true);
    sound.playDiceRoll();

    setTimeout(() => {
      socket.emit('ludo_roll_dice', { roomId, userId: user!.id });
      setIsRolling(false);
    }, 600);
  };

  const handleMoveToken = (tokenId: number) => {
    if (!isMyTurn || !gameState.hasRolled || !socket) return;
    if (!gameState.validTokenMoves.includes(tokenId)) return;

    sound.playTokenStep();
    socket.emit('ludo_move_token', { roomId, userId: user!.id, tokenId });
  };

  // Helper to render token dots inside cells
  const getTokensAtCell = (col: number, row: number) => {
    const tokens: { player: LudoPlayer; token: LudoToken }[] = [];

    gameState.players.forEach(player => {
      player.tokens.forEach(token => {
        if (token.isHome || token.stepCount === -1) return;

        if (token.stepCount < 52) {
          const [tc, tr] = TRACK_COORDS_4[token.position];
          if (tc === col && tr === row) {
            tokens.push({ player, token });
          }
        } else {
          // Home stretch
          const homeCoords = HOME_PATHS_4[player.color];
          const stretchIdx = token.stepCount - 52;
          if (homeCoords && homeCoords[stretchIdx]) {
            const [hc, hr] = homeCoords[stretchIdx];
            if (hc === col && hr === row) {
              tokens.push({ player, token });
            }
          }
        }
      });
    });

    return tokens;
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4 max-w-4xl mx-auto">
      
      {/* Top Game Bar */}
      <div className="w-full glass-card bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl ${COLOR_CONFIG[currentPlayer.color]?.bg || 'bg-indigo-600'} text-white shadow-lg`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Current Turn</span>
              {isMyTurn && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                  YOUR TURN
                </span>
              )}
            </div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              {currentPlayer?.username} ({COLOR_CONFIG[currentPlayer?.color]?.name})
            </h2>
          </div>
        </div>

        {/* Action log message */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2 max-w-sm text-center">
          <p className="text-xs font-semibold text-indigo-300 leading-snug">
            {gameState.lastAction || 'Waiting for roll...'}
          </p>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="relative w-full aspect-square max-w-[560px] bg-[#0c101c] rounded-3xl p-3 border-2 border-indigo-500/30 shadow-2xl flex flex-col justify-between select-none">
        
        {/* SVG Interactive Ludo Grid (15x15) */}
        <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[2px] bg-slate-950/60 rounded-2xl p-1 overflow-hidden">
          
          {/* Base Yards (4 corners) */}
          {/* Top-Left: Red Yard */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-red-600/30 to-red-950/50 border-2 border-red-500/60 p-3 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-red-400 tracking-wider">
              <span>RED BASE</span>
              <Crown className="w-4 h-4" />
            </div>
            {/* Yard Token Slots */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/80 rounded-xl border border-red-500/30">
              {gameState.players.find(p => p.color === 'red')?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'red' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`red-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-red-500 shadow-md ${isValid ? 'ring-4 ring-white animate-bounce cursor-pointer scale-110' : 'opacity-90'}`
                        : 'bg-slate-800/60 border border-red-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Center Track (3 cols x 6 rows) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[2px]">
            {Array.from({ length: 18 }).map((_, i) => {
              const col = 6 + (i % 3);
              const row = Math.floor(i / 3);
              const isHomeCol = col === 7 && row > 0;
              const isGreenStart = col === 8 && row === 1;
              const isStar = (col === 6 && row === 2) || (col === 8 && row === 1);
              const tokens = getTokensAtCell(col, row);

              return (
                <div
                  key={`top-cell-${col}-${row}`}
                  className={`relative rounded-md flex items-center justify-center transition-colors ${
                    isHomeCol
                      ? 'bg-emerald-500/70 border border-emerald-400/50'
                      : isGreenStart
                      ? 'bg-emerald-600/50 border border-emerald-400'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-70" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Top-Right: Green Yard */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-emerald-950/50 border-2 border-emerald-500/60 p-3 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-emerald-400 tracking-wider">
              <span>GREEN BASE</span>
              <Crown className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/80 rounded-xl border border-emerald-500/30">
              {gameState.players.find(p => p.color === 'green')?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'green' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`green-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-emerald-500 shadow-md ${isValid ? 'ring-4 ring-white animate-bounce cursor-pointer scale-110' : 'opacity-90'}`
                        : 'bg-slate-800/60 border border-emerald-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle Left Track (6 cols x 3 rows) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[2px]">
            {Array.from({ length: 18 }).map((_, i) => {
              const col = i % 6;
              const row = 6 + Math.floor(i / 6);
              const isHomeRow = row === 7 && col > 0;
              const isRedStart = col === 1 && row === 6;
              const isStar = (col === 1 && row === 6) || (col === 2 && row === 8);
              const tokens = getTokensAtCell(col, row);

              return (
                <div
                  key={`mid-left-${col}-${row}`}
                  className={`relative rounded-md flex items-center justify-center ${
                    isHomeRow
                      ? 'bg-red-500/70 border border-red-400/50'
                      : isRedStart
                      ? 'bg-red-600/50 border border-red-400'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-70" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Center Triumph Zone (3x3) */}
          <div className="col-span-3 row-span-3 rounded-2xl bg-gradient-to-tr from-indigo-900 via-purple-900 to-pink-900 border-2 border-indigo-400/60 p-2 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
            <Trophy className="w-8 h-8 text-amber-400 animate-bounce-soft" />
            <span className="text-[10px] font-black text-indigo-200 tracking-wider">HOME</span>
          </div>

          {/* Middle Right Track (6 cols x 3 rows) */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[2px]">
            {Array.from({ length: 18 }).map((_, i) => {
              const col = 9 + (i % 6);
              const row = 6 + Math.floor(i / 6);
              const isHomeRow = row === 7 && col < 14;
              const isYellowStart = col === 13 && row === 8;
              const isStar = (col === 13 && row === 8) || (col === 12 && row === 6);
              const tokens = getTokensAtCell(col, row);

              return (
                <div
                  key={`mid-right-${col}-${row}`}
                  className={`relative rounded-md flex items-center justify-center ${
                    isHomeRow
                      ? 'bg-amber-400/70 border border-amber-300/50'
                      : isYellowStart
                      ? 'bg-amber-500/50 border border-amber-300'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-70" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom-Left: Blue Yard */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-blue-950/50 border-2 border-cyan-500/60 p-3 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-cyan-400 tracking-wider">
              <span>BLUE BASE</span>
              <Crown className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/80 rounded-xl border border-cyan-500/30">
              {gameState.players.find(p => p.color === 'blue')?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'blue' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`blue-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-cyan-500 shadow-md ${isValid ? 'ring-4 ring-white animate-bounce cursor-pointer scale-110' : 'opacity-90'}`
                        : 'bg-slate-800/60 border border-cyan-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Center Track (3 cols x 6 rows) */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[2px]">
            {Array.from({ length: 18 }).map((_, i) => {
              const col = 6 + (i % 3);
              const row = 9 + Math.floor(i / 3);
              const isHomeCol = col === 7 && row < 14;
              const isBlueStart = col === 6 && row === 13;
              const isStar = (col === 6 && row === 13) || (col === 8 && row === 12);
              const tokens = getTokensAtCell(col, row);

              return (
                <div
                  key={`bot-cell-${col}-${row}`}
                  className={`relative rounded-md flex items-center justify-center ${
                    isHomeCol
                      ? 'bg-cyan-500/70 border border-cyan-400/50'
                      : isBlueStart
                      ? 'bg-cyan-600/50 border border-cyan-400'
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-70" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom-Right: Yellow Yard */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-950/50 border-2 border-amber-400/60 p-3 flex flex-col justify-between shadow-inner">
            <div className="flex items-center justify-between text-xs font-black text-amber-400 tracking-wider">
              <span>YELLOW BASE</span>
              <Crown className="w-4 h-4" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-900/80 rounded-xl border border-amber-400/30">
              {gameState.players.find(p => p.color === 'yellow')?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'yellow' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`yellow-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-amber-400 shadow-md ${isValid ? 'ring-4 ring-white animate-bounce cursor-pointer scale-110' : 'opacity-90'}`
                        : 'bg-slate-800/60 border border-amber-400/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Interactive Dice Roller Panel */}
      <div className="w-full glass-card bg-slate-900/95 border border-indigo-500/40 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Animated 3D Dice Face */}
          <div className={`w-14 h-14 rounded-2xl bg-white text-slate-900 shadow-2xl flex items-center justify-center font-black text-2xl border-2 border-slate-300 ${isRolling ? 'dice-animate' : ''}`}>
            {gameState.currentDiceValue || '?'}
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400">DICE RESULT</p>
            <p className="text-sm font-black text-white">
              {gameState.currentDiceValue ? `Rolled a ${gameState.currentDiceValue}!` : 'Ready to roll'}
            </p>
          </div>
        </div>

        {/* Big Roll Button */}
        {isMyTurn ? (
          <button
            onClick={handleRollDice}
            disabled={gameState.hasRolled || isRolling}
            className={`px-8 py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all shadow-xl flex items-center gap-2 ${
              !gameState.hasRolled && !isRolling
                ? 'bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:scale-105 active:scale-95 text-white shadow-emerald-500/30 cursor-pointer animate-pulse'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isRolling ? 'Rolling...' : gameState.hasRolled ? 'Select Token' : 'Roll Dice!'}
          </button>
        ) : (
          <div className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
            Waiting for {currentPlayer.username}...
          </div>
        )}
      </div>

      {/* GAME OVER PODIUM MODAL */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95">
          <div className="w-full max-w-lg glass-card bg-slate-900 border border-indigo-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 animate-bounce-soft">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">GAME OVER!</h2>
              <p className="text-xs text-indigo-300">Congratulations to the champions! 🎉</p>
            </div>

            {/* Podium Ranks */}
            <div className="space-y-2.5">
              {gameState.winners.map((win) => (
                <div
                  key={win.userId}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    win.rank === 1
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : win.rank === 2
                      ? 'bg-slate-700/30 border-slate-500/50 text-slate-200'
                      : 'bg-orange-950/20 border-orange-600/40 text-orange-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black">
                      {win.rank === 1 ? '🥇' : win.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span className="font-bold text-sm text-white">{win.username}</span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">
                    {win.rank === 1 ? '1st Place' : win.rank === 2 ? '2nd Place' : `${win.rank}th Place`}
                  </span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={onRematch}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Play Again
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-all"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
