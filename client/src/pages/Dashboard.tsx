import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Crown, 
  Sparkles, 
  Users, 
  Play, 
  Plus, 
  LogIn, 
  Music, 
  Radio, 
  Flame, 
  MessageSquare, 
  Clock, 
  Share2,
  Lock,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { FriendUser } from '../types';
import { apiRequest } from '../utils/api';
import { sound } from '../utils/sound';

interface DashboardProps {
  onJoinRoom: (roomCode: string) => void;
  onOpenFriendsModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onJoinRoom,
  onOpenFriendsModal,
  onNavigateTab
}) => {
  const { user } = useAuth();
  const { openDirectChat } = useSocket();
  const [activeRooms, setActiveRooms] = useState<any[]>([]);
  const [onlineFriends, setOnlineFriends] = useState<FriendUser[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGameType, setSelectedGameType] = useState<'ludo' | 'snakes' | 'music'>('ludo');
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState(4);
  const [isPrivateRoom, setIsPrivateRoom] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [roomsRes, friendsRes] = await Promise.all([
        apiRequest<{ rooms: any[] }>('/rooms/active'),
        apiRequest<{ friends: FriendUser[] }>('/friends/list'),
      ]);
      setActiveRooms(roomsRes.rooms);
      setOnlineFriends(friendsRes.friends.filter(f => f.status !== 'offline'));
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleCreateRoom = async (gameType?: 'ludo' | 'snakes' | 'music') => {
    const type = gameType || selectedGameType;
    const maxP = type === 'ludo' ? selectedMaxPlayers : type === 'snakes' ? Math.min(selectedMaxPlayers, 4) : 20;

    try {
      setIsCreating(true);
      sound.playClick();
      const res = await apiRequest<{ room: any }>('/rooms/create', {
        method: 'POST',
        body: JSON.stringify({
          roomType: type,
          maxPlayers: maxP,
          isPrivate: isPrivateRoom,
        }),
      });

      setShowCreateModal(false);
      onJoinRoom(res.room.room_code);
    } catch (err: any) {
      alert(err.message || 'Failed to create room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    sound.playClick();
    onJoinRoom(joinCodeInput.trim().toUpperCase());
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 animate-in fade-in">
      
      {/* HERO BANNER */}
      <div className="relative overflow-hidden glass-card bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 animate-spin-slow" /> Multiplayer Playground
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Play With Your Friends 🎮
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
            Create private lobbies, roll the dice in real-time Ludo and Snakes & Ladders, chat with the squad, and vibe to synchronized music watch parties.
          </p>

          {/* Quick Action Bar: Join with Code & Create Room */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <form onSubmit={handleJoinByCode} className="flex items-center gap-2 bg-slate-950/90 border border-indigo-500/50 rounded-2xl p-1.5 shadow-xl max-w-xs w-full">
              <input
                type="text"
                maxLength={6}
                placeholder="ENTER 6-CHAR CODE..."
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="bg-transparent text-white font-mono font-bold text-sm tracking-widest px-3 py-2 w-full focus:outline-none placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-40"
              >
                Join
              </button>
            </form>

            <button
              onClick={() => {
                sound.playClick();
                setShowCreateModal(true);
              }}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:scale-105 active:scale-95 text-white font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-pink-500/25 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Create Private Room
            </button>
          </div>
        </div>

        {/* Decorative Glowing Badges in Background */}
        <div className="absolute right-4 bottom-4 md:right-12 md:bottom-8 opacity-20 md:opacity-40 pointer-events-none">
          <Gamepad2 className="w-48 h-48 sm:w-64 sm:h-64 text-indigo-400 animate-pulse-slow" />
        </div>
      </div>

      {/* GAME CARDS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-indigo-400" /> Featured Multiplayer Games
            </h2>
            <p className="text-xs text-slate-400">Choose a game to start an instant room</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. LUDO MULTIPLAYER */}
          <div className="glass-card glass-card-hover bg-slate-900/90 border border-red-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-red-600/30 to-amber-600/20 border border-red-500/40 p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-red-500 text-white shadow-md">
                    2 - 6 PLAYERS
                  </span>
                  <Crown className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-500 shadow-md ring-2 ring-white" />
                  <div className="w-8 h-8 rounded-full bg-emerald-500 shadow-md ring-2 ring-white" />
                  <div className="w-8 h-8 rounded-full bg-amber-400 shadow-md ring-2 ring-white" />
                  <div className="w-8 h-8 rounded-full bg-cyan-500 shadow-md ring-2 ring-white" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                  Ludo Multiplayer
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Roll the dice, capture opponent tokens, unlock star safe spots, and race your squad to the home triumph!
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => handleCreateRoom('ludo')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Create Room
              </button>
            </div>
          </div>

          {/* 2. SNAKES & LADDERS */}
          <div className="glass-card glass-card-hover bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-emerald-600/30 to-green-900/30 border border-emerald-500/40 p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500 text-white shadow-md">
                    2 - 4 PLAYERS
                  </span>
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex items-center gap-3 text-xs font-black text-emerald-300">
                  <span>🪜 Golden Ladders</span>
                  <span>🐍 Venom Slides</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white group-hover:text-emerald-400 transition-colors">
                  Snakes & Ladders
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Classic 100-tile board race! Climb ladders to soar ahead and watch out for cheeky snakes pulling you back!
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => handleCreateRoom('snakes')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Create Room
              </button>
            </div>
          </div>

          {/* 3. MUSIC & WATCH LOUNGE */}
          <div className="glass-card glass-card-hover bg-slate-900/90 border border-pink-500/30 rounded-3xl p-5 shadow-xl flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-pink-600/30 to-purple-900/30 border border-pink-500/40 p-4 flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-pink-500 text-white shadow-md">
                    UNLIMITED SQUAD
                  </span>
                  <Radio className="w-5 h-5 text-pink-400 animate-pulse" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 bg-pink-400 h-3 rounded-full animate-bounce" />
                  <span className="w-1 bg-pink-300 h-5 rounded-full animate-bounce" />
                  <span className="w-1 bg-pink-500 h-2 rounded-full animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-white group-hover:text-pink-400 transition-colors">
                  Music & Watch Lounge
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  Share YouTube queues, listen to lofi & gaming beats together, and chat in real-time with your friends.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('music')}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Music className="w-3.5 h-3.5" /> Enter Lounge
              </button>
            </div>
          </div>

          {/* 4. MYSTERY / COMING SOON */}
          <div className="glass-card bg-slate-950/40 border border-slate-800/80 rounded-3xl p-5 shadow-xl flex flex-col justify-between opacity-75">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-slate-900 border border-dashed border-slate-800 p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-indigo-400 w-fit">
                  COMING SOON
                </span>
                <Flame className="w-6 h-6 text-amber-500/50 mx-auto" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-300">
                  Mystery Trivia Party
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  Rapid-fire buzzer quiz battles, drawing games, and word showdowns in development for the next update!
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button disabled className="w-full py-2.5 rounded-xl bg-slate-900 text-slate-600 font-bold text-xs cursor-not-allowed border border-slate-800">
                In Development
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* DASHBOARD BOTTOM SPLIT: Online Friends + Active Public Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Public Rooms (2 Cols) */}
        <div className="lg:col-span-2 glass-card bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-400" /> Active Public Rooms ({activeRooms.length})
            </h3>
            <button onClick={loadDashboardData} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              Refresh
            </button>
          </div>

          {activeRooms.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs">
              <Gamepad2 className="w-10 h-10 mx-auto mb-2 text-slate-700" />
              No public lobbies right now. Create a new room and invite your friends!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeRooms.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-indigo-400">{r.room_code}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.room_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 truncate">
                      Host: {r.host_username} • {r.member_count}/{r.max_players} Players
                    </p>
                  </div>

                  <button
                    onClick={() => onJoinRoom(r.room_code)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-sm"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online Friends Widget (1 Col) */}
        <div className="glass-card bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" /> Online Friends ({onlineFriends.length})
            </h3>
            <button onClick={onOpenFriendsModal} className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
              Find Friends
            </button>
          </div>

          {onlineFriends.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-700" />
              No friends online right now. Add more friends from the Friends Hub!
            </div>
          ) : (
            <div className="space-y-2.5">
              {onlineFriends.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <img src={f.avatar} alt={f.username} className="w-9 h-9 rounded-xl bg-slate-950 object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{f.username}</p>
                      <p className="text-[10px] text-emerald-400 capitalize">{f.status}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      openDirectChat(f);
                    }}
                    title="Chat"
                    className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-card bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-5">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" /> Create Private Game Room
            </h3>

            {/* Game Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Game</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGameType('ludo')}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all ${
                    selectedGameType === 'ludo'
                      ? 'bg-red-500/20 border-red-500 text-red-300 shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Crown className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Ludo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGameType('snakes')}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all ${
                    selectedGameType === 'snakes'
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Snakes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGameType('music')}
                  className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all ${
                    selectedGameType === 'music'
                      ? 'bg-pink-500/20 border-pink-500 text-pink-300 shadow-md'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  <Music className="w-5 h-5 mb-1" />
                  <span className="text-xs font-bold">Music</span>
                </button>
              </div>
            </div>

            {/* Max Players (For Ludo: 2..6) */}
            {selectedGameType === 'ludo' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Player Capacity</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedMaxPlayers(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedMaxPlayers === num
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}
                    >
                      {num}P
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-2.5">
                {isPrivateRoom ? <Lock className="w-4 h-4 text-indigo-400" /> : <Globe className="w-4 h-4 text-emerald-400" />}
                <div>
                  <p className="text-xs font-bold text-white">{isPrivateRoom ? 'Private Room' : 'Public Room'}</p>
                  <p className="text-[10px] text-slate-400">{isPrivateRoom ? 'Join with code only' : 'Visible on public dashboard'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                className={`w-11 h-6 rounded-full transition-colors relative ${isPrivateRoom ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isPrivateRoom ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateRoom()}
                disabled={isCreating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/30 flex items-center gap-2"
              >
                {isCreating ? 'Generating Room...' : 'Create & Enter Lobby'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
