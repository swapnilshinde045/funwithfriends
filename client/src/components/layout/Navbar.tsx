import React, { useState } from 'react';
import { 
  Gamepad2, 
  Users, 
  MessageSquare, 
  Music, 
  Shield, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NotificationDropdown } from './NotificationDropdown';
import { SoundToggle } from '../common/SoundToggle';
import { sound } from '../../utils/sound';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenFriendsModal: () => void;
  onNavigateRoom?: (roomCode: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  onOpenFriendsModal,
  onNavigateRoom
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Gamepad2 },
    { id: 'music', label: 'Music Lounge', icon: Music },
    { id: 'profile', label: 'Profile', icon: UserIcon },
    ...(user?.role === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Shield }] : [])
  ];

  const handleNavClick = (id: string) => {
    sound.playClick();
    setCurrentTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-card border-b border-slate-800/80 bg-[#07090e]/85 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <span className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-indigo-200 to-pink-400 bg-clip-text text-transparent">
              PLAYSPHERE
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-widest uppercase">
              MULTIPLAYER
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}

          {/* Social Friends Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenFriendsModal();
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            Friends
          </button>
        </nav>

        {/* Right Section Actions & User Status */}
        <div className="flex items-center gap-2.5">
          <SoundToggle />
          <NotificationDropdown onNavigateRoom={onNavigateRoom} />

          {/* User Profile Pill */}
          {user && (
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 cursor-pointer transition-all group"
            >
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg bg-slate-900 object-cover border border-indigo-500/40"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-slate-200 leading-tight group-hover:text-indigo-400 transition-colors">
                  {user.username}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {user.role}
                </p>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <button
            onClick={() => {
              sound.playClick();
              logout();
            }}
            title="Logout"
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-800/60 hover:bg-rose-950/40 border border-slate-700/50 hover:border-rose-500/40 transition-all flex items-center justify-center"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 border border-slate-700/50"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 bg-slate-900/98 border-b border-slate-800 space-y-1.5 animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
          <button
            onClick={() => {
              sound.playClick();
              onOpenFriendsModal();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-all"
          >
            <Users className="w-5 h-5 text-emerald-400" />
            Friends Hub
          </button>
        </div>
      )}
    </header>
  );
};
