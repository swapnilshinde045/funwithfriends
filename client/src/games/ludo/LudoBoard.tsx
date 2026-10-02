import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  Crown, 
  Sparkles, 
  Star, 
  Flame, 
  Smile, 
  Clock, 
  MessageCircle, 
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { LudoGameState, LudoPlayer, LudoToken, LudoColor } from '../../types';
import { PlayerProfileModal } from '../../components/common/PlayerProfileModal';
import { sound } from '../../utils/sound';

interface LudoBoardProps {
  roomId: string;
  gameState: LudoGameState;
  onRematch: () => void;
  onExit: () => void;
}

// 4-Player Board Coordinate Mapping (15x15 grid)
const TRACK_COORDS_4: [number, number][] = [
  // Red start & stretch (indices 0..4)
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  // Green base approach (5..10)
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], // 11
  [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], // 12..17
  // Yellow base approach (18..23)
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], // 24
  [14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8], // 25..30
  // Blue base approach (31..36)
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], // 37
  [6, 14], [6, 13], [6, 12], [6, 11], [6, 10], [6, 9], // 38..43
  // Red completion (44..50)
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7] // 51
];

// Home stretch coordinates
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
const COLOR_CONFIG: Record<LudoColor, { name: string; hex: string; bg: string; border: string; ring: string; lightBg: string }> = {
  red: { name: 'Red', hex: '#ef4444', bg: 'bg-red-500', border: 'border-red-500', ring: 'ring-red-500', lightBg: 'bg-red-500/20' },
  green: { name: 'Green', hex: '#10b981', bg: 'bg-emerald-500', border: 'border-emerald-500', ring: 'ring-emerald-500', lightBg: 'bg-emerald-500/20' },
  yellow: { name: 'Yellow', hex: '#f59e0b', bg: 'bg-amber-400', border: 'border-amber-400', ring: 'ring-amber-400', lightBg: 'bg-amber-500/20' },
  blue: { name: 'Blue', hex: '#06b6d4', bg: 'bg-cyan-500', border: 'border-cyan-500', ring: 'ring-cyan-500', lightBg: 'bg-cyan-500/20' },
  purple: { name: 'Purple', hex: '#a855f7', bg: 'bg-purple-500', border: 'border-purple-500', ring: 'ring-purple-500', lightBg: 'bg-purple-500/20' },
  orange: { name: 'Orange', hex: '#f97316', bg: 'bg-orange-500', border: 'border-orange-500', ring: 'ring-orange-500', lightBg: 'bg-orange-500/20' },
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
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<{ id: string; username: string; avatar: string } | null>(null);
  const [turnTimeRemaining, setTurnTimeRemaining] = useState(15);
  const [activeReaction, setActiveReaction] = useState<{ [userId: string]: string }>({});

  const currentPlayer = gameState.players[gameState.currentTurnIndex];
  const isMyTurn = currentPlayer?.userId === user?.id;

  // Turn Countdown Timer
  useEffect(() => {
    setTurnTimeRemaining(15);
    const interval = setInterval(() => {
      setTurnTimeRemaining((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.currentTurnIndex, gameState.hasRolled]);

  // Trigger celebration on victory
  useEffect(() => {
    if (gameState.status === 'finished' && !confettiTriggered) {
      setConfettiTriggered(true);
      sound.playVictory();
      confetti({
        particleCount: 160,
        spread: 90,
        origin: { y: 0.6 }
      });
    }
  }, [gameState.status, confettiTriggered]);

  // Auto-move single legal token like Ludo King
  useEffect(() => {
    if (isMyTurn && gameState.hasRolled && gameState.validTokenMoves.length === 1 && !isRolling) {
      const autoMoveTimer = setTimeout(() => {
        handleMoveToken(gameState.validTokenMoves[0]);
      }, 500);
      return () => clearTimeout(autoMoveTimer);
    }
  }, [isMyTurn, gameState.hasRolled, gameState.validTokenMoves, isRolling]);

  const handleRollDice = () => {
    if (!isMyTurn || gameState.hasRolled || isRolling || !socket) return;
    setIsRolling(true);
    sound.playDiceRoll();

    setTimeout(() => {
      socket.emit('ludo_roll_dice', { roomId, userId: user!.id });
      setIsRolling(false);
    }, 550);
  };

  const handleMoveToken = (tokenId: number) => {
    if (!isMyTurn || !gameState.hasRolled || !socket) return;
    if (!gameState.validTokenMoves.includes(tokenId)) return;

    sound.playTokenStep();
    socket.emit('ludo_move_token', { roomId, userId: user!.id, tokenId });
  };

  const sendReaction = (emoji: string) => {
    if (!user) return;
    sound.playClick();
    setActiveReaction(prev => ({ ...prev, [user.id]: emoji }));
    setTimeout(() => {
      setActiveReaction(prev => ({ ...prev, [user.id]: '' }));
    }, 2500);
  };

  // Helper to render tokens inside cells
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

  // 3D Dice Face Rendering Helper
  const renderDicePips = (val: number | null) => {
    if (!val) return <span className="text-slate-400 text-xs font-bold">ROLL</span>;

    const pipClass = "w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner";
    switch (val) {
      case 1:
        return <div className="flex items-center justify-center w-full h-full"><div className="w-3.5 h-3.5 rounded-full bg-red-600 shadow-md" /></div>;
      case 2:
        return <div className="flex justify-between w-full p-2"><div className={pipClass} /><div className={`${pipClass} self-end`} /></div>;
      case 3:
        return <div className="flex justify-between w-full p-1.5"><div className={pipClass} /><div className={`${pipClass} self-center`} /><div className={`${pipClass} self-end`} /></div>;
      case 4:
        return <div className="grid grid-cols-2 gap-2 p-1.5"><div className={pipClass} /><div className={pipClass} /><div className={pipClass} /><div className={pipClass} /></div>;
      case 5:
        return <div className="relative w-full h-full p-1.5 flex flex-col justify-between"><div className="flex justify-between"><div className={pipClass} /><div className={pipClass} /></div><div className={`${pipClass} mx-auto`} /><div className="flex justify-between"><div className={pipClass} /><div className={pipClass} /></div></div>;
      case 6:
        return <div className="grid grid-cols-2 gap-x-2 gap-y-1 p-1.5"><div className={pipClass} /><div className={pipClass} /><div className={pipClass} /><div className={pipClass} /><div className={pipClass} /><div className={pipClass} /></div>;
      default:
        return <span>{val}</span>;
    }
  };

  // Player Pods
  const redPlayer = gameState.players.find(p => p.color === 'red');
  const greenPlayer = gameState.players.find(p => p.color === 'green');
  const bluePlayer = gameState.players.find(p => p.color === 'blue');
  const yellowPlayer = gameState.players.find(p => p.color === 'yellow');

  const renderPlayerPod = (player?: LudoPlayer, position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-left') => {
    if (!player) return null;
    const isPlayerTurn = currentPlayer?.userId === player.userId;
    const isThisMe = user?.id === player.userId;

    return (
      <div className={`flex items-center gap-2 p-1.5 sm:p-2 rounded-2xl transition-all border ${
        isPlayerTurn
          ? 'bg-slate-900 border-indigo-400 ring-2 ring-indigo-400/50 shadow-xl scale-105 z-20 animate-pulse'
          : 'bg-slate-950/80 border-slate-800/80'
      }`}>
        <div 
          onClick={() => {
            sound.playClick();
            setSelectedPlayerForModal({ id: player.userId, username: player.username, avatar: player.avatar });
          }}
          title="Click to view profile & add friend"
          className="relative cursor-pointer group/pod"
        >
          <img
            src={player.avatar}
            alt={player.username}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover bg-slate-900 ring-2 ${COLOR_CONFIG[player.color].ring} group-hover/pod:ring-white transition-all`}
          />
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase bg-slate-900 border border-slate-700 text-white">
            {player.color.charAt(0).toUpperCase()}
          </span>

          {/* Reaction Float */}
          {activeReaction[player.userId] && (
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
              {activeReaction[player.userId]}
            </div>
          )}
        </div>

        <div className="min-w-0 max-w-[90px] sm:max-w-[110px]">
          <p 
            onClick={() => {
              sound.playClick();
              setSelectedPlayerForModal({ id: player.userId, username: player.username, avatar: player.avatar });
            }}
            className="text-xs font-black text-white truncate cursor-pointer hover:text-indigo-400"
          >
            {player.username} {isThisMe && <span className="text-[10px] text-indigo-400">(You)</span>}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${COLOR_CONFIG[player.color].bg}`} />
            <span className="text-[10px] text-slate-400 font-semibold capitalize">{player.color}</span>
          </div>
        </div>

        {/* Turn Timer Badge */}
        {isPlayerTurn && (
          <div className="ml-auto px-2 py-1 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-[10px] font-black flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400 animate-spin" />
            {turnTimeRemaining}s
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center space-y-3 max-w-4xl mx-auto select-none">
      
      {/* Top Status & Reaction Banner */}
      <div className="w-full glass-card bg-slate-900/90 border border-slate-800 rounded-3xl px-4 py-2.5 flex items-center justify-between gap-2 shadow-xl">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${COLOR_CONFIG[currentPlayer.color]?.bg || 'bg-indigo-600'} text-white shadow-md`}>
            <Crown className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Turn</p>
            <p className="text-xs sm:text-sm font-black text-white truncate">
              {currentPlayer?.username} ({COLOR_CONFIG[currentPlayer?.color]?.name})
            </p>
          </div>
        </div>

        {/* Action log message */}
        <div className="hidden sm:block bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 max-w-xs text-center">
          <p className="text-[11px] font-bold text-indigo-300 truncate">
            {gameState.lastAction || 'Roll the dice!'}
          </p>
        </div>

        {/* Quick Reactions Bar */}
        <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          {['😂', '🔥', '💀', '🎉', '👑'].map((em) => (
            <button
              key={em}
              onClick={() => sendReaction(em)}
              className="text-base hover:scale-125 transition-transform px-1"
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Top Player Pods Grid (Mobile & Web) */}
      <div className="w-full grid grid-cols-2 gap-2">
        {renderPlayerPod(redPlayer, 'top-left')}
        {renderPlayerPod(greenPlayer, 'top-right')}
      </div>

      {/* MAIN LUDO BOARD (Ludo King High-Gloss Style) */}
      <div className="relative w-full aspect-square max-w-[540px] bg-gradient-to-b from-[#161c2d] to-[#0c101c] rounded-3xl p-2 sm:p-3 border-4 border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden">
        
        <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[1.5px] bg-[#07090e] rounded-2xl p-1 overflow-hidden shadow-inner">
          
          {/* ================= RED BASE (TOP-LEFT) ================= */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-red-500/25 via-red-950/40 to-slate-950 border-2 border-red-500/80 p-2 sm:p-3 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-black text-red-400 tracking-wider">
              <span>RED BASE</span>
              <Star className="w-3.5 h-3.5 fill-current text-red-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/90 rounded-2xl border border-red-500/40 shadow-inner">
              {redPlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'red' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`red-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-gradient-to-tr from-red-600 to-rose-400 shadow-lg ring-2 ring-white/80 ${
                            isValid ? 'ring-4 ring-white scale-110 animate-bounce cursor-pointer shadow-red-500/80' : 'opacity-95'
                          }`
                        : 'bg-slate-900/80 border border-red-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= TOP CENTER TRACK ================= */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1.5px]">
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
                      ? 'bg-gradient-to-b from-emerald-600 to-emerald-500 border border-emerald-400'
                      : isGreenStart
                      ? 'bg-emerald-700/60 border border-emerald-400'
                      : 'bg-slate-900/90 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-80" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-xl ring-2 ring-white transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer shadow-lg' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ================= GREEN BASE (TOP-RIGHT) ================= */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-emerald-950/40 to-slate-950 border-2 border-emerald-500/80 p-2 sm:p-3 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-black text-emerald-400 tracking-wider">
              <span>GREEN BASE</span>
              <Star className="w-3.5 h-3.5 fill-current text-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/90 rounded-2xl border border-emerald-500/40 shadow-inner">
              {greenPlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'green' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`green-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-gradient-to-tr from-emerald-600 to-green-400 shadow-lg ring-2 ring-white/80 ${
                            isValid ? 'ring-4 ring-white scale-110 animate-bounce cursor-pointer shadow-emerald-500/80' : 'opacity-95'
                          }`
                        : 'bg-slate-900/80 border border-emerald-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= MIDDLE LEFT TRACK ================= */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1.5px]">
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
                      ? 'bg-gradient-to-r from-red-600 to-red-500 border border-red-400'
                      : isRedStart
                      ? 'bg-red-700/60 border border-red-400'
                      : 'bg-slate-900/90 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-80" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-xl ring-2 ring-white transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer shadow-lg' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ================= CENTER VICTORY HOME (Ludo King 4-Triangle Style) ================= */}
          <div className="col-span-3 row-span-3 rounded-xl bg-slate-950 border-2 border-amber-400 relative overflow-hidden flex items-center justify-center shadow-2xl">
            {/* Top Green Triangle */}
            <div 
              className="absolute inset-0 bg-gradient-to-b from-emerald-500 to-emerald-600 shadow-md"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }}
            />
            {/* Right Yellow Triangle */}
            <div 
              className="absolute inset-0 bg-gradient-to-l from-amber-400 to-yellow-500 shadow-md"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }}
            />
            {/* Bottom Blue Triangle */}
            <div 
              className="absolute inset-0 bg-gradient-to-t from-cyan-500 to-blue-600 shadow-md"
              style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }}
            />
            {/* Left Red Triangle */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-red-500 to-rose-600 shadow-md"
              style={{ clipPath: 'polygon(0 0, 0 100%, 50% 50%)' }}
            />

            {/* Golden Center Crest */}
            <div className="relative z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-amber-500 p-0.5 shadow-xl flex items-center justify-center border border-amber-100">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-500 to-amber-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-100 drop-shadow animate-bounce-soft" />
              </div>
            </div>
          </div>

          {/* ================= MIDDLE RIGHT TRACK ================= */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1.5px]">
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
                      ? 'bg-gradient-to-l from-amber-500 to-amber-400 border border-amber-300'
                      : isYellowStart
                      ? 'bg-amber-600/60 border border-amber-300'
                      : 'bg-slate-900/90 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-80" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-xl ring-2 ring-white transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer shadow-lg' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ================= BLUE BASE (BOTTOM-LEFT) ================= */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-cyan-500/25 via-blue-950/40 to-slate-950 border-2 border-cyan-500/80 p-2 sm:p-3 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-black text-cyan-400 tracking-wider">
              <span>BLUE BASE</span>
              <Star className="w-3.5 h-3.5 fill-current text-cyan-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/90 rounded-2xl border border-cyan-500/40 shadow-inner">
              {bluePlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'blue' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`blue-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-gradient-to-tr from-cyan-600 to-blue-400 shadow-lg ring-2 ring-white/80 ${
                            isValid ? 'ring-4 ring-white scale-110 animate-bounce cursor-pointer shadow-cyan-500/80' : 'opacity-95'
                          }`
                        : 'bg-slate-900/80 border border-cyan-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= BOTTOM CENTER TRACK ================= */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1.5px]">
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
                      ? 'bg-gradient-to-t from-cyan-600 to-cyan-500 border border-cyan-400'
                      : isBlueStart
                      ? 'bg-cyan-700/60 border border-cyan-400'
                      : 'bg-slate-900/90 border border-slate-800'
                  }`}
                >
                  {isStar && <Star className="w-3 h-3 text-amber-400 fill-current opacity-80" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-xl ring-2 ring-white transition-transform ${
                          COLOR_CONFIG[player.color].bg
                        } ${isValid ? 'ring-4 ring-white animate-bounce scale-125 z-20 cursor-pointer shadow-lg' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ================= YELLOW BASE (BOTTOM-RIGHT) ================= */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-gradient-to-br from-amber-500/25 via-yellow-950/40 to-slate-950 border-2 border-amber-500/80 p-2 sm:p-3 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-[11px] font-black text-amber-400 tracking-wider">
              <span>YELLOW BASE</span>
              <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-950/90 rounded-2xl border border-amber-500/40 shadow-inner">
              {yellowPlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'yellow' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`yellow-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `bg-gradient-to-tr from-amber-500 to-yellow-300 shadow-lg ring-2 ring-white/80 ${
                            isValid ? 'ring-4 ring-white scale-110 animate-bounce cursor-pointer shadow-amber-500/80' : 'opacity-95'
                          }`
                        : 'bg-slate-900/80 border border-amber-500/30'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Player Pods Grid */}
      <div className="w-full grid grid-cols-2 gap-2">
        {renderPlayerPod(bluePlayer, 'bottom-left')}
        {renderPlayerPod(yellowPlayer, 'bottom-right')}
      </div>

      {/* 3D DICE CONTROLLER & ROLL BUTTON */}
      <div className="w-full glass-card bg-slate-900 border border-indigo-500/40 rounded-3xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          {/* Animated 3D Dice */}
          <div 
            onClick={isMyTurn && !gameState.hasRolled && !isRolling ? handleRollDice : undefined}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-white via-slate-100 to-slate-200 border-2 border-slate-300 shadow-2xl flex items-center justify-center cursor-pointer transition-transform ${
              isRolling ? 'dice-animate' : isMyTurn && !gameState.hasRolled ? 'scale-105 ring-4 ring-emerald-400' : ''
            }`}
          >
            {renderDicePips(gameState.currentDiceValue)}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LUDO DICE</p>
            <p className="text-xs sm:text-sm font-black text-white">
              {gameState.currentDiceValue ? `Rolled ${gameState.currentDiceValue}!` : isMyTurn ? 'Tap Dice or Roll' : 'Waiting...'}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {isMyTurn ? (
          <button
            onClick={handleRollDice}
            disabled={gameState.hasRolled || isRolling}
            className={`px-6 sm:px-8 py-3 rounded-2xl font-black text-xs sm:text-sm tracking-wide shadow-xl flex items-center gap-2 transition-all ${
              !gameState.hasRolled && !isRolling
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:scale-105 active:scale-95 text-white shadow-emerald-500/30 animate-pulse cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isRolling ? 'Rolling...' : gameState.hasRolled ? 'Pick Token' : 'Roll Dice!'}
          </button>
        ) : (
          <div className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
            {currentPlayer?.username}'s Turn
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
              <h2 className="text-2xl font-black text-white">LUDO CHAMPION! 🎉</h2>
              <p className="text-xs text-indigo-300">Congratulations to the podium winners!</p>
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
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Rematch
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-all"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Profile & Add Friend Modal */}
      {selectedPlayerForModal && (
        <PlayerProfileModal
          userId={selectedPlayerForModal.id}
          username={selectedPlayerForModal.username}
          avatar={selectedPlayerForModal.avatar}
          onClose={() => setSelectedPlayerForModal(null)}
        />
      )}

    </div>
  );
};
