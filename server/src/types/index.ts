export interface User {
  id: string;
  username: string;
  email: string;
  password_hash?: string;
  avatar: string;
  role: 'user' | 'admin';
  bio?: string;
  status: 'online' | 'offline' | 'in_game' | 'in_music';
  last_seen: string;
  created_at: string;
}

export interface UserStats {
  userId: string;
  ludoWins: number;
  ludoGames: number;
  snakesWins: number;
  snakesGames: number;
  totalGames: number;
  totalWins: number;
  winRate: number;
  friendsCount: number;
}

export interface FriendRelation {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  created_at: string;
  updated_at: string;
  friend?: User;
}

export interface Room {
  id: string;
  room_code: string;
  room_type: 'ludo' | 'snakes' | 'music';
  host_id: string;
  status: 'waiting' | 'in_progress' | 'finished';
  max_players: number;
  is_private: number;
  created_at: string;
  members?: RoomMember[];
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  is_ready: number;
  player_slot: number;
  user?: User;
}

export interface ChatMessage {
  id: string;
  room_id?: string | null;
  sender_id: string;
  receiver_id?: string | null;
  message: string;
  reply_to_id?: string | null;
  created_at: string;
  read_at?: string | null;
  sender_username?: string;
  sender_avatar?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  sender_id: string;
  type: 'friend_request' | 'friend_accepted' | 'game_invite' | 'music_invite' | 'system';
  message: string;
  data_json?: string;
  read: number;
  created_at: string;
  sender_username?: string;
  sender_avatar?: string;
}

export interface MusicQueueItem {
  id: string;
  title: string;
  artist: string;
  url: string;
  youtubeId: string;
  thumbnail: string;
  duration?: number;
  addedBy: {
    id: string;
    username: string;
    avatar: string;
  };
}

export interface MusicRoomState {
  roomId: string;
  currentTrack: MusicQueueItem | null;
  isPlaying: boolean;
  currentTime: number;
  queue: MusicQueueItem[];
  volume: number;
  lastUpdated: number;
}
