import React, { useState, useEffect } from 'react';
import { 
  Music, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Plus, 
  Trash2, 
  Users, 
  Radio, 
  Sparkles,
  Share2,
  Copy,
  Check,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { MusicRoomState, MusicQueueItem } from '../types';
import { RoomChat } from '../components/chat/RoomChat';
import { sound } from '../utils/sound';

interface MusicRoomPageProps {
  roomCode?: string;
  roomId?: string;
  onLeave?: () => void;
}

// Preset popular hangout tracks
const PRESET_TRACKS = [
  { title: 'Synthwave Radio - Chill Synth Vibes', artist: 'Lofi Synth', youtubeId: '4xDzrJKXOOY', thumb: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80' },
  { title: 'Lofi Hip Hop - Beats to Relax/Study', artist: 'Lofi Girl', youtubeId: 'jfKfPfyJRdk', thumb: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80' },
  { title: 'Future Bass & EDM Gaming Lounge', artist: 'NCS Gaming', youtubeId: '1fumP6_b13U', thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80' },
  { title: 'Cyberpunk Electro Beats', artist: 'Night Drive', youtubeId: 'mPnU4H1vW4g', thumb: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80' },
];

export const MusicRoomPage: React.FC<MusicRoomPageProps> = ({
  roomCode = 'LOUNGE',
  roomId = 'default-music-room',
  onLeave
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [musicState, setMusicState] = useState<MusicRoomState | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customArtist, setCustomArtist] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket || !user) return;

    // Join the music room channel
    socket.emit('join_room', { roomId, user });

    const handleMusicUpdate = (state: MusicRoomState) => {
      setMusicState(state);
    };

    socket.on('music_state_update', handleMusicUpdate);

    return () => {
      socket.off('music_state_update', handleMusicUpdate);
    };
  }, [socket, roomId, user]);

  const handlePlayPause = () => {
    if (!socket || !musicState) return;
    sound.playClick();
    socket.emit('music_play_pause', {
      roomId,
      isPlaying: !musicState.isPlaying,
      currentTime: musicState.currentTime,
    });
  };

  const handleNext = () => {
    if (!socket) return;
    sound.playClick();
    socket.emit('music_next_track', { roomId });
  };

  const handlePrev = () => {
    if (!socket) return;
    sound.playClick();
    socket.emit('music_prev_track', { roomId });
  };

  const handleAddTrack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!socket || !user || !customTitle.trim()) return;

    let youtubeId = 'jfKfPfyJRdk';
    if (customUrl.includes('v=')) {
      youtubeId = customUrl.split('v=')[1].split('&')[0];
    } else if (customUrl.includes('youtu.be/')) {
      youtubeId = customUrl.split('youtu.be/')[1].split('?')[0];
    }

    sound.playClick();
    socket.emit('music_add_track', {
      roomId,
      track: {
        title: customTitle.trim(),
        artist: customArtist.trim() || 'Community Artist',
        url: customUrl || `https://www.youtube.com/watch?v=${youtubeId}`,
        youtubeId,
        thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        addedBy: { id: user.id, username: user.username, avatar: user.avatar }
      }
    });

    setCustomTitle('');
    setCustomArtist('');
    setCustomUrl('');
    setShowAddModal(false);
  };

  const handleAddPreset = (preset: typeof PRESET_TRACKS[0]) => {
    if (!socket || !user) return;
    sound.playClick();
    socket.emit('music_add_track', {
      roomId,
      track: {
        title: preset.title,
        artist: preset.artist,
        url: `https://www.youtube.com/watch?v=${preset.youtubeId}`,
        youtubeId: preset.youtubeId,
        thumbnail: preset.thumb,
        addedBy: { id: user.id, username: user.username, avatar: user.avatar }
      }
    });
  };

  const handleRemoveTrack = (trackId: string) => {
    if (!socket) return;
    sound.playClick();
    socket.emit('music_remove_track', { roomId, trackId });
  };

  const handleWhatsAppShare = () => {
    sound.playClick();
    const joinUrl = `${window.location.origin}/?join=${roomCode}`;
    const text = `🎵 Join our PlaySphere Music Lounge!\nRoom Code: ${roomCode}\nListen & vibe with friends: ${joinUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  const currentTrack = musicState?.currentTrack;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-in fade-in">
      
      {/* Lounge Header */}
      <div className="glass-card bg-gradient-to-r from-slate-900 via-pink-950/40 to-slate-900 border border-pink-500/30 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-600 text-white shadow-xl shadow-pink-500/20">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                LIVE MUSIC & WATCH ROOM
              </span>
              <span className="text-xs text-slate-400">Room: {roomCode}</span>
            </div>
            <h1 className="text-2xl font-black text-white">Friends Hangout Lounge</h1>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
          >
            <MessageCircle className="w-4 h-4 fill-current" />
            Share WhatsApp
          </button>
          <button
            onClick={() => {
              sound.playClick();
              navigator.clipboard.writeText(roomCode);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="px-3.5 py-2 rounded-2xl bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Code'}
          </button>
          {onLeave && (
            <button
              onClick={onLeave}
              className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 text-xs font-semibold border border-slate-700 transition-all"
            >
              Exit Lounge
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Player + Queue vs Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Columns: Player & Queue */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* NOW PLAYING CARD */}
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Music className="w-4 h-4" /> Now Playing
              </span>
              
              {/* Equalizer animation */}
              <div className="flex items-end gap-1 h-5">
                <span className="w-1 bg-pink-500 rounded-full animate-[bounce_0.8s_infinite] h-4" />
                <span className="w-1 bg-indigo-500 rounded-full animate-[bounce_1.1s_infinite] h-5" />
                <span className="w-1 bg-emerald-500 rounded-full animate-[bounce_0.6s_infinite] h-3" />
                <span className="w-1 bg-amber-500 rounded-full animate-[bounce_0.9s_infinite] h-4" />
              </div>
            </div>

            {/* Embedded YouTube Iframe / Artwork */}
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl">
              {currentTrack?.youtubeId ? (
                <iframe
                  title="YouTube Music Player"
                  src={`https://www.youtube-nocookie.com/embed/${currentTrack.youtubeId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  <Music className="w-12 h-12 mb-2" />
                  <p className="text-sm">No track currently selected.</p>
                </div>
              )}
            </div>

            {/* Track Info & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              <div className="min-w-0">
                <h3 className="text-lg font-black text-white truncate">
                  {currentTrack?.title || 'PlaySphere Lounge Radio'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {currentTrack?.artist || 'Curated chill tracks'} • Added by {currentTrack?.addedBy?.username || 'DJ Bot'}
                </p>
              </div>

              {/* Playback Buttons */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handlePrev}
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  title="Previous / Replay"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="p-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 hover:scale-105 active:scale-95 text-white shadow-xl shadow-pink-500/30 transition-all"
                  title={musicState?.isPlaying ? 'Pause' : 'Play'}
                >
                  {musicState?.isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>
                <button
                  onClick={handleNext}
                  className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                  title="Skip to next track"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* SHARED QUEUE & QUICK PRESETS */}
          <div className="glass-card bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" /> Up Next in Queue ({musicState?.queue.length || 0})
                </h3>
                <p className="text-xs text-slate-400">Add songs for everyone in the room to hear together</p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:scale-105 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add Track
              </button>
            </div>

            {/* Presets Quick Picker */}
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Instant Lounge Vibes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_TRACKS.map((preset) => (
                  <div
                    key={preset.title}
                    className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-pink-500/40 flex items-center justify-between gap-2 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={preset.thumb} alt={preset.title} className="w-9 h-9 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{preset.title}</p>
                        <p className="text-[10px] text-slate-400">{preset.artist}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddPreset(preset)}
                      title="Add to queue"
                      className="p-1.5 rounded-lg bg-pink-600/20 text-pink-300 hover:bg-pink-600 hover:text-white transition-all shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue List */}
            <div className="space-y-2 pt-2">
              {(!musicState || musicState.queue.length === 0) ? (
                <p className="text-xs text-center text-slate-500 py-4">No more tracks in queue. Add some above!</p>
              ) : (
                musicState.queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-black text-slate-500 w-4">{idx + 1}</span>
                      <img src={item.thumbnail} alt={item.title} className="w-10 h-10 rounded-xl object-cover bg-slate-950" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-200 truncate">{item.title}</p>
                        <p className="text-[10px] text-slate-400">{item.artist} • Added by {item.addedBy?.username}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveTrack(item.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-all"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right 1 Column: Room Live Chat */}
        <div className="h-[650px]">
          <RoomChat roomId={roomId} />
        </div>

      </div>

      {/* ADD TRACK MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md glass-card bg-slate-900 border border-pink-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-pink-400" /> Add Track to Queue
            </h3>
            <form onSubmit={handleAddTrack} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Song / Video Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chillhop Music - Coffee Beats"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Artist / Channel</label>
                <input
                  type="text"
                  placeholder="e.g. Chillhop Music"
                  value={customArtist}
                  onChange={(e) => setCustomArtist(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">YouTube URL or ID (optional)</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 text-white text-xs font-bold shadow-lg shadow-pink-500/20"
                >
                  Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
