import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Trophy, 
  Gamepad2, 
  Users, 
  Sparkles, 
  Calendar, 
  Check, 
  Edit3, 
  Flame,
  Award,
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      
      {/* Profile Header Hero */}
      <div className="glass-card bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
          
          {/* Avatar with Status Ring */}
          <div className="relative group">
            <img
              src={selectedAvatar}
              alt={user.username}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-950 object-cover ring-4 ring-indigo-500/50 shadow-2xl"
            />
            <span className="absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500 text-white shadow-lg ring-2 ring-slate-900">
              Online
            </span>
          </div>

          {/* User Info Details */}
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-white">{user.username}</h1>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                {user.role}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              User ID: <span className="text-slate-300 font-mono font-medium">{user.id}</span> • Joined {new Date(user.created_at).toLocaleDateString()}
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
                    className="w-full bg-slate-950/80 border border-indigo-500/60 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none"
                    placeholder="Write a custom gaming bio..."
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold shadow-md"
                    >
                      {isSaving ? 'Saving...' : 'Save Bio'}
                    </button>
                    <button
                      onClick={() => setIsEditingBio(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <p className="text-sm text-slate-300 italic">"{user.bio || 'Ready for some gaming fun!'}"</p>
                  <button
                    onClick={() => setIsEditingBio(true)}
                    className="p-1 text-slate-400 hover:text-indigo-400 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Win Rate Badge */}
          <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-500/40 text-center min-w-[120px]">
            <Trophy className="w-6 h-6 text-amber-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-white">{stats?.winRate || 0}%</p>
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Win Rate</p>
          </div>
        </div>

        {/* Avatar Customization Selector */}
        <div className="mt-6 pt-6 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Choose Profile Avatar
            </h3>
            {selectedAvatar !== user.avatar && (
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="text-xs px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm"
              >
                Save Chosen Avatar
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
                className={`w-12 h-12 rounded-2xl bg-slate-900 object-cover cursor-pointer transition-all ${
                  selectedAvatar === av
                    ? 'ring-4 ring-indigo-500 scale-110 shadow-lg shadow-indigo-500/30'
                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                }`}
              />
            ))}
          </div>
        </div>

        {savedSuccess && (
          <div className="absolute top-4 right-4 bg-emerald-500/90 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Profile Updated!
          </div>
        )}
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Ludo Stats */}
        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
            <Crown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats?.ludoWins || 0} / {stats?.ludoGames || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Ludo Wins / Matches</p>
          </div>
        </div>

        {/* Snakes Stats */}
        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats?.snakesWins || 0} / {stats?.snakesGames || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Snakes Wins / Matches</p>
          </div>
        </div>

        {/* Total Games */}
        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats?.totalGames || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Total Games Played</p>
          </div>
        </div>

        {/* Friends Count */}
        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{stats?.friendsCount || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Gaming Friends</p>
          </div>
        </div>

      </div>

      {/* Match History */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-400" /> Recent Match History
        </h3>

        {recentGames.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs">
            <Gamepad2 className="w-10 h-10 mx-auto mb-2 text-slate-700" />
            No games completed yet. Play your first match from the dashboard!
          </div>
        ) : (
          <div className="space-y-2">
            {recentGames.map((g) => (
              <div
                key={g.game_id}
                className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {g.rank === 1 ? '🥇' : g.rank === 2 ? '🥈' : '🥉'}
                  </span>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-white capitalize">
                      {g.game_type === 'ludo' ? 'Ludo Multiplayer' : 'Snakes & Ladders'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Winner: {g.winner_username || 'Champion'} • {new Date(g.started_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                      g.rank === 1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-700/40 text-slate-300 border border-slate-600'
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
