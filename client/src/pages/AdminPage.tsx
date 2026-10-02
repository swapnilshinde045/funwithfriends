import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Gamepad2, 
  MessageSquare, 
  Activity, 
  Trash2, 
  KeyRound, 
  Search, 
  Check, 
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../utils/api';
import { sound } from '../utils/sound';

export const AdminPage: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [activeRoomsList, setActiveRoomsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal for resetting user password
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [metricsRes, usersRes, roomsRes] = await Promise.all([
        apiRequest<{ metrics: any; recentUsers: any[] }>('/admin/metrics'),
        apiRequest<{ users: any[] }>('/admin/users'),
        apiRequest<{ rooms: any[] }>('/admin/rooms'),
      ]);

      setMetrics(metricsRes.metrics);
      setUserList(usersRes.users);
      setActiveRoomsList(roomsRes.rooms);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (targetUser: any) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change ${targetUser.username}'s role to ${newRole}?`)) return;

    try {
      sound.playClick();
      await apiRequest(`/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      loadData();
    } catch (err) {
      console.error('Error updating user role:', err);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user @${username}?`)) return;

    try {
      sound.playClick();
      await apiRequest(`/admin/users/${userId}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
    }
  };

  const handleCloseRoom = async (roomId: string) => {
    if (!window.confirm('Force close this active room?')) return;
    try {
      sound.playClick();
      await apiRequest(`/admin/rooms/${roomId}`, { method: 'DELETE' });
      loadData();
    } catch (err) {
      console.error('Error closing room:', err);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordInput || newPasswordInput.length < 6) return;

    try {
      sound.playClick();
      await apiRequest(`/admin/users/${resetModalUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword: newPasswordInput }),
      });
      alert(`Password successfully updated for ${resetModalUser.username}`);
      setResetModalUser(null);
      setNewPasswordInput('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-white">Admin Access Restricted</h2>
        <p className="text-xs text-slate-400">You must be an administrator to view this control panel.</p>
      </div>
    );
  }

  const filteredUsers = userList.filter(
    (u) =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in">
      
      {/* Header */}
      <div className="glass-card bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              MODERATOR CONTROL
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Platform Admin Dashboard</h1>
          </div>
        </div>

        <button
          onClick={loadData}
          className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
        >
          Refresh Data
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{metrics?.totalUsers || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Total Registered Users</p>
          </div>
        </div>

        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{metrics?.onlineUsers || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Currently Online</p>
          </div>
        </div>

        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{metrics?.activeRooms || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Active Game Rooms</p>
          </div>
        </div>

        <div className="glass-card bg-slate-900/90 border border-slate-800 p-5 rounded-3xl shadow-xl flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-white">{metrics?.totalMessages || 0}</p>
            <p className="text-xs font-semibold text-slate-400">Messages Sent</p>
          </div>
        </div>
      </div>

      {/* Users Management Section */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> User Accounts & Roles ({filteredUsers.length})
            </h2>
            <p className="text-xs text-slate-400">Moderate registered players and assign permissions</p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search user or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3 rounded-l-xl">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Status</th>
                <th className="p-3">Registered</th>
                <th className="p-3 text-right rounded-r-xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 flex items-center gap-2.5">
                    <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-xl bg-slate-950 object-cover" />
                    <div>
                      <p className="font-bold text-slate-100">{u.username}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{u.id.slice(0, 8)}...</p>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        u.role === 'admin'
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1.5 ${
                        u.status === 'online' ? 'text-emerald-400 font-bold' : 'text-slate-500'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleRole(u)}
                        title={u.role === 'admin' ? 'Demote to user' : 'Promote to admin'}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 text-[11px] font-semibold border border-slate-700 transition-all"
                      >
                        {u.role === 'admin' ? 'Make User' : 'Make Admin'}
                      </button>
                      <button
                        onClick={() => setResetModalUser(u)}
                        title="Reset user password"
                        className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/30 transition-all"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          title="Delete user"
                          className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Rooms Monitor Section */}
      <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-emerald-400" /> Active Platform Rooms ({activeRoomsList.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeRoomsList.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-indigo-400 tracking-wider">
                    {r.room_code}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {r.room_type}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Host: <span className="text-slate-200 font-bold">{r.host_username}</span> • {r.member_count}/{r.max_players} Players
                </p>
              </div>

              <button
                onClick={() => handleCloseRoom(r.id)}
                title="Force close room"
                className="p-2 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* PASSWORD RESET MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm glass-card bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" /> Reset Password
            </h3>
            <p className="text-xs text-slate-400">
              Set a new password for <span className="text-white font-bold">{resetModalUser.username}</span>.
            </p>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="Enter new password (min 6 chars)..."
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold shadow-md"
                >
                  Confirm Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
