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
  MessageCircle,
  Gamepad2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Room, RoomMember } from '../../types';
import { PlayerProfileModal } from '../common/PlayerProfileModal';
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
  { name: 'Red', hex: '#e52521', ring: 'ring-red-500', border: 'border-red-500', text: 'text-red-400', badge: 'bg-red-500' },
  { name: 'Green', hex: '#009b4c', ring: 'ring-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-600' },
  { name: 'Yellow', hex: '#fdb813', ring: 'ring-amber-400', border: 'border-amber-400', text: 'text-amber-400', badge: 'bg-amber-500' },
  { name: 'Blue', hex: '#0072bc', ring: 'ring-blue-500', border: 'border-blue-500', text: 'text-blue-400', badge: 'bg-blue-600' },
  { name: 'Purple', hex: '#8b5cf6', ring: 'ring-purple-500', border: 'border-purple-500', text: 'text-purple-400', badge: 'bg-purple-600' },
  { name: 'Orange', hex: '#f97316', ring: 'ring-orange-500', border: 'border-orange-500', text: 'text-orange-400', badge: 'bg-orange-500' },
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
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<{ id: string; username: string; avatar: string } | null>(null);

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
    <div className="space-y-5 select-none">
      
      {/* Lobby Banner Card (Arcade Gold Trim) */}
      <div className="relative overflow-hidden arcade-card rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 uppercase tracking-widest flex items-center gap-1">
                <Gamepad2 className="w-3.5 h-3.5" />
                {room.room_type.toUpperCase()} ARENA
              </span>
              <span className="text-xs font-bold text-slate-300">
                {members.length}/{room.max_players} Players
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              Game Room Lobby
            </h1>
          </div>

          {/* Room Code & WhatsApp Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center bg-slate-950 border-2 border-amber-400/60 rounded-2xl px-4 py-2 shadow-inner">
              <div className="mr-3">
                <p className="text-[10px] text-amber-400 uppercase tracking-wider font-black">Room Code</p>
                <p className="text-xl font-black tracking-widest text-white">{room.room_code}</p>
              </div>
              <button
                onClick={handleCopyCode}
                title="Copy Room Code"
                className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            {/* WhatsApp Share Button */}
            <button
              onClick={handleWhatsAppShare}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-current" />
              WhatsApp Invite
            </button>

            {/* Copy Invite Link */}
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              {copiedLink ? 'Copied' : 'Copy Link'}
            </button>

            {/* Invite Online Friends */}
            <button
              onClick={onOpenFriendsInvite}
              className="px-3.5 py-2.5 rounded-2xl bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" />
              Invite
            </button>
          </div>
        </div>
      </div>

      {/* Players Slot Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          Players in Lobby ({members.length}/{room.max_players})
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
                  className={`relative arcade-card p-4 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${
                    member.is_ready
                      ? 'border-emerald-400 shadow-emerald-500/20'
                      : 'border-slate-700'
                  }`}
                >
                  {/* Host Crown */}
                  {isMemberHost && (
                    <div className="absolute top-3 left-3 p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-400/50">
                      <Crown className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* Kick Button (Host only, not self) */}
                  {isHost && !isMemberHost && (
                    <button
                      onClick={() => onKickPlayer(member.user_id)}
                      title="Kick player from room"
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-500/40 transition-all cursor-pointer"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Avatar (Clickable for Profile & Friend Request) */}
                  <div
                    onClick={() => {
                      sound.playClick();
                      setSelectedPlayerForModal({ id: member.user_id, username: member.username, avatar: member.avatar });
                    }}
                    title="Click to view profile & add friend"
                    className="relative mt-2 mb-3 cursor-pointer group hover:scale-105 transition-transform"
                  >
                    <img
                      src={member.avatar}
                      alt={member.username}
                      className={`w-16 h-16 rounded-2xl bg-slate-950 object-cover ring-4 ${colorSlot.ring} shadow-xl group-hover:ring-amber-400 transition-all`}
                    />
                    <span className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${colorSlot.badge}`}>
                      P{idx + 1}
                    </span>
                  </div>

                  <p 
                    onClick={() => {
                      sound.playClick();
                      setSelectedPlayerForModal({ id: member.user_id, username: member.username, avatar: member.avatar });
                    }}
                    className="font-black text-base text-white truncate max-w-[140px] cursor-pointer hover:text-amber-400 transition-colors"
                  >
                    {member.username} {isMe && <span className="text-xs text-amber-300">(You)</span>}
                  </p>

                  <p className={`text-xs font-bold mt-0.5 ${colorSlot.text}`}>
                    Color: {colorSlot.name}
                  </p>

                  {/* Ready Status Badge */}
                  <div className="mt-3">
                    {isMemberHost ? (
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/50">
                        Room Host
                      </span>
                    ) : member.is_ready ? (
                      <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 flex items-center gap-1">
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
                className="arcade-card border-2 border-dashed border-slate-700 hover:border-amber-400/60 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[190px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-amber-400 group-hover:border-amber-400/50 transition-all mb-2">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-black text-slate-400 group-hover:text-slate-200">
                  Empty Slot #{idx + 1}
                </p>
                <p className="text-[11px] text-amber-400 font-bold mt-1">Tap to invite friend</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lobby Bottom Actions */}
      <div className="p-4 sm:p-5 arcade-card rounded-3xl flex flex-wrap items-center justify-between gap-4 border-2 border-slate-700">
        <button
          onClick={onLeaveRoom}
          className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 font-bold text-sm transition-all cursor-pointer"
        >
          Leave Room
        </button>

        <div className="flex items-center gap-3">
          {!isHost && (
            <button
              onClick={onToggleReady}
              className={`px-7 py-3 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                isReady
                  ? 'bg-slate-800 border border-emerald-500 text-emerald-400 hover:bg-slate-700'
                  : 'btn-arcade-green text-white'
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
              className="btn-arcade-green px-8 py-3.5 rounded-2xl text-white font-black text-sm tracking-wider uppercase flex items-center gap-2.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              {members.length < 2 && room.room_type !== 'music' ? 'Need 2+ Players to Start' : 'Start Game Now!'}
            </button>
          )}
        </div>
      </div>

      {/* Player Profile Popup Modal */}
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
