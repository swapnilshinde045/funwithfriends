import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  Sparkles
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

  // Generate 100 tiles in zig-zag order
  const tiles: number[] = [];
  for (let row = 9; row >= 0; row--) {
    const rowTiles: number[] = [];
    for (let col = 0; col < 10; col++) {
      if (row % 2 === 1) {
        rowTiles.push(row * 10 + col + 1);
      } else {
        rowTiles.push(row * 10 + (10 - col));
      }
    }
    tiles.push(...rowTiles);
  }

  return (
    <div className="w-full flex flex-col items-center space-y-4 max-w-2xl mx-auto select-none pb-6">
      
      {/* Top Bar */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Turn</span>
              {isMyTurn && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
                  YOUR TURN
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              {currentPlayer?.username} (Tile: {currentPlayer?.position || 0})
            </h2>
          </div>
        </div>

        {/* Action log message */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 max-w-sm text-center">
          <p className="text-xs font-bold text-emerald-700 leading-snug">
            {gameState.lastAction || 'Waiting for roll...'}
          </p>
        </div>
      </div>

      {/* 100-Tile Board Grid */}
      <div className="relative w-full aspect-square max-w-[520px] bg-amber-900 border-4 border-amber-800 rounded-3xl p-3 shadow-xl flex flex-col justify-between">
        <div className="w-full h-full grid grid-cols-10 grid-rows-10 gap-1 bg-white rounded-2xl p-1.5 overflow-hidden shadow-inner">
          {tiles.map((num) => {
            const isLadderStart = LADDERS[num] !== undefined;
            const isSnakeHead = SNAKES[num] !== undefined;
            const is100 = num === 100;
            const isAlt = (Math.floor((num - 1) / 10) + ((num - 1) % 10)) % 2 === 0;

            const playersOnTile = gameState.players.filter((p) => p.position === num);

            return (
              <div
                key={`tile-${num}`}
                className={`relative rounded-lg flex flex-col items-center justify-between p-0.5 sm:p-1 transition-all border ${
                  is100
                    ? 'bg-amber-100 border-amber-400 shadow-inner'
                    : isLadderStart
                    ? 'bg-emerald-100 border-emerald-400 shadow-inner'
                    : isSnakeHead
                    ? 'bg-rose-100 border-rose-400 shadow-inner'
                    : isAlt
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Tile Number */}
                <div className="w-full flex items-center justify-between">
                  <span className={`text-[9px] sm:text-[11px] font-black leading-none ${is100 ? 'text-amber-800 font-extrabold' : 'text-slate-600'}`}>
                    {num}
                  </span>
                  {is100 && <Trophy className="w-3 h-3 text-amber-600 fill-current" />}
                  {isLadderStart && (
                    <span className="text-[8px] font-black text-emerald-700">
                      🪜{LADDERS[num]}
                    </span>
                  )}
                  {isSnakeHead && (
                    <span className="text-[8px] font-black text-rose-700">
                      🐍{SNAKES[num]}
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
                ? 'bg-amber-50 border-amber-400 shadow-xs'
                : 'bg-white border-slate-200'
            }`}
          >
            <div
              style={{ backgroundColor: p.color }}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-xs ring-2 ring-white shadow-xs shrink-0"
            >
              {p.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{p.username}</p>
              <p className="text-[11px] text-slate-500 font-bold">Tile: {p.position}/100</p>
            </div>
          </div>
        ))}
      </div>

      {/* Dice Roller Bottom Bar */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`dice-cube flex items-center justify-center text-slate-900 font-black text-2xl ${isRolling ? 'dice-animate' : ''}`}>
            {gameState.currentDiceValue || '?'}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">DICE RESULT</p>
            <p className="text-sm font-black text-slate-900">
              {gameState.currentDiceValue ? `Rolled a ${gameState.currentDiceValue}!` : 'Ready to roll'}
            </p>
          </div>
        </div>

        {isMyTurn ? (
          <button
            onClick={handleRollDice}
            disabled={isRolling}
            className="btn-arcade-green px-8 py-3.5 rounded-2xl text-white font-black text-sm uppercase tracking-wider shadow-md cursor-pointer flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isRolling ? 'Rolling...' : 'Roll Dice!'}
          </button>
        ) : (
          <div className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            {currentPlayer?.username}'s Turn
          </div>
        )}
      </div>

      {/* WINNER MODAL */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl animate-bounce-soft">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">GAME OVER! 🏆</h2>
              <p className="text-sm font-bold text-amber-700 mt-1">
                {gameState.winner?.username} reached Tile 100 first!
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={onRematch}
                className="btn-arcade-green px-6 py-3 rounded-2xl text-white font-black text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Rematch
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-300 cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
