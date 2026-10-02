import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Trash2, MessageSquare, Flame, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChatMessage } from '../../types';
import { sound } from '../../utils/sound';

const QUICK_EMOJIS = ['😂', '🔥', '💀', '🎉', '🎲', '👑', '😭', '🚀'];

interface RoomChatProps {
  roomId: string;
}

export const RoomChat: React.FC<RoomChatProps> = ({ roomId }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!socket || !roomId || !user) return;

    // Load initial room messages
    socket.emit('get_room_messages', { roomId }, (res: { messages: ChatMessage[] }) => {
      if (res && res.messages) {
        setMessages(res.messages);
      }
    });

    const handleNewMessage = (msg: ChatMessage) => {
      if (msg.room_id === roomId) {
        setMessages((prev) => [...prev, msg]);
        if (msg.sender_id !== user.id) {
          sound.playChatPing();
        }
      }
    };

    const handleUserTyping = ({ username, isTyping }: { username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username];
        } else {
          return prev.filter((u) => u !== username);
        }
      });
    };

    const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };

    socket.on('new_room_message', handleNewMessage);
    socket.on('room_user_typing', handleUserTyping);
    socket.on('message_deleted', handleMessageDeleted);

    return () => {
      socket.off('new_room_message', handleNewMessage);
      socket.off('room_user_typing', handleUserTyping);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [socket, roomId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!socket || !user || !roomId) return;

    socket.emit('room_typing', { roomId, username: user.username, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('room_typing', { roomId, username: user.username, isTyping: false });
    }, 2000);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !socket || !user || !roomId) return;

    socket.emit('send_room_message', {
      roomId,
      senderUser: user,
      message: inputText.trim(),
    });

    socket.emit('room_typing', { roomId, username: user.username, isTyping: false });
    sound.playClick();
    setInputText('');
    setShowEmojis(false);
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!socket || !user || !roomId) return;
    sound.playClick();
    socket.emit('delete_message', { messageId, userId: user.id, roomId });
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    sound.playClick();
  };

  return (
    <div className="flex flex-col h-full glass-card bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          Room Chat
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">Real-time</span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-950/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <Flame className="w-8 h-8 text-amber-500/50 mb-2 animate-bounce-soft" />
            <p className="font-medium">No messages yet!</p>
            <p className="text-[11px] text-slate-600 mt-1">Talk strategy or send some friendly trash talk!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex items-start gap-2 group ${isMe ? 'flex-row-reverse' : ''}`}>
                <img
                  src={msg.sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender_username}`}
                  alt={msg.sender_username}
                  className="w-7 h-7 rounded-lg bg-slate-900 object-cover border border-slate-700 shrink-0 mt-0.5"
                />
                <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-bold text-slate-300">{msg.sender_username}</span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMe && (
                      <button
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-opacity p-0.5"
                        title="Delete message"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded-2xl text-xs break-words ${
                      isMe
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-xs'
                        : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-tl-xs'
                    }`}
                  >
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-3 py-1 text-[11px] text-indigo-400 bg-slate-950/60 italic flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
          {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
        </div>
      )}

      {/* Quick Emoji Bar */}
      {showEmojis && (
        <div className="p-1.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-1 overflow-x-auto">
          {QUICK_EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => addEmoji(em)}
              className="text-base hover:scale-125 transition-transform p-1"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-1.5 text-slate-400 hover:text-amber-400 transition-colors"
        >
          <Smile className="w-4 h-4" />
        </button>
        <input
          type="text"
          placeholder="Send a chat..."
          value={inputText}
          onChange={handleInputChange}
          className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
