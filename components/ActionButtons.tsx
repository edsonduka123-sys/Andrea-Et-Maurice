
import React from 'react';
import { GameMode } from '../types';

interface ActionButtonsProps {
  onGenerate: () => void;
  onShuffle: () => void;
  isLoading: boolean;
  gameMode?: GameMode;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onGenerate, onShuffle, isLoading, gameMode = 'CONVERSATION' }) => {
  const getButtonText = () => {
    switch (gameMode) {
      case 'CHALLENGE':
        return "Lancer un Défi";
      case 'QUIZ':
        return "Lancer le Quiz";
      case 'YOU_RATHER':
        return "Lancer un Dilemme";
      case 'TRUE_FALSE':
        return "Lancer Vrai/Faux";
      case 'STORYTELLER':
        return "Lancer l'Histoire";
      default:
        return "Lancer l'IA";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mt-10">
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="flex-1 bg-gradient-to-r from-[#e91e63] to-[#2196f3] text-white font-bold py-4 px-6 rounded-2xl shadow-[0_10px_20px_rgba(233,30,99,0.3)] hover:shadow-[0_15px_25px_rgba(33,150,243,0.4)] hover:-translate-y-1 active:translate-y-0 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:rotate-12 transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.631 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
            </svg>
            {getButtonText()}
          </>
        )}
      </button>
      
      <button
        onClick={onShuffle}
        className="flex-1 bg-white/5 backdrop-blur-md text-white border border-white/10 font-bold py-4 px-6 rounded-2xl hover:bg-white/10 active:scale-95 transition-all duration-300 flex items-center justify-center gap-3 group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
        </svg>
        Aléatoire
      </button>
    </div>
  );
};

export default ActionButtons;
