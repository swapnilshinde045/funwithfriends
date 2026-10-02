import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider, useSocket } from './context/SocketContext';
import { Navbar } from './components/layout/Navbar';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { GameRoomPage } from './pages/GameRoomPage';
import { MusicRoomPage } from './pages/MusicRoomPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { DirectChatDrawer } from './components/chat/DirectChatDrawer';
import { FriendsModal } from './components/friends/FriendsModal';

const MainAppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [friendsModalOpen, setFriendsModalOpen] = useState<boolean>(false);

  // Parse invite URL param on mount (e.g. ?join=X7K92P)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('join');
    if (joinCode) {
      setActiveRoomCode(joinCode.toUpperCase());
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#ece6db] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-bold text-stone-700">Loading PlaySphere...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  // Active Game Room takes over full view if player is in a room
  if (activeRoomCode) {
    return (
      <div className="min-h-screen bg-[#ece6db] text-stone-900 flex flex-col">
        <Navbar
          currentTab={currentTab}
          setCurrentTab={(t) => {
            setActiveRoomCode(null);
            setCurrentTab(t);
          }}
          onOpenFriendsModal={() => setFriendsModalOpen(true)}
          onNavigateRoom={(code) => setActiveRoomCode(code)}
        />
        <main className="flex-1">
          <GameRoomPage
            roomCode={activeRoomCode}
            onLeave={() => {
              setActiveRoomCode(null);
              // Clean query param
              window.history.replaceState({}, document.title, window.location.pathname);
            }}
          />
        </main>
        <DirectChatDrawer />
        <FriendsModal
          isOpen={friendsModalOpen}
          onClose={() => setFriendsModalOpen(false)}
          activeRoomCode={activeRoomCode}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ece6db] text-stone-900 flex flex-col selection:bg-indigo-600 selection:text-white">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenFriendsModal={() => setFriendsModalOpen(true)}
        onNavigateRoom={(code) => setActiveRoomCode(code)}
      />

      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <Dashboard
            onJoinRoom={(code) => setActiveRoomCode(code)}
            onOpenFriendsModal={() => setFriendsModalOpen(true)}
            onNavigateTab={(tab) => setCurrentTab(tab)}
          />
        )}
        {currentTab === 'music' && (
          <MusicRoomPage
            onLeave={() => setCurrentTab('dashboard')}
          />
        )}
        {currentTab === 'profile' && <ProfilePage />}
        {currentTab === 'admin' && <AdminPage />}
      </main>

      {/* Floating 1-on-1 Direct Chat & Friends Hub Modal */}
      <DirectChatDrawer />
      <FriendsModal
        isOpen={friendsModalOpen}
        onClose={() => setFriendsModalOpen(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <MainAppContent />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
