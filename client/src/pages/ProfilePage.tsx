import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Gamepad2, 
  Users, 
  Sparkles, 
  Calendar, 
  Check, 
  Edit3, 
  Crown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserStats } from '../types';
import { apiRequest } from '../utils/api';
import { sound } from '../utils/sound';

const AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=ShadowNinja',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CyberDragon',
  'https://api.dicebear.com/7.x/bottts/svg?seed=PixelKnight',
  'https://api.dicebear.com/7.x/bottts/svg?seed=VortexRider',
  'https://api.dicebear.com/7.x/bottts/svg?seed=NeonPanda',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicFox',
  'https://api.dicebear.com/7.x/bottts/svg?seed=QuantumWiz',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GlitchHero'
];

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(user?.bio || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATARS[0]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    setBioInput(user.bio || '');
    setSelectedAvatar(user.avatar || AVATARS[0]);

    const fetchProfileStats = async () => {
      try {
        const res = await apiRequest<{ stats: UserStats; recentGames: any[] }>(`/users/${user.id}`);
        setStats(res.stats);
        setRecentGames(res.recentGames);
      } catch (err) {
        console.error('Error fetching user stats:', err);
      }
    };

    fetchProfileStats();
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      sound.playClick();
      await updateProfile({
        avatar: selectedAvatar,
        bio: bioInput.trim()
      });
      setIsEditingBio(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Error updating profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in select-none">
      
      {/* Profile Header Hero */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          
          {/* Avatar with Status Ring */}
          <div className="relative group">
            <img
              src={selectedAvatar}
              alt={user.username}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-50 object-cover ring-4 ring-indigo-600/20 border border-slate-200 shadow-md"
            />
            <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm ring-2 ring-white">
              Online
            </span>
          </div>

          {/* User Info Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{user.username}</h1>
              <span className="text-xs font-black px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                {user.role}
              </span>
            </div>

            <p className="text-xs text-slate-500 font-bold">
              User ID: <span className="text-slate-800 font-mono">{user.id}</span> • Joined {new Date(user.created_at).toLocaleDateString()}
            </p>

            {/* Bio */}
            <div className="pt-2">
              {isEditingBio ? (
                <div className="space-y-2 max-w-lg">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    maxLength={200}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none focus:border-indigo-600"
                    placeholder="Write a custom gaming bio..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-sm cursor-pointer"
                    >
                      {isSaving ? 'Saving...' : 'Save Bio'}
                    </button>
                    <button
                      onClick={() => setIsEditingBio(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <p className="text-sm text-slate-700 font-medium italic">"{user.bio || 'Ready for some gaming fun!'}"</p>
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Win Rate Badge */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center min-w-[120px] shadow-xs">
            <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-black text-slate-900">{stats?.winRate || 0}%</p>
            <p className="text-[10px] text-amber-700 uppercase tracking-widest font-black">Win Rate</p>
          </div>
        </div>

        {/* Avatar Customization Selector */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Choose Profile Avatar
            </h3>
            {selectedAvatar !== user.avatar && (
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-xs px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-sm cursor-pointer"
              >
                Save Avatar
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {AVATARS.map((av) => (
              <img
                key={av}
                src={av}
                alt="Avatar option"
                onClick={() => {
                  sound.playClick();
                  setSelectedAvatar(av);
                }}
                className={`w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 object-cover cursor-pointer transition-all ${
                  selectedAvatar === av
                    ? 'ring-4 ring-indigo-600 scale-110 shadow-md'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        {savedSuccess && (
          <div className="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Profile Updated!
          </div>
        )}
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ludo Stats */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-50 text-red-600 border border-red-200">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.ludoWins || 0} / {stats?.ludoGames || 0}</p>
            <p className="text-xs font-bold text-slate-500">Ludo Wins / Matches</p>
          </div>
        </div>

        {/* Snakes Stats */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.snakesWins || 0} / {stats?.snakesGames || 0}</p>
            <p className="text-xs font-bold text-slate-500">Snakes Wins / Matches</p>
          </div>
        </div>

        {/* Total Games */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.totalGames || 0}</p>
            <p className="text-xs font-bold text-slate-500">Total Games Played</p>
          </div>
        </div>

        {/* Friends Count */}
        <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-pink-50 text-pink-600 border border-pink-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{stats?.friendsCount || 0}</p>
            <p className="text-xs font-bold text-slate-500">Gaming Friends</p>
          </div>
        </div>

      </div>

      {/* Match History */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" /> Recent Match History
        </h3>

        {recentGames.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs font-bold">
            <Gamepad2 className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            No games completed yet. Play your first match from the dashboard!
          </div>
        ) : (
          <div className="space-y-2">
            {recentGames.map((g) => (
              <div
                key={g.game_id}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-900 capitalize">
                      {g.game_type === 'ludo' ? 'Ludo Multiplayer' : 'Snakes & Ladders'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Winner: {g.winner_username || 'Champion'} • {new Date(g.started_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                      g.rank === 1
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {g.rank === 1 ? 'Victory!' : `${g.rank}th Place`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
