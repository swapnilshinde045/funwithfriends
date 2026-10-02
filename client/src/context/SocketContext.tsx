import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { NotificationItem, ChatMessage, FriendUser } from '../types';
import { apiRequest } from '../utils/api';
import { sound } from '../utils/sound';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationsRead: () => Promise<void>;
  // Direct Chat modal state
  activeDirectFriend: FriendUser | null;
  openDirectChat: (friend: FriendUser) => void;
  closeDirectChat: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);
  const [activeDirectFriend, setActiveDirectFriend] = useState<FriendUser | null>(null);

  const socketRef = useRef<Socket | null>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<{ notifications: NotificationItem[]; unreadCount: number }>('/rooms/notifications');
      setNotifications(res.notifications);
      setUnreadNotificationsCount(res.unreadCount);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const markNotificationsRead = async () => {
    if (!user) return;
    try {
      await apiRequest('/rooms/notifications/read', { method: 'POST' });
      setUnreadNotificationsCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const openDirectChat = (friend: FriendUser) => {
    setActiveDirectFriend(friend);
  };

  const closeDirectChat = () => {
    setActiveDirectFriend(null);
  };

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const s = io(socketUrl, {
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
      s.emit('user_connected', { userId: user.id });
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for personal real-time notification
    s.on(`notification_${user.id}`, (notif: NotificationItem) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadNotificationsCount(prev => prev + 1);
      sound.playChatPing();
    });

    socketRef.current = s;
    setSocket(s);

    fetchNotifications();

    return () => {
      s.disconnect();
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        notifications,
        unreadNotificationsCount,
        fetchNotifications,
        markNotificationsRead,
        activeDirectFriend,
        openDirectChat,
        closeDirectChat,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
