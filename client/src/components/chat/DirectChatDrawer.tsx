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
    <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[480px] animate-in slide-in-from-bottom-5 select-none">
      {/* Header */}
      <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            <img
              src={activeDirectFriend.avatar}
              alt={activeDirectFriend.username}
              className="w-9 h-9 rounded-xl bg-white object-cover border border-slate-200 shadow-xs"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                activeDirectFriend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-sm text-slate-900 truncate">{activeDirectFriend.username}</h3>
            <p className="text-[11px] text-emerald-600 font-bold capitalize truncate">{activeDirectFriend.status}</p>
          </div>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            closeDirectChat();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message Feed */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-2 bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
            <MessageSquare className="w-8 h-8 text-indigo-400 mb-2 animate-bounce-soft" />
            <p className="font-bold text-slate-700">Say Hello to {activeDirectFriend.username}!</p>
            <p className="text-[11px] text-slate-500 mt-1">Direct messages are persistent and synchronized.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-xs font-medium break-words shadow-xs ${
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                  }`}
                >
                  {msg.message}
                </div>
                <span className="text-[9px] text-slate-400 font-semibold px-1 mt-0.5">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Emoji Picker Bar */}
      {showEmojis && (
        <div className="p-1.5 border-t border-slate-200 bg-white flex items-center justify-between gap-1 overflow-x-auto">
          {EMOJIS.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => addEmoji(em)}
              className="text-base hover:scale-125 transition-transform p-1 cursor-pointer"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowEmojis(!showEmojis)}
          className="p-1.5 text-slate-500 hover:text-amber-500 transition-colors cursor-pointer"
        >
          <Smile className="w-4 h-4" />
        </button>
        <input
          type="text"
          placeholder={`Message ${activeDirectFriend.username}...`}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
