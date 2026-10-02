import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Share2, 
  Play, 
  UserMinus, 
  Crown, 
  Users, 
  Sparkles,
  ShieldCheck,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Room, RoomMember } from '../../types';
import { sound } from '../../utils/sound';

interface RoomLobbyViewProps {
  room: Room;
  members: RoomMember[];
  onStartGame: () => void;
  onToggleReady: () => void;
  onKickPlayer: (userId: string) => void;
  onOpenFriendsInvite: () => void;
  onLeaveRoom: () => void;
}

const COLOR_SLOTS = [
  { name: 'Red', bg: 'from-rose-500 to-red-600', ring: 'ring-rose-500', text: 'text-rose-400' },
  { name: 'Green', bg: 'from-emerald-500 to-green-600', ring: 'ring-emerald-500', text: 'text-emerald-400' },
  { name: 'Yellow', bg: 'from-amber-400 to-yellow-500', ring: 'ring-amber-400', text: 'text-amber-400' },
  { name: 'Blue', bg: 'from-cyan-500 to-blue-600', ring: 'ring-blue-500', text: 'text-blue-400' },
  { name: 'Purple', bg: 'from-purple-500 to-indigo-600', ring: 'ring-purple-500', text: 'text-purple-400' },
  { name: 'Orange', bg: 'from-orange-500 to-amber-600', ring: 'ring-orange-500', text: 'text-orange-400' },
];

export const RoomLobbyView: React.FC<RoomLobbyViewProps> = ({
  room,
  members,
  onStartGame,
  onToggleReady,
  onKickPlayer,
  onOpenFriendsInvite,
  onLeaveRoom
}) => {
  const { user } = useAuth();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = user?.id === room.host_id;
  const currentMember = members.find((m) => m.user_id === user?.id);
  const isReady = !!currentMember?.is_ready;

  const joinUrl = `${window.location.origin}/?join=${room.room_code}`;

  const handleCopyCode = () => {
    sound.playClick();
    navigator.clipboard.writeText(room.room_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    sound.playClick();
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsAppShare = () => {
    sound.playClick();
    const gameName = room.room_type === 'ludo' ? 'Ludo 🎲' : room.room_type === 'snakes' ? 'Snakes & Ladders 🐍' : 'Music Hangout Lounge 🎵';
    const text = `🎮 Join my game room on PlaySphere!\nGame: ${gameName}\nRoom Code: ${room.room_code}\nJoin here: ${joinUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Lobby Banner Card */}
      <div className="relative overflow-hidden glass-card bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                {room.room_type.toUpperCase()} LOBBY
              </span>
              <span className="text-xs text-slate-400">
                {members.length}/{room.max_players} Players
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              Game Room Lobby
            </h1>
          </div>

          {/* Room Code & Share Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-950/90 border border-indigo-500/50 rounded-2xl px-4 py-2 shadow-inner">
              <div className="mr-3">
                <p className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold">Room Code</p>
                <p className="text-xl font-black tracking-widest text-white">{room.room_code}</p>
              </div>
              <button
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="p-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white transition-all"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* WhatsApp Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              Share on WhatsApp
            </button>

            {/* Copy Invite Link */}
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copiedLink ? 'Copied Link' : 'Copy Link'}
            </button>

            {/* Invite Online Friends */}
            <button
              onClick={onOpenFriendsInvite}
              className="px-3.5 py-2.5 rounded-2xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 text-indigo-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Users className="w-4 h-4" />
              Invite Friends
            </button>
          </div>
        </div>
      </div>

      {/* Players Slot Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          Players inside room ({members.length}/{room.max_players})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: room.max_players }).map((_, idx) => {
            const member = members[idx];
            const colorSlot = COLOR_SLOTS[idx % COLOR_SLOTS.length];

            if (member) {
              const isMemberHost = member.user_id === room.host_id;
              const isMe = member.user_id === user?.id;

              return (
                <div
                  key={member.user_id}
                  className={`relative glass-card p-4 rounded-3xl border transition-all flex flex-col items-center text-center ${
                    member.is_ready
                      ? 'bg-slate-900/90 border-emerald-500/40 shadow-emerald-500/10'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  {/* Host Crown */}
                  {isMemberHost && (
                    <div className="absolute top-3 left-3 p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Kick Button (Host only, not self) */}
                  {isHost && !isMemberHost && (
                    <button
                      onClick={() => onKickPlayer(member.user_id)}
                      title="Kick player from room"
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/40 transition-all"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Avatar with Color Ring */}
                  <div className="relative mt-2 mb-3">
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className={`w-16 h-16 rounded-2xl bg-slate-950 object-cover ring-4 ${colorSlot.ring} shadow-xl`}
                    />
                    <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 border border-slate-700 text-slate-200">
                      P{idx + 1}
                    </span>
                  </div>

                  <p className="font-bold text-base text-white truncate max-w-[140px]">
                    {member.username} {isMe && <span className="text-xs text-indigo-400">(You)</span>}
                  </p>

                  <p className={`text-xs font-semibold mt-0.5 ${colorSlot.text}`}>
                    Color: {colorSlot.name}
                  </p>

                  {/* Ready Status Badge */}
                  <div className="mt-3">
                    {isMemberHost ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Room Host
                      </span>
                    ) : member.is_ready ? (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        Not Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Empty Slot
            return (
              <div
                key={`empty-${idx}`}
                onClick={onOpenFriendsInvite}
                className="glass-card bg-slate-950/30 border-2 border-dashed border-slate-800 hover:border-indigo-500/40 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[190px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-indigo-400 group-hover:border-indigo-500/40 transition-all mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-400 group-hover:text-slate-200">
                  Empty Slot #{idx + 1}
                </p>
                <p className="text-[11px] text-indigo-400 mt-1">Click to invite friend</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lobby Bottom Actions */}
      <div className="p-5 glass-card bg-slate-900 border border-slate-800 rounded-3xl flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onLeaveRoom}
          className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-semibold text-sm transition-all"
        >
          Leave Room
        </button>

        <div className="flex items-center gap-3">
          {!isHost && (
            <button
              onClick={onToggleReady}
              className={`px-6 py-3 rounded-2xl font-bold text-sm transition-all shadow-lg flex items-center gap-2 ${
                isReady
                  ? 'bg-slate-800 border border-emerald-500/40 text-emerald-400 hover:bg-slate-700'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/20'
              }`}
            >
              <Check className="w-4 h-4" />
              {isReady ? 'Cancel Ready' : 'Ready Up!'}
            </button>
          )}

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={members.length < 2 && room.room_type !== 'music'}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-pink-500 hover:scale-105 active:scale-95 text-white font-extrabold text-sm tracking-wide shadow-xl shadow-indigo-500/30 flex items-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Play className="w-5 h-5 fill-current" />
              {members.length < 2 && room.room_type !== 'music' ? 'Need 2+ Players to Start' : 'Start Game Now!'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
