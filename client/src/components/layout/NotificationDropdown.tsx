import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, UserPlus, Gamepad2, Music, Sparkles } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';
import { apiRequest } from '../../utils/api';
import { sound } from '../../utils/sound';

export const NotificationDropdown: React.FC<{ onNavigateRoom?: (roomCode: string) => void }> = ({ onNavigateRoom }) => {
  const { notifications, unreadNotificationsCount, markNotificationsRead, fetchNotifications } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    sound.playClick();
    if (!isOpen && unreadNotificationsCount > 0) {
      markNotificationsRead();
    }
    setIsOpen(!isOpen);
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      sound.playClick();
      await apiRequest(`/friends/accept/${requestId}`, { method: 'POST' });
      fetchNotifications();
    } catch (err) {
      console.error('Error accepting friend request:', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return <UserPlus className="w-5 h-5 text-indigo-400" />;
      case 'friend_accepted':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'game_invite':
        return <Gamepad2 className="w-5 h-5 text-amber-400" />;
      case 'music_invite':
        return <Music className="w-5 h-5 text-pink-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-indigo-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-all flex items-center justify-center"
      >
        <Bell className="w-5 h-5" />
        {unreadNotificationsCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce-soft shadow-lg shadow-pink-500/50">
            {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-84 sm:w-96 glass-card bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in duration-200 backdrop-blur-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-400" /> Notifications
            </h3>
            {notifications.length > 0 && (
              <button
                onClick={markNotificationsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-3 max-h-80 overflow-y-auto space-y-2 pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">
                <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                No new notifications yet!
              </div>
            ) : (
              notifications.map((notif) => {
                let inviteData: { roomCode?: string; roomType?: string } = {};
                if (notif.data_json) {
                  try {
                    inviteData = JSON.parse(notif.data_json);
                  } catch (e) {}
                }

                return (
                  <div
                    key={notif.id}
                    className={`p-3 rounded-xl border transition-all flex items-start gap-3 ${
                      notif.read ? 'bg-slate-800/30 border-slate-800/60' : 'bg-indigo-950/30 border-indigo-500/30'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/50 shrink-0 mt-0.5">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm text-slate-200 leading-snug">{notif.message}</p>
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {/* Action for game invites */}
                      {inviteData.roomCode && (
                        <button
                          onClick={() => {
                            setIsOpen(false);
                            if (onNavigateRoom) {
                              onNavigateRoom(inviteData.roomCode!);
                            } else {
                              window.location.href = `/?join=${inviteData.roomCode}`;
                            }
                          }}
                          className="mt-2 text-xs px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Gamepad2 className="w-3.5 h-3.5" /> Join Room ({inviteData.roomCode})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
