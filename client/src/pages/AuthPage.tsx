import React, { useState } from 'react';
import { 
  Gamepad2, 
  Sparkles, 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
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

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Form states
  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [bio, setBio] = useState('Ready for game night!');

  // Forgot password states
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetAvailable, setResetAvailable] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    sound.playClick();

    try {
      await login(loginInput.trim(), password);
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    sound.playClick();

    try {
      await register(username.trim(), email.trim(), password, selectedAvatar, bio);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    sound.playClick();

    try {
      const res = await apiRequest<{ message: string; resetAvailable: boolean }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      setSuccessMsg(res.message);
      if (res.resetAvailable) {
        setResetAvailable(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    sound.playClick();

    try {
      const res = await apiRequest<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail.trim(), newPassword }),
      });
      setSuccessMsg(res.message);
      setResetAvailable(false);
      setTab('login');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative overflow-hidden select-none">
      
      {/* Background Soft Blobs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-pink-200/40 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            PLAY<span className="text-indigo-600">SPHERE</span>
          </h1>
          <p className="text-xs text-slate-500 font-bold">
            Real-Time Multiplayer Gaming & Friends Hangout Hub
          </p>
        </div>

        {/* Tab Selection */}
        <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex gap-1">
          <button
            onClick={() => {
              sound.playClick();
              setTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              tab === 'login'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              tab === 'register'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error / Success Messages */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Username or Email</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="Enter username or email..."
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTab('forgot');
                  }}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-black cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="Enter your password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Logging in...' : 'Sign In & Play'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* REGISTER FORM */}
        {tab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Avatar Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Choose Avatar</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {AVATARS.map((av) => (
                  <img
                    key={av}
                    src={av}
                    alt="avatar"
                    onClick={() => {
                      sound.playClick();
                      setSelectedAvatar(av);
                    }}
                    className={`w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 object-cover cursor-pointer transition-all ${
                      selectedAvatar === av ? 'ring-2 ring-indigo-600 scale-110 shadow-md' : 'opacity-60'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. PixelMaster"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Register & Join'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* FORGOT PASSWORD FORM */}
        {tab === 'forgot' && (
          <div className="space-y-4">
            {!resetAvailable ? (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="Enter your account email..."
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTab('login')}
                    className="w-1/3 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    {loading ? 'Submitting...' : 'Send Reset'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Enter your new password..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Set Password & Login'}
                </button>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
