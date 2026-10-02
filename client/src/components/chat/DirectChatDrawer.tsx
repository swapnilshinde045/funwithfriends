import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Smile, MessageSquare, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ChatMessage } from '../../types';
import { sound } from '../../utils/sound';

const EMOJIS = ['😂', '🔥', '🎉', '🎮', '💀', '❤️', '👏', '😎', '😭', '👍'];

export const DirectChatDrawer: React.FC = () => {
  const { user } = useAuth();
  const { socket, activeDirectFriend, closeDirectChat } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !user || !activeDirectFriend) return;

    // Fetch initial chat history
    socket.emit('get_direct_messages', { userId1: user.id, userId2: activeDirectFriend.id }, (res: { messages: ChatMessage[] }) => {
      if (res && res.messages) {
        setMessages(res.messages);
      }
    });

    // Listen for direct messages for current user
    const handleDirectMessage = (msg: ChatMessage) => {
      if (
        (msg.sender_id === activeDirectFriend.id && msg.receiver_id === user.id) ||
        (msg.sender_id === user.id && msg.receiver_id === activeDirectFriend.id)
      ) {
        setMessages((prev) => [...prev, msg]);
        sound.playChatPing();
      }
    };

    socket.on(`direct_msg_${user.id}`, handleDirectMessage);

    return () => {
      socket.off(`direct_msg_${user.id}`, handleDirectMessage);
    };
  }, [socket, user, activeDirectFriend]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !socket || !user || !activeDirectFriend) return;

    socket.emit('send_direct_message', {
      senderUser: user,
      receiverId: activeDirectFriend.id,
      message: inputText.trim(),
    });

    sound.playClick();
    setInputText('');
    setShowEmojis(false);
  };

  const addEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    sound.playClick();
  };

  if (!activeDirectFriend || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 glass-card bg-slate-900/95 border border-indigo-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[480px] animate-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="p-3.5 bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={activeDirectFriend.avatar}
              alt={activeDirectFriend.username}
              className="w-9 h-9 rounded-xl bg-slate-950 object-cover border border-indigo-500/30"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-slate-900 ${
                activeDirectFriend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-100 truncate">{activeDirectFriend.username}</h3>
            <p className="text-[11px] text-slate-400 capitalize truncate">{activeDirectFriend.status}</p>
          </div>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            closeDirectChat();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-4">
            <MessageSquare className="w-8 h-8 text-slate-700 mb-2" />
            <p>No messages yet. Say hi to {activeDirectFriend.username}! 👋</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-xs shadow-md'
                      : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-xs'
                  }`}
                >
                  <p className="break-words">{msg.message}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Strip */}
      {showEmojis && (
        <div className="p-2 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-1 overflow-x-auto">
          {EMOJIS.map((em) => (
            <button
              key={em}
              onClick={() => addEmoji(em)}
              className="text-lg hover:scale-125 transition-transform p-1"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-2 text-slate-400 hover:text-amber-400 transition-colors"
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          type="text"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-950/80 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-pink-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-transform shadow-md"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
