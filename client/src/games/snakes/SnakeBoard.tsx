import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  Sparkles, 
  ArrowUpRight, 
  Flame,
  Star
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { SnakeGameState, SnakePlayer } from '../../types';
import { sound } from '../../utils/sound';

interface SnakeBoardProps {
  roomId: string;
  gameState: SnakeGameState;
  onRematch: () => void;
  onExit: () => void;
}

const LADDERS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91
};

const SNAKES: Record<number, number> = {
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78
};

export const SnakeBoard: React.FC<SnakeBoardProps> = ({
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

  useEffect(() => {
    if (gameState.lastEvent) {
      if (gameState.lastEvent.type === 'ladder') {
        sound.playLadderClimb();
      } else if (gameState.lastEvent.type === 'snake') {
        sound.playSnakeBite();
      } else if (gameState.lastEvent.type === 'move') {
        sound.playTokenStep();
      }
    }
  }, [gameState.lastEvent]);

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
    if (!isMyTurn || isRolling || !socket) return;
    setIsRolling(true);
    sound.playDiceRoll();

    setTimeout(() => {
      socket.emit('snakes_roll_dice', { roomId, userId: user!.id });
      setIsRolling(false);
    }, 600);
  };

  // Generate 100 tiles in zig-zag order (Row 10 = 100..91, Row 9 = 81..90 etc.)
  const tiles: number[] = [];
  for (let row = 9; row >= 0; row--) {
    const rowTiles: number[] = [];
    for (let col = 0; col < 10; col++) {
      if (row % 2 === 1) {
        // Even from top (odd 0-indexed): Left to Right
        rowTiles.push(row * 10 + col + 1);
      } else {
        // Odd from top: Right to Left
        rowTiles.push(row * 10 + (10 - col));
      }
    }
    tiles.push(...rowTiles);
  }

  return (
    <div className="w-full flex flex-col items-center space-y-4 max-w-4xl mx-auto">
      
      {/* Top Bar */}
      <div className="w-full glass-card bg-slate-900/90 border border-slate-800 rounded-3xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-600 text-white shadow-lg">
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
              {currentPlayer?.username} (Tile: {currentPlayer?.position || 0})
            </h2>
          </div>
        </div>

        {/* Action log message */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-2 max-w-sm text-center">
          <p className="text-xs font-semibold text-emerald-300 leading-snug">
            {gameState.lastAction || 'Waiting for roll...'}
          </p>
        </div>
      </div>

      {/* 100-Tile Board Grid */}
      <div className="relative w-full aspect-square max-w-[560px] bg-[#0b101c] rounded-3xl p-3 border-2 border-emerald-500/30 shadow-2xl flex flex-col justify-between select-none">
        <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-1 bg-slate-950/80 rounded-2xl p-1.5 overflow-hidden">
          {tiles.map((num) => {
            const isLadderStart = LADDERS[num] !== undefined;
            const isSnakeHead = SNAKES[num] !== undefined;
            const is100 = num === 100;
            const isAlt = (Math.floor((num - 1) / 10) + ((num - 1) % 10)) % 2 === 0;

            const playersOnTile = gameState.players.filter((p) => p.position === num);

            return (
              <div
                key={`tile-${num}`}
                className={`relative rounded-xl flex flex-col items-center justify-between p-1 transition-all border ${
                  is100
                    ? 'bg-gradient-to-tr from-amber-500/40 to-yellow-600/50 border-amber-400/80 shadow-inner'
                    : isLadderStart
                    ? 'bg-emerald-950/50 border-emerald-500/60 shadow-inner'
                    : isSnakeHead
                    ? 'bg-rose-950/50 border-rose-500/60 shadow-inner'
                    : isAlt
                    ? 'bg-slate-900/90 border-slate-800/80'
                    : 'bg-slate-800/40 border-slate-800/50'
                }`}
              >
                {/* Tile Number */}
                <div className="w-full flex items-center justify-between">
                  <span className={`text-[10px] sm:text-xs font-black leading-none ${is100 ? 'text-amber-300 font-extrabold' : 'text-slate-400'}`}>
                    {num}
                  </span>
                  {is100 && <Trophy className="w-3.5 h-3.5 text-amber-400 fill-current" />}
                  {isLadderStart && (
                    <span className="text-[9px] font-black text-emerald-400 flex items-center gap-0.5">
                      🪜→{LADDERS[num]}
                    </span>
                  )}
                  {isSnakeHead && (
                    <span className="text-[9px] font-black text-rose-400 flex items-center gap-0.5">
                      🐍→{SNAKES[num]}
                    </span>
                  )}
                </div>

                {/* Tokens on this Tile */}
                <div className="flex flex-wrap items-center justify-center gap-0.5 z-10 my-auto">
                  {playersOnTile.map((p) => (
                    <div
                      key={`p-tok-${p.userId}`}
                      title={`${p.username} (Tile ${num})`}
                      style={{ backgroundColor: p.color }}
                      className="w-4 h-4 sm:w-5 sm:h-5 rounded-full ring-2 ring-white flex items-center justify-center text-[9px] font-black text-white shadow-md animate-bounce-soft"
                    >
                      {p.username.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Players Progress Strip */}
      <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
        {gameState.players.map((p) => (
          <div
            key={p.userId}
            className={`p-2.5 rounded-2xl border flex items-center gap-2.5 ${
              currentPlayer.userId === p.userId
                ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                : 'bg-slate-900/60 border-slate-800'
            }`}
          >
            <div
              style={{ backgroundColor: p.color }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs ring-2 ring-slate-800 shrink-0"
            >
              {p.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{p.username}</p>
              <p className="text-[11px] text-slate-400 font-semibold">Tile: {p.position}/100</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dice Roller Bottom Bar */}
      <div className="w-full glass-card bg-slate-900/95 border border-emerald-500/40 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
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

        {isMyTurn ? (
          <button
            onClick={handleRollDice}
            disabled={isRolling}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:scale-105 active:scale-95 text-white font-black text-sm tracking-wide shadow-xl shadow-emerald-500/30 cursor-pointer flex items-center gap-2 animate-pulse"
          >
            <Sparkles className="w-4 h-4" />
            {isRolling ? 'Rolling...' : 'Roll Dice!'}
          </button>
        ) : (
          <div className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
            Waiting for {currentPlayer.username}...
          </div>
        )}
      </div>

      {/* RESULTS MODAL */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in zoom-in-95">
          <div className="w-full max-w-lg glass-card bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/30 animate-bounce-soft">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">GAME OVER!</h2>
              <p className="text-xs text-emerald-300">Congratulations to the winners! 🎉</p>
            </div>

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

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={onRematch}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
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
