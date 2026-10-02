import React, { useState } from 'react';
import { 
  Gamepad2, 
  Users, 
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
    <header className="sticky top-0 z-40 w-full bg-white/95 border-b border-slate-200 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div 
          onClick={() => handleNavClick('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-slate-900">
              PLAY<span className="text-indigo-600">SPHERE</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 tracking-wider uppercase">
              ARCADE
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
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-500'}`} />
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Friends
          </button>
        </nav>

        {/* Right Section Actions & User Status */}
        <div className="flex items-center gap-2">
          <SoundToggle />
          <NotificationDropdown onNavigateRoom={onNavigateRoom} />

          {/* User Profile Pill */}
          {user && (
            <div 
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer transition-all group"
            >
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-lg bg-white object-cover border border-indigo-200 shadow-xs"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-black text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                  {user.username}
                </p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
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
            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all flex items-center justify-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 border border-slate-200 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 bg-white border-b border-slate-200 space-y-1.5 shadow-lg animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <Users className="w-5 h-5 text-emerald-600" />
            Friends Hub
          </button>
        </div>
      )}
    </header>
  );
};
