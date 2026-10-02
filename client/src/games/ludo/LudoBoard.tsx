import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  RotateCcw, 
  Crown, 
  Sparkles, 
  Star, 
  Clock, 
  MessageCircle, 
  Flame
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

// Color theme details for Ludo King
const COLOR_THEME: Record<LudoColor, { 
  name: string; 
  hex: string; 
  baseBg: string; 
  trackBg: string; 
  border: string; 
  pawnClass: string; 
  badgeBg: string;
}> = {
  red: { 
    name: 'Red', 
    hex: '#e52521', 
    baseBg: 'bg-[#e52521]', 
    trackBg: 'bg-[#e52521]', 
    border: 'border-[#e52521]', 
    pawnClass: 'pawn-3d-red',
    badgeBg: 'bg-red-600'
  },
  green: { 
    name: 'Green', 
    hex: '#009b4c', 
    baseBg: 'bg-[#009b4c]', 
    trackBg: 'bg-[#009b4c]', 
    border: 'border-[#009b4c]', 
    pawnClass: 'pawn-3d-green',
    badgeBg: 'bg-emerald-600'
  },
  yellow: { 
    name: 'Yellow', 
    hex: '#fdb813', 
    baseBg: 'bg-[#fdb813]', 
    trackBg: 'bg-[#fdb813]', 
    border: 'border-[#fdb813]', 
    pawnClass: 'pawn-3d-yellow',
    badgeBg: 'bg-amber-500'
  },
  blue: { 
    name: 'Blue', 
    hex: '#0072bc', 
    baseBg: 'bg-[#0072bc]', 
    trackBg: 'bg-[#0072bc]', 
    border: 'border-[#0072bc]', 
    pawnClass: 'pawn-3d-blue',
    badgeBg: 'bg-blue-600'
  },
  purple: { 
    name: 'Purple', 
    hex: '#8b5cf6', 
    baseBg: 'bg-purple-600', 
    trackBg: 'bg-purple-600', 
    border: 'border-purple-600', 
    pawnClass: 'pawn-3d-blue',
    badgeBg: 'bg-purple-600'
  },
  orange: { 
    name: 'Orange', 
    hex: '#f97316', 
    baseBg: 'bg-orange-500', 
    trackBg: 'bg-orange-500', 
    border: 'border-orange-500', 
    pawnClass: 'pawn-3d-yellow',
    badgeBg: 'bg-orange-500'
  },
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
    if (!val) return <span className="text-slate-600 text-xs font-black">ROLL</span>;

    const pipClass = "w-2.5 h-2.5 rounded-full bg-slate-900 shadow-inner";
    switch (val) {
      case 1:
        return <div className="flex items-center justify-center w-full h-full"><div className="w-4 h-4 rounded-full bg-red-600 shadow-md" /></div>;
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

  const renderPlayerPod = (player?: LudoPlayer) => {
    if (!player) return null;
    const isPlayerTurn = currentPlayer?.userId === player.userId;
    const isThisMe = user?.id === player.userId;
    const theme = COLOR_THEME[player.color];

    return (
      <div className={`flex items-center gap-2.5 p-2 rounded-2xl transition-all ${
        isPlayerTurn
          ? 'bg-amber-50 border-2 border-amber-500 ring-4 ring-amber-200 shadow-md scale-102 z-20'
          : 'bg-white border border-slate-200 shadow-xs'
      }`}>
        <div 
          onClick={() => {
            sound.playClick();
            setSelectedPlayerForModal({ id: player.userId, username: player.username, avatar: player.avatar });
          }}
          title="Click to view profile & add friend"
          className="relative cursor-pointer group"
        >
          <img
            src={player.avatar}
            alt={player.username}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl object-cover bg-slate-100 border-2 ${
              isPlayerTurn ? 'border-amber-500 ring-2 ring-amber-300' : theme.border
            } group-hover:scale-105 transition-all`}
          />
          <span className={`absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase text-white ${theme.badgeBg}`}>
            {player.color.charAt(0).toUpperCase()}
          </span>

          {/* Reaction Float */}
          {activeReaction[player.userId] && (
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-2xl animate-bounce">
              {activeReaction[player.userId]}
            </div>
          )}
        </div>

        <div className="min-w-0 max-w-[90px] sm:max-w-[120px]">
          <p 
            onClick={() => {
              sound.playClick();
              setSelectedPlayerForModal({ id: player.userId, username: player.username, avatar: player.avatar });
            }}
            className="text-xs font-black text-slate-900 truncate cursor-pointer hover:text-indigo-600 transition-colors"
          >
            {player.username} {isThisMe && <span className="text-[10px] text-indigo-600 font-bold">(You)</span>}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2.5 h-2.5 rounded-full ${theme.baseBg} shadow-xs`} />
            <span className="text-[10px] text-slate-500 font-bold capitalize">{player.color}</span>
          </div>
        </div>

        {/* Turn Timer Badge */}
        {isPlayerTurn && (
          <div className="ml-auto px-2 py-1 rounded-xl bg-amber-500 text-white text-[11px] font-black flex items-center gap-1 shadow-xs">
            <Clock className="w-3.5 h-3.5 text-white animate-spin" />
            {turnTimeRemaining}s
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center space-y-3 max-w-2xl mx-auto select-none pb-6">
      
      {/* Top Banner: Turn Alert & Quick Reactions */}
      <div className="w-full bg-white rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${COLOR_THEME[currentPlayer.color]?.badgeBg || 'bg-amber-500'} text-white shadow-xs`}>
            <Crown className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Active Turn</p>
            <p className="text-xs sm:text-sm font-black text-slate-900 truncate">
              {currentPlayer?.username} ({COLOR_THEME[currentPlayer?.color]?.name})
            </p>
          </div>
        </div>

        {/* Action log message */}
        <div className="hidden sm:block bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 max-w-xs text-center">
          <p className="text-[11px] font-bold text-indigo-600 truncate">
            {gameState.lastAction || 'Roll the dice!'}
          </p>
        </div>

        {/* Quick Reactions Bar */}
        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 p-1 rounded-xl">
          {['😂', '🔥', '💀', '🎉', '👑'].map((em) => (
            <button
              key={em}
              onClick={() => sendReaction(em)}
              className="text-base hover:scale-130 active:scale-95 transition-transform px-1 cursor-pointer"
            >
              {em}
            </button>
          ))}
        </div>
      </div>

      {/* Top Player Pods Grid (Red & Green) */}
      <div className="w-full grid grid-cols-2 gap-2">
        {renderPlayerPod(redPlayer)}
        {renderPlayerPod(greenPlayer)}
      </div>

      {/* ========================================================================= */}
      {/* AUTHENTIC LUDO KING BOARD (Classic Wood Frame & Crisp Ivory Track Grid) */}
      {/* ========================================================================= */}
      <div className="relative w-full aspect-square max-w-[500px] arcade-board-frame rounded-3xl p-2.5 sm:p-3 shadow-xl flex flex-col justify-between overflow-hidden">
        
        <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-[1px] bg-slate-300 rounded-2xl p-1 overflow-hidden shadow-inner">
          
          {/* ================= RED BASE (TOP-LEFT) ================= */}
          <div className="col-span-6 row-span-6 rounded-2xl bg-[#e52521] border-2 border-red-700 p-2 sm:p-3 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] font-black text-white tracking-wider">
              <span>RED</span>
              <Star className="w-3.5 h-3.5 fill-current text-white" />
            </div>
            {/* White Interior Yard */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-2xl border-2 border-red-200 shadow-inner">
              {redPlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'red' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`red-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `pawn-3d-red cursor-pointer ${isValid ? 'token-movable ring-4 ring-white z-20' : ''}`
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white drop-shadow">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= TOP CENTER TRACK ================= */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-300">
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
                  className={`relative flex items-center justify-center transition-colors ${
                    isHomeCol
                      ? 'bg-[#009b4c]'
                      : isGreenStart
                      ? 'bg-[#009b4c]'
                      : 'bg-white'
                  }`}
                >
                  {isStar && <Star className="w-3.5 h-3.5 text-amber-500 fill-current drop-shadow" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white ${
                          COLOR_THEME[player.color].pawnClass
                        } ${isValid ? 'token-movable ring-4 ring-white z-20 cursor-pointer' : 'z-10'}`}
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
          <div className="col-span-6 row-span-6 rounded-2xl bg-[#009b4c] border-2 border-emerald-800 p-2 sm:p-3 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] font-black text-white tracking-wider">
              <span>GREEN</span>
              <Star className="w-3.5 h-3.5 fill-current text-white" />
            </div>
            {/* White Interior Yard */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-2xl border-2 border-emerald-200 shadow-inner">
              {greenPlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'green' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`green-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `pawn-3d-green cursor-pointer ${isValid ? 'token-movable ring-4 ring-white z-20' : ''}`
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white drop-shadow">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= MIDDLE LEFT TRACK ================= */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-slate-300">
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
                  className={`relative flex items-center justify-center ${
                    isHomeRow
                      ? 'bg-[#e52521]'
                      : isRedStart
                      ? 'bg-[#e52521]'
                      : 'bg-white'
                  }`}
                >
                  {isStar && <Star className="w-3.5 h-3.5 text-amber-500 fill-current drop-shadow" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white ${
                          COLOR_THEME[player.color].pawnClass
                        } ${isValid ? 'token-movable ring-4 ring-white z-20 cursor-pointer' : 'z-10'}`}
                      >
                        {token.id + 1}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* ================= CENTER VICTORY HOME (4-Triangle Classic) ================= */}
          <div className="col-span-3 row-span-3 rounded-lg bg-slate-900 border-2 border-amber-400 relative overflow-hidden flex items-center justify-center shadow-md">
            {/* Top Green Triangle */}
            <div 
              className="absolute inset-0 bg-[#009b4c]"
              style={{ clipPath: 'polygon(0 0, 100% 0, 50% 50%)' }}
            />
            {/* Right Yellow Triangle */}
            <div 
              className="absolute inset-0 bg-[#fdb813]"
              style={{ clipPath: 'polygon(100% 0, 100% 100%, 50% 50%)' }}
            />
            {/* Bottom Blue Triangle */}
            <div 
              className="absolute inset-0 bg-[#0072bc]"
              style={{ clipPath: 'polygon(0 100%, 100% 100%, 50% 50%)' }}
            />
            {/* Left Red Triangle */}
            <div 
              className="absolute inset-0 bg-[#e52521]"
              style={{ clipPath: 'polygon(0 0, 0 100%, 50% 50%)' }}
            />

            {/* Golden Center Crest */}
            <div className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-amber-300 via-yellow-100 to-amber-500 p-0.5 shadow-xl flex items-center justify-center border border-amber-100">
              <div className="w-full h-full rounded-full bg-gradient-to-b from-amber-500 to-amber-600 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-amber-100 drop-shadow animate-bounce-soft" />
              </div>
            </div>
          </div>

          {/* ================= MIDDLE RIGHT TRACK ================= */}
          <div className="col-span-6 row-span-3 grid grid-cols-6 grid-rows-3 gap-[1px] bg-slate-300">
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
                  className={`relative flex items-center justify-center ${
                    isHomeRow
                      ? 'bg-[#fdb813]'
                      : isYellowStart
                      ? 'bg-[#fdb813]'
                      : 'bg-white'
                  }`}
                >
                  {isStar && <Star className="w-3.5 h-3.5 text-amber-500 fill-current drop-shadow" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white ${
                          COLOR_THEME[player.color].pawnClass
                        } ${isValid ? 'token-movable ring-4 ring-white z-20 cursor-pointer' : 'z-10'}`}
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
          <div className="col-span-6 row-span-6 rounded-2xl bg-[#0072bc] border-2 border-blue-800 p-2 sm:p-3 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] font-black text-white tracking-wider">
              <span>BLUE</span>
              <Star className="w-3.5 h-3.5 fill-current text-white" />
            </div>
            {/* White Interior Yard */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-2xl border-2 border-blue-200 shadow-inner">
              {bluePlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'blue' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`blue-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `pawn-3d-blue cursor-pointer ${isValid ? 'token-movable ring-4 ring-white z-20' : ''}`
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-white drop-shadow">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ================= BOTTOM CENTER TRACK ================= */}
          <div className="col-span-3 row-span-6 grid grid-cols-3 grid-rows-6 gap-[1px] bg-slate-300">
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
                  className={`relative flex items-center justify-center ${
                    isHomeCol
                      ? 'bg-[#0072bc]'
                      : isBlueStart
                      ? 'bg-[#0072bc]'
                      : 'bg-white'
                  }`}
                >
                  {isStar && <Star className="w-3.5 h-3.5 text-amber-500 fill-current drop-shadow" />}
                  {tokens.map(({ player, token }) => {
                    const isValid = isMyTurn && player.userId === user?.id && gameState.validTokenMoves.includes(token.id);
                    return (
                      <button
                        key={`tok-${player.color}-${token.id}`}
                        onClick={() => isValid && handleMoveToken(token.id)}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white ${
                          COLOR_THEME[player.color].pawnClass
                        } ${isValid ? 'token-movable ring-4 ring-white z-20 cursor-pointer' : 'z-10'}`}
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
          <div className="col-span-6 row-span-6 rounded-2xl bg-[#fdb813] border-2 border-amber-600 p-2 sm:p-3 flex flex-col justify-between shadow-md">
            <div className="flex items-center justify-between text-[11px] font-black text-slate-900 tracking-wider">
              <span>YELLOW</span>
              <Star className="w-3.5 h-3.5 fill-current text-slate-900" />
            </div>
            {/* White Interior Yard */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-2xl border-2 border-amber-200 shadow-inner">
              {yellowPlayer?.tokens.map(token => {
                const isValid = isMyTurn && currentPlayer.color === 'yellow' && gameState.validTokenMoves.includes(token.id);
                return (
                  <div
                    key={`yellow-token-${token.id}`}
                    onClick={() => isValid && handleMoveToken(token.id)}
                    className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-all ${
                      token.stepCount === -1
                        ? `pawn-3d-yellow cursor-pointer ${isValid ? 'token-movable ring-4 ring-white z-20' : ''}`
                        : 'bg-slate-100 border border-slate-200'
                    }`}
                  >
                    {token.stepCount === -1 && <span className="text-[10px] sm:text-xs font-black text-slate-900 drop-shadow">{token.id + 1}</span>}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Player Pods Grid (Blue & Yellow) */}
      <div className="w-full grid grid-cols-2 gap-2">
        {renderPlayerPod(bluePlayer)}
        {renderPlayerPod(yellowPlayer)}
      </div>

      {/* ========================================================================= */}
      {/* 3D TACTILE DICE CONTROLLER & LUDO KING "ROLL" BUTTON */}
      {/* ========================================================================= */}
      <div className="w-full bg-white rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          {/* Animated 3D Dice */}
          <div 
            onClick={isMyTurn && !gameState.hasRolled && !isRolling ? handleRollDice : undefined}
            className={`dice-cube flex items-center justify-center cursor-pointer transition-transform ${
              isRolling ? 'dice-animate' : isMyTurn && !gameState.hasRolled ? 'scale-105 ring-4 ring-amber-400' : ''
            }`}
          >
            {renderDicePips(gameState.currentDiceValue)}
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">DICE</p>
            <p className="text-xs sm:text-sm font-black text-slate-900">
              {gameState.currentDiceValue ? `Rolled ${gameState.currentDiceValue}!` : isMyTurn ? 'Tap Dice or Roll' : 'Waiting...'}
            </p>
          </div>
        </div>

        {/* Tactile Arcade Action Button */}
        {isMyTurn ? (
          <button
            onClick={handleRollDice}
            disabled={gameState.hasRolled || isRolling}
            className={`px-6 sm:px-8 py-3.5 rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase text-white shadow-md flex items-center gap-2 transition-all ${
              !gameState.hasRolled && !isRolling
                ? 'btn-arcade-green cursor-pointer'
                : 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            {isRolling ? 'Rolling...' : gameState.hasRolled ? 'Pick Token' : 'Roll Dice!'}
          </button>
        ) : (
          <div className="text-xs font-bold px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200">
            {currentPlayer?.username}'s Turn
          </div>
        )}
      </div>

      {/* GAME OVER PODIUM MODAL */}
      {gameState.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in-95">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl text-center space-y-5 border border-slate-200">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl animate-bounce-soft">
              <Trophy className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-slate-900">LUDO CHAMPION! 🎉</h2>
              <p className="text-xs text-amber-600 font-bold">Congratulations to the podium winners!</p>
            </div>

            <div className="space-y-2.5">
              {gameState.winners.map((win) => (
                <div
                  key={win.userId}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    win.rank === 1
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : win.rank === 2
                      ? 'bg-slate-100 border-slate-300 text-slate-800'
                      : 'bg-orange-50 border-orange-300 text-orange-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black">
                      {win.rank === 1 ? '🥇' : win.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <span className="font-bold text-sm text-slate-900">{win.username}</span>
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
                className="btn-arcade-green px-6 py-3 rounded-2xl text-white font-black text-sm shadow-md flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Rematch
              </button>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-300 transition-all cursor-pointer"
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
