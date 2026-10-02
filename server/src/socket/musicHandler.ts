import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { MusicQueueItem, MusicRoomState } from '../types/index.js';

export const activeMusicRooms = new Map<string, MusicRoomState>();

// Default curated lounge tracks (popular royalty-free / licensed chill music for instant enjoyment)
export const DEFAULT_LOUNGE_PLAYLIST: MusicQueueItem[] = [
  {
    id: 'lounge-1',
    title: 'Lofi Hip Hop Beats to Relax / Study to',
    artist: 'Lofi Girl',
    youtubeId: 'jfKfPfyJRdk',
    thumbnail: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
    duration: 3600,
    addedBy: { id: 'system', username: 'PlaySphere DJ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DJBot' }
  },
  {
    id: 'lounge-2',
    title: 'Synthwave Radio - Chill Retro Vibes',
    artist: 'Lofi Synth',
    youtubeId: '4xDzrJKXOOY',
    thumbnail: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY',
    duration: 3600,
    addedBy: { id: 'system', username: 'PlaySphere DJ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DJBot' }
  },
  {
    id: 'lounge-3',
    title: 'Gaming Chill Vibes & Future Bass Mix',
    artist: 'NCS Chill',
    youtubeId: '1fumP6_b13U',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    url: 'https://www.youtube.com/watch?v=1fumP6_b13U',
    duration: 3600,
    addedBy: { id: 'system', username: 'PlaySphere DJ', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DJBot' }
  }
];

export class MusicHandler {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public getOrCreateRoom(roomId: string): MusicRoomState {
    let state = activeMusicRooms.get(roomId);
    if (!state) {
      state = {
        roomId,
        currentTrack: DEFAULT_LOUNGE_PLAYLIST[0],
        isPlaying: true,
        currentTime: 0,
        queue: [...DEFAULT_LOUNGE_PLAYLIST.slice(1)],
        volume: 80,
        lastUpdated: Date.now()
      };
      activeMusicRooms.set(roomId, state);
    }
    return state;
  }

  public addTrack(roomId: string, track: Omit<MusicQueueItem, 'id'>): MusicRoomState {
    const state = this.getOrCreateRoom(roomId);
    const newTrack: MusicQueueItem = {
      ...track,
      id: uuidv4()
    };

    if (!state.currentTrack) {
      state.currentTrack = newTrack;
      state.isPlaying = true;
      state.currentTime = 0;
    } else {
      state.queue.push(newTrack);
    }
    state.lastUpdated = Date.now();

    this.broadcastState(roomId);
    this.persistRoomState(roomId);
    return state;
  }

  public removeTrack(roomId: string, trackId: string): MusicRoomState {
    const state = this.getOrCreateRoom(roomId);
    state.queue = state.queue.filter(t => t.id !== trackId);
    state.lastUpdated = Date.now();

    this.broadcastState(roomId);
    this.persistRoomState(roomId);
    return state;
  }

  public setPlayback(roomId: string, isPlaying: boolean, currentTime?: number): MusicRoomState {
    const state = this.getOrCreateRoom(roomId);
    state.isPlaying = isPlaying;
    if (currentTime !== undefined) {
      state.currentTime = currentTime;
    }
    state.lastUpdated = Date.now();

    this.broadcastState(roomId);
    return state;
  }

  public nextTrack(roomId: string): MusicRoomState {
    const state = this.getOrCreateRoom(roomId);
    if (state.queue.length > 0) {
      state.currentTrack = state.queue.shift() || null;
      state.currentTime = 0;
      state.isPlaying = true;
    } else {
      // Loop default playlist if queue empty
      state.currentTrack = DEFAULT_LOUNGE_PLAYLIST[0];
      state.currentTime = 0;
      state.queue = [...DEFAULT_LOUNGE_PLAYLIST.slice(1)];
    }
    state.lastUpdated = Date.now();

    this.broadcastState(roomId);
    this.persistRoomState(roomId);
    return state;
  }

  public prevTrack(roomId: string): MusicRoomState {
    const state = this.getOrCreateRoom(roomId);
    state.currentTime = 0;
    state.lastUpdated = Date.now();
    this.broadcastState(roomId);
    return state;
  }

  private persistRoomState(roomId: string): void {
    const state = activeMusicRooms.get(roomId);
    if (state) {
      try {
        db.prepare(`
          INSERT INTO music_rooms (id, room_id, current_content_json, queue_json, playback_state_json, updated_at)
          VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(room_id) DO UPDATE SET
            current_content_json = excluded.current_content_json,
            queue_json = excluded.queue_json,
            playback_state_json = excluded.playback_state_json,
            updated_at = CURRENT_TIMESTAMP
        `).run(
          uuidv4(),
          roomId,
          JSON.stringify(state.currentTrack),
          JSON.stringify(state.queue),
          JSON.stringify({ isPlaying: state.isPlaying, currentTime: state.currentTime })
        );
      } catch (err) {
        console.error('Error persisting music room state:', err);
      }
    }
  }

  public broadcastState(roomId: string): void {
    const state = activeMusicRooms.get(roomId);
    if (state) {
      this.io.to(roomId).emit('music_state_update', state);
    }
  }
}
