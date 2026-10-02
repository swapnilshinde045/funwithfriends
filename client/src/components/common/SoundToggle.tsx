import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { sound } from '../../utils/sound';

export const SoundToggle: React.FC = () => {
  const [muted, setMuted] = useState(sound.getIsMuted());

  const handleToggle = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sound.playClick();
    }
  };

  return (
    <button
      onClick={handleToggle}
      title={muted ? 'Unmute game audio FX' : 'Mute game audio FX'}
      className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 transition-all flex items-center justify-center"
    >
      {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-indigo-400" />}
    </button>
  );
};
