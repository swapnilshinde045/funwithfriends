import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  MessageSquare, 
  Gamepad2, 
  Check, 
  X, 
  UserX, 
  Clock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { FriendUser, FriendRequest } from '../../types';
import { apiRequest } from '../../utils/api';
import { sound } from '../../utils/sound';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateProfile?: (userId: string) => void;
  activeRoomCode?: string;
  activeRoomType?: string;
}

export const FriendsModal: React.FC<FriendsModalProps> = ({
  isOpen,
  onClose,
  activeRoomCode,
  activeRoomType
}) => {
  const { user } = useAuth();
  const { socket, openDirectChat } = useSocket();
  const [activeTab, setActiveTab] = useState<'friends' | 'search' | 'requests'>('friends');
  
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedMap, setInvitedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen && user) {
      loadFriends();
      loadRequests();
    }
  }, [isOpen, user]);

  const loadFriends = async () => {
    try {
      const res = await apiRequest<{ friends: FriendUser[] }>('/friends/list');
      setFriends(res.friends);
    } catch (err) {
      console.error('Error fetching friends:', err);
    }
  };

  const loadRequests = async () => {
    try {
      const res = await apiRequest<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/friends/requests');
      setIncomingRequests(res.incoming);
      setOutgoingRequests(res.outgoing);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest<{ users: any[] }>(`/friends/search?q=${encodeURIComponent(q.trim())}`);
      setSearchResults(res.users);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    try {
      sound.playClick();
      await apiRequest(`/friends/request/${targetUserId}`, { method: 'POST' });
      handleSearch(searchQuery);
      loadRequests();
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      sound.playClick();
      await apiRequest(`/friends/accept/${requestId}`, { method: 'POST' });
      loadRequests();
      loadFriends();
    } catch (err) {
      console.error('Error accepting request:', err);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      sound.playClick();
      await apiRequest(`/friends/reject/${requestId}`, { method: 'POST' });
      loadRequests();
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      sound.playClick();
      await apiRequest(`/friends/${friendId}`, { method: 'DELETE' });
      loadFriends();
    } catch (err) {
      console.error('Error removing friend:', err);
    }
  };

  const handleInviteToRoom = (friend: FriendUser) => {
    if (!socket || !activeRoomCode || !user) return;
    sound.playClick();
    socket.emit('invite_friend_to_room', {
      senderUser: user,
      targetUserId: friend.id,
      roomCode: activeRoomCode,
      roomType: activeRoomType || 'ludo'
    });
    setInvitedMap(prev => ({ ...prev, [friend.id]: true }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in select-none">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Friends & Squad Hub</h2>
              <p className="text-xs text-slate-500 font-bold">Connect and play with your friends</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 bg-white border border-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-5 pt-3 pb-2 flex gap-2 border-b border-slate-200 bg-slate-50/50">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('friends');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'friends'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> My Friends ({friends.length})
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('search');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4" /> Find Players
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('requests');
            }}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4" /> Requests
            {incomingRequests.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                {incomingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3 bg-slate-50/30">
          
          {/* FRIENDS LIST TAB */}
          {activeTab === 'friends' && (
            <div>
              {friends.length === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-3">
                  <Users className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">You haven't added any friends yet.</p>
                  <button
                    onClick={() => setActiveTab('search')}
                    className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Search & Add Friends
                  </button>
                </div>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-3 shadow-xs mb-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="w-11 h-11 rounded-xl bg-slate-100 object-cover border border-slate-200"
                        />
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full ring-2 ring-white ${
                            friend.status === 'online'
                              ? 'bg-emerald-500'
                              : friend.status === 'in_game'
                              ? 'bg-amber-500'
                              : friend.status === 'in_music'
                              ? 'bg-purple-500'
                              : 'bg-slate-400'
                          }`}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-900 truncate">{friend.username}</p>
                        <p className="text-xs text-slate-500 font-bold capitalize">
                          {friend.status === 'online' ? '🟢 Online' : friend.status === 'in_game' ? '🎮 Playing Game' : friend.status === 'in_music' ? '🎵 Listening Music' : 'Offline'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeRoomCode && (
                        <button
                          onClick={() => handleInviteToRoom(friend)}
                          disabled={invitedMap[friend.id]}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            invitedMap[friend.id]
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                          }`}
                        >
                          <Gamepad2 className="w-3.5 h-3.5" />
                          {invitedMap[friend.id] ? 'Invited' : 'Invite'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          sound.playClick();
                          openDirectChat(friend);
                        }}
                        title="Chat with friend"
                        className="p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend.id)}
                        title="Remove Friend"
                        className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                      >
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SEARCH & DISCOVERY TAB */}
          {activeTab === 'search' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search player by username..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 text-sm font-semibold focus:outline-none focus:border-indigo-600"
                />
              </div>

              {loading && <p className="text-xs text-center text-slate-500 font-bold">Searching players...</p>}

              <div className="space-y-2">
                {searchResults.map((u) => (
                  <div
                    key={u.id}
                    className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.username} className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200" />
                      <div>
                        <p className="font-black text-sm text-slate-900">{u.username}</p>
                        <p className="text-xs text-slate-500 font-medium">{u.bio || 'Gaming enthusiast'}</p>
                      </div>
                    </div>

                    <div>
                      {u.friendship_status === 'accepted' ? (
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-black border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Friends
                        </span>
                      ) : u.friendship_status === 'pending' ? (
                        <span className="text-xs px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-black border border-amber-200 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(u.id)}
                          className="text-xs px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Add Friend
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REQUESTS TAB */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                  Incoming Friend Requests ({incomingRequests.length})
                </h3>
                {incomingRequests.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3 font-semibold">No pending friend requests.</p>
                ) : (
                  incomingRequests.map((req) => (
                    <div
                      key={req.request_id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 mb-2 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <img src={req.avatar} alt={req.username} className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200" />
                        <div>
                          <p className="font-black text-sm text-slate-900">{req.username}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            Sent {new Date(req.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAcceptRequest(req.request_id)}
                          className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm transition-all cursor-pointer"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRejectRequest(req.request_id)}
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                          title="Reject"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {outgoingRequests.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                    Sent Requests ({outgoingRequests.length})
                  </h3>
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.request_id}
                      className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-3 mb-1.5 shadow-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={req.avatar} alt={req.username} className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200" />
                        <p className="text-xs font-black text-slate-800">{req.username}</p>
                      </div>
                      <span className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Waiting for response
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
