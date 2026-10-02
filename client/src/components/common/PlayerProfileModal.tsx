import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  MessageSquare, 
  Trophy, 
  Check, 
  Clock, 
  X, 
  Crown, 
  Gamepad2, 
  Sparkles,
  Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { UserStats } from '../../types';
import { apiRequest } from '../../utils/api';
import { sound } from '../../utils/sound';

interface PlayerProfileModalProps {
  userId: string | null;
  username?: string;
  avatar?: string;
  onClose: () => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  userId,
  username,
  avatar,
  onClose,
}) => {
  const { user: currentUser } = useAuth();
  const { openDirectChat } = useSocket();
  const [profileData, setProfileData] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestSent, setRequestSent] = useState(false);

  const isMe = currentUser?.id === userId;

  useEffect(() => {
    if (!userId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await apiRequest<{ user: any; stats: UserStats; friendshipStatus: any }>(`/users/${userId}`);
        setProfileData(res.user);
        setStats(res.stats);
        if (res.friendshipStatus) {
          setFriendshipStatus(res.friendshipStatus.status);
        }
      } catch (err) {
        console.error('Error fetching player modal details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [userId]);

  const handleSendFriendRequest = async () => {
    if (!userId || isMe) return;
    try {
      sound.playClick();
      await apiRequest(`/friends/request/${userId}`, { method: 'POST' });
      setRequestSent(true);
      setFriendshipStatus('pending');
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  const handleStartChat = () => {
    if (!profileData) return;
    sound.playClick();
    openDirectChat(profileData);
    onClose();
  };

  if (!userId) return null;

  const displayUser = profileData || { username, avatar };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in-95 select-none">
      <div className="w-full max-w-sm arcade-card rounded-3xl p-6 shadow-2xl space-y-5 text-center relative overflow-hidden border-2 border-amber-500/50">
        
        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-800 border border-slate-700 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Profile Avatar & Ring */}
        <div className="relative inline-block mt-2">
          <img
            src={displayUser.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${displayUser.username}`}
            alt={displayUser.username}
            className="w-20 h-20 rounded-3xl bg-slate-950 object-cover ring-4 ring-amber-400 shadow-xl mx-auto"
          />
          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-slate-900" />
        </div>

        {/* Name & Bio */}
        <div>
          <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
            {displayUser.username}
            {displayUser.role === 'admin' && <Shield className="w-4 h-4 text-amber-400" />}
          </h3>
          <p className="text-xs text-slate-300 italic mt-1 font-medium">
            "{displayUser.bio || 'Ready for some intense Ludo battles! 🔥'}"
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-700">
            <Trophy className="w-4 h-4 text-amber-400 mx-auto mb-1" />
            <p className="text-base font-black text-white">{stats?.winRate || 0}%</p>
            <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Win Rate</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-700">
            <Crown className="w-4 h-4 text-red-400 mx-auto mb-1" />
            <p className="text-base font-black text-white">{stats?.ludoWins || 0}</p>
            <p className="text-[9px] font-black text-red-400 uppercase tracking-wider">Ludo Wins</p>
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-700">
            <Gamepad2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-base font-black text-white">{stats?.totalGames || 0}</p>
            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider">Matches</p>
          </div>
        </div>

        {/* Action Buttons */}
        {!isMe && (
          <div className="flex items-center justify-center gap-2 pt-1">
            {friendshipStatus === 'accepted' ? (
              <div className="flex items-center gap-2 w-full">
                <span className="flex-1 py-2.5 rounded-2xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black flex items-center justify-center gap-1.5">
                  <Check className="w-4 h-4" /> Friends
                </span>
                <button
                  onClick={handleStartChat}
                  className="p-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md transition-all cursor-pointer font-bold"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ) : friendshipStatus === 'pending' || requestSent ? (
              <span className="w-full py-2.5 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center justify-center gap-1.5">
                <Clock className="w-4 h-4" /> Request Pending
              </span>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                className="w-full py-3 rounded-2xl btn-arcade-green text-white text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" /> Add Friend
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
