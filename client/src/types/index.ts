export type LudoColor = 'red' | 'green' | 'yellow' | 'blue' | 'purple' | 'orange';

export interface User {
  id: string;
  username: string;
  email: string;
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

export interface FriendUser {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline' | 'in_game' | 'in_music';
  bio?: string;
  last_seen: string;
  friendship_id?: string;
}

export interface FriendRequest {
  request_id: string;
  created_at: string;
  user_id: string;
  username: string;
  avatar: string;
  bio?: string;
}

export interface RoomMember {
  member_id: string;
  user_id: string;
  joined_at: string;
  is_ready: number;
  player_slot: number;
  username: string;
  avatar: string;
  status: string;
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
  host?: {
    id: string;
    username: string;
    avatar: string;
  };
  members?: RoomMember[];
}

export interface ChatMessage {
  id: string;
  room_id?: string | null;
  sender_id: string;
  sender_username?: string;
  sender_avatar?: string;
  receiver_id?: string | null;
  message: string;
  reply_to_id?: string | null;
  created_at: string;
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

export interface LudoToken {
  id: number;
  position: number;
  stepCount: number;
  isHome: boolean;
}

export interface LudoPlayer {
  odId: string;
  userId: string;
  username: string;
  avatar: string;
  color: LudoColor;
  tokens: LudoToken[];
  hasWon: boolean;
  rank: number;
  score: number;
}

export interface LudoGameState {
  gameId: string;
  roomId: string;
  playerCount: number;
  players: LudoPlayer[];
  currentTurnIndex: number;
  currentDiceValue: number | null;
  hasRolled: boolean;
  validTokenMoves: number[];
  consecutiveSixes: number;
  status: 'playing' | 'finished';
  winners: { userId: string; username: string; rank: number; color: string }[];
  turnTimer: number;
  lastAction: string;
}

export interface SnakePlayer {
  userId: string;
  username: string;
  avatar: string;
  color: string;
  position: number;
  hasWon: boolean;
  rank: number;
}

export interface SnakeGameState {
  gameId: string;
  roomId: string;
  playerCount: number;
  players: SnakePlayer[];
  currentTurnIndex: number;
  currentDiceValue: number | null;
  lastEvent: {
    type: 'move' | 'ladder' | 'snake' | 'win' | 'extra_turn';
    from?: number;
    to?: number;
    player: string;
    description: string;
  } | null;
  status: 'playing' | 'finished';
  winners: { userId: string; username: string; rank: number; color: string }[];
  lastAction: string;
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
