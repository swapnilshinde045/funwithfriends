import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Room, RoomMember, LudoGameState, SnakeGameState } from '../types';
import { apiRequest } from '../utils/api';
import { RoomLobbyView } from '../components/lobby/RoomLobbyView';
import { LudoBoard } from '../games/ludo/LudoBoard';
import { SnakeBoard } from '../games/snakes/SnakeBoard';
import { RoomChat } from '../components/chat/RoomChat';
import { FriendsModal } from '../components/friends/FriendsModal';
import { sound } from '../utils/sound';
import { MessageSquare, Gamepad2, Users, ArrowLeft } from 'lucide-react';

interface GameRoomPageProps {
  roomCode: string;
  onLeave: () => void;
}

export const GameRoomPage: React.FC<GameRoomPageProps> = ({ roomCode, onLeave }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [ludoState, setLudoState] = useState<LudoGameState | null>(null);
  const [snakeState, setSnakeState] = useState<SnakeGameState | null>(null);
  const [friendsModalOpen, setFriendsModalOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Room Information
  useEffect(() => {
    let isMounted = true;

    const fetchRoom = async () => {
      try {
        setLoading(true);
        const res = await apiRequest<{ room: Room & { members: RoomMember[] } }>(`/rooms/code/${roomCode}`);
        if (!isMounted) return;
        setRoom(res.room);
        setMembers(res.room.members || []);
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err.message || 'Room not found');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchRoom();

    return () => {
      isMounted = false;
    };
  }, [roomCode]);

  // Join Room Socket Channel
  useEffect(() => {
    if (!socket || !room || !user) return;

    socket.emit('join_room', { roomId: room.id, user });

    const handleRoomUpdated = (data: { room: Room & { members: RoomMember[] } }) => {
      setRoom(data.room);
      setMembers(data.room.members || []);
    };

    const handleMembersUpdated = (updatedMembers: RoomMember[]) => {
      setMembers(updatedMembers);
    };

    const handleGameStarted = (data: { gameType: string; gameState: any }) => {
      sound.playVictory();
      if (data.gameType === 'ludo') {
        setLudoState(data.gameState);
      } else if (data.gameType === 'snakes') {
        setSnakeState(data.gameState);
      }
      setRoom((prev) => (prev ? { ...prev, status: 'in_progress' } : null));
    };

    const handleLudoState = (state: LudoGameState) => {
      setLudoState(state);
    };

    const handleSnakesState = (state: SnakeGameState) => {
      setSnakeState(state);
    };

    const handleRematch = () => {
      setLudoState(null);
      setSnakeState(null);
      setRoom((prev) => (prev ? { ...prev, status: 'waiting' } : null));
    };

    const handlePlayerKicked = ({ targetUserId }: { targetUserId: string }) => {
      if (targetUserId === user.id) {
        alert('You have been removed from the room by the host.');
        onLeave();
      }
    };

    const handleRoomError = ({ message }: { message: string }) => {
      alert(message);
    };

    socket.on('room_updated', handleRoomUpdated);
    socket.on('members_updated', handleMembersUpdated);
    socket.on('game_started', handleGameStarted);
    socket.on('ludo_state_update', handleLudoState);
    socket.on('snakes_state_update', handleSnakesState);
    socket.on('rematch_accepted', handleRematch);
    socket.on('player_kicked', handlePlayerKicked);
    socket.on('room_error', handleRoomError);

    return () => {
      socket.off('room_updated', handleRoomUpdated);
      socket.off('members_updated', handleMembersUpdated);
      socket.off('game_started', handleGameStarted);
      socket.off('ludo_state_update', handleLudoState);
      socket.off('snakes_state_update', handleSnakesState);
      socket.off('rematch_accepted', handleRematch);
      socket.off('player_kicked', handlePlayerKicked);
      socket.off('room_error', handleRoomError);
    };
  }, [socket, room?.id, user]);

  const handleStartGame = () => {
    if (!socket || !room || !user) return;
    sound.playClick();
    socket.emit('start_game', { roomId: room.id, hostId: user.id });
  };

  const handleToggleReady = () => {
    if (!socket || !room || !user) return;
    sound.playClick();
    socket.emit('toggle_ready', { roomId: room.id, userId: user.id });
  };

  const handleKickPlayer = (targetUserId: string) => {
    if (!socket || !room || !user) return;
    sound.playClick();
    socket.emit('kick_player', { roomId: room.id, hostId: user.id, targetUserId });
  };

  const handleLeaveRoom = () => {
    if (socket && room && user) {
      socket.emit('leave_room', { roomId: room.id, userId: user.id });
    }
    sound.playClick();
    onLeave();
  };

  const handleRematchRequest = () => {
    if (!socket || !room || !user) return;
    sound.playClick();
    socket.emit('request_rematch', { roomId: room.id, hostId: user.id });
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Entering game room {roomCode}...</p>
      </div>
    );
  }

  if (errorMsg || !room) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-center p-4">
        <div className="p-4 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
          <Gamepad2 className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-white">{errorMsg || 'Room not found'}</h2>
        <p className="text-xs text-slate-400 max-w-sm">
          The room code may be invalid or the host has closed the room.
        </p>
        <button
          onClick={onLeave}
          className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const isPlayingGame = room.status === 'in_progress' || !!ludoState || !!snakeState;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Breadcrumb & Mobile Chat Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleLeaveRoom}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Exit to Dashboard
        </button>

        <button
          onClick={() => setMobileChatOpen(!mobileChatOpen)}
          className="lg:hidden px-3 py-1.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center gap-1.5"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          {mobileChatOpen ? 'Hide Chat' : 'Room Chat'}
        </button>
      </div>

      {/* Main Content Layout: Game Area + Side Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Lobby or Active Board */}
        <div className="lg:col-span-2">
          {!isPlayingGame ? (
            <RoomLobbyView
              room={room}
              members={members}
              onStartGame={handleStartGame}
              onToggleReady={handleToggleReady}
              onKickPlayer={handleKickPlayer}
              onOpenFriendsInvite={() => setFriendsModalOpen(true)}
              onLeaveRoom={handleLeaveRoom}
            />
          ) : room.room_type === 'ludo' && ludoState ? (
            <LudoBoard
              roomId={room.id}
              gameState={ludoState}
              onRematch={handleRematchRequest}
              onExit={handleLeaveRoom}
            />
          ) : room.room_type === 'snakes' && snakeState ? (
            <SnakeBoard
              roomId={room.id}
              gameState={snakeState}
              onRematch={handleRematchRequest}
              onExit={handleLeaveRoom}
            />
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p>Loading game state...</p>
            </div>
          )}
        </div>

        {/* Right 1 Column: Room Live Chat */}
        <div className={`h-[600px] lg:block ${mobileChatOpen ? 'block' : 'hidden lg:block'}`}>
          <RoomChat roomId={room.id} />
        </div>

      </div>

      {/* Friends Modal for Direct Invites */}
      <FriendsModal
        isOpen={friendsModalOpen}
        onClose={() => setFriendsModalOpen(false)}
        activeRoomCode={room.room_code}
        activeRoomType={room.room_type}
      />

    </div>
  );
};
