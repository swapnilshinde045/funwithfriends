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
  Lock,
  Globe,
  ArrowRight
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in select-none">
      
      {/* HERO BANNER (Classic Vibrant Arcade) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-10 shadow-xl text-white">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5" /> Real-Time Multiplayer Arcade
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight drop-shadow-sm">
            Play With Your Friends 🎲
          </h1>

          <p className="text-sm sm:text-base text-indigo-100 font-medium leading-relaxed">
            Create private game rooms, roll the dice in classic Ludo and Snakes & Ladders, chat with friends, and hang out in synchronized watch lounges.
          </p>

          {/* Quick Action Bar: Join with Code & Create Room */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <form onSubmit={handleJoinByCode} className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-lg max-w-xs w-full border border-indigo-200">
              <input
                type="text"
                maxLength={6}
                placeholder="ENTER 6-CHAR CODE..."
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="bg-transparent text-slate-900 font-mono font-black text-sm tracking-widest px-3 py-2 w-full focus:outline-none placeholder-slate-400"
              />
              <button
                type="submit"
                disabled={!joinCodeInput.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all disabled:opacity-40 cursor-pointer"
              >
                Join
              </button>
            </form>

            <button
              onClick={() => {
                sound.playClick();
                setShowCreateModal(true);
              }}
              className="btn-arcade-green px-6 py-3.5 rounded-2xl text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Room
            </button>
          </div>
        </div>

        {/* Decorative Badge Background */}
        <div className="absolute right-4 bottom-4 md:right-12 md:bottom-6 opacity-20 pointer-events-none">
          <Gamepad2 className="w-48 h-48 sm:w-64 sm:h-64 text-white" />
        </div>
      </div>

      {/* GAME CARDS SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
              <Gamepad2 className="w-6 h-6 text-indigo-600" /> Featured Games
            </h2>
            <p className="text-xs font-semibold text-slate-500">Pick a game to start an instant private room</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. LUDO MULTIPLAYER */}
          <div className="bg-white border border-slate-200 hover:border-red-400 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-red-500 to-amber-500 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-red-600 shadow-md">
                    2 - 6 PLAYERS
                  </span>
                  <Crown className="w-5 h-5 text-yellow-200" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center font-black text-xs text-red-600">🔴</div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center font-black text-xs text-emerald-600">🟢</div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center font-black text-xs text-amber-500">🟡</div>
                  <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center font-black text-xs text-blue-600">🔵</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-red-600 transition-colors">
                  Ludo Multiplayer
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-medium line-clamp-2">
                  Classic 15x15 board with 6-bonus rolls, safe stars, captures, and single-move auto roll just like Ludo King!
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => handleCreateRoom('ludo')}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Play Ludo
              </button>
            </div>
          </div>

          {/* 2. SNAKES & LADDERS */}
          <div className="bg-white border border-slate-200 hover:border-emerald-400 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-emerald-500 to-green-700 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-emerald-700 shadow-md">
                    2 - 4 PLAYERS
                  </span>
                  <Sparkles className="w-5 h-5 text-emerald-100" />
                </div>
                <div className="flex items-center gap-3 text-xs font-black text-white">
                  <span>🪜 Ladders</span>
                  <span>🐍 Snakes</span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Snakes & Ladders
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-medium line-clamp-2">
                  Classic 100-tile board race! Climb ladders to soar ahead and watch out for sneaky snakes pulling you back!
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => handleCreateRoom('snakes')}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Play Snakes
              </button>
            </div>
          </div>

          {/* 3. MUSIC & WATCH LOUNGE */}
          <div className="bg-white border border-slate-200 hover:border-pink-400 rounded-3xl p-5 shadow-md hover:shadow-xl transition-all flex flex-col justify-between group relative overflow-hidden">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 p-4 flex flex-col justify-between overflow-hidden shadow-inner">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-pink-600 shadow-md">
                    UNLIMITED SQUAD
                  </span>
                  <Radio className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div className="flex items-center gap-1 text-white text-xs font-bold">
                  🎵 YouTube Sync Lounge
                </div>
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 group-hover:text-pink-600 transition-colors">
                  Music Watch Lounge
                </h3>
                <p className="text-xs text-slate-600 mt-1 font-medium line-clamp-2">
                  Share YouTube queues, listen to lofi & gaming beats in sync, and hangout in real-time with your squad.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <button
                onClick={() => onNavigateTab('music')}
                className="w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Music className="w-3.5 h-3.5" /> Enter Lounge
              </button>
            </div>
          </div>

          {/* 4. MYSTERY ARCADE */}
          <div className="bg-slate-100 border border-dashed border-slate-300 rounded-3xl p-5 flex flex-col justify-between opacity-80">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl bg-slate-200 border border-slate-300 p-4 flex flex-col justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white text-indigo-600 w-fit shadow-xs">
                  COMING SOON
                </span>
                <Flame className="w-6 h-6 text-amber-500 mx-auto" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-800">
                  Trivia & Party Games
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-medium line-clamp-2">
                  Rapid-fire buzzer quiz battles, drawing showdowns, and word games in development for the next update!
                </p>
              </div>
            </div>

            <div className="pt-4">
              <button disabled className="w-full py-2.5 rounded-xl bg-slate-200 text-slate-400 font-bold text-xs cursor-not-allowed">
                In Development
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* DASHBOARD BOTTOM SPLIT: Active Public Rooms + Online Friends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Public Rooms (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" /> Active Public Rooms ({activeRooms.length})
            </h3>
            <button onClick={loadDashboardData} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
              Refresh
            </button>
          </div>

          {activeRooms.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs font-semibold">
              <Gamepad2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              No public lobbies right now. Create a new room and invite your friends!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeRooms.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-400 transition-all flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono text-indigo-600">{r.room_code}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        {r.room_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 truncate">
                      Host: {r.host_username} • {r.member_count}/{r.max_players} Players
                    </p>
                  </div>

                  <button
                    onClick={() => onJoinRoom(r.room_code)}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shrink-0 shadow-sm cursor-pointer"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Online Friends Widget (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" /> Online Friends ({onlineFriends.length})
            </h3>
            <button onClick={onOpenFriendsModal} className="text-xs text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer">
              Find Friends
            </button>
          </div>

          {onlineFriends.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs font-semibold">
              <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No friends online right now. Add friends from the Friends Hub!
            </div>
          ) : (
            <div className="space-y-2.5">
              {onlineFriends.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <img src={f.avatar} alt={f.username} className="w-9 h-9 rounded-xl bg-white border border-slate-200 object-cover" />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate">{f.username}</p>
                      <p className="text-[10px] text-emerald-600 font-bold capitalize">{f.status}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sound.playClick();
                      openDirectChat(f);
                    }}
                    title="Chat"
                    className="p-2 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* CREATE ROOM MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-5">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-600" /> Create Game Room
            </h3>

            {/* Game Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Select Game</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGameType('ludo')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer ${
                    selectedGameType === 'ludo'
                      ? 'bg-red-50 border-red-500 text-red-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Crown className="w-5 h-5 mb-1" />
                  <span className="text-xs font-black">Ludo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGameType('snakes')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer ${
                    selectedGameType === 'snakes'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Sparkles className="w-5 h-5 mb-1" />
                  <span className="text-xs font-black">Snakes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedGameType('music')}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center transition-all cursor-pointer ${
                    selectedGameType === 'music'
                      ? 'bg-pink-50 border-pink-500 text-pink-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Music className="w-5 h-5 mb-1" />
                  <span className="text-xs font-black">Music</span>
                </button>
              </div>
            </div>

            {/* Max Players */}
            {selectedGameType === 'ludo' && (
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">Player Capacity</label>
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedMaxPlayers(num)}
                      className={`flex-1 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                        selectedMaxPlayers === num
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {num}P
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Privacy Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2.5">
                {isPrivateRoom ? <Lock className="w-4 h-4 text-indigo-600" /> : <Globe className="w-4 h-4 text-emerald-600" />}
                <div>
                  <p className="text-xs font-black text-slate-900">{isPrivateRoom ? 'Private Room' : 'Public Room'}</p>
                  <p className="text-[10px] font-semibold text-slate-500">{isPrivateRoom ? 'Join with 6-char code only' : 'Visible on public dashboard'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivateRoom(!isPrivateRoom)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${isPrivateRoom ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${isPrivateRoom ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreateRoom()}
                disabled={isCreating}
                className="btn-arcade-green px-6 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center gap-2 cursor-pointer"
              >
                {isCreating ? 'Creating...' : 'Create & Enter'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
