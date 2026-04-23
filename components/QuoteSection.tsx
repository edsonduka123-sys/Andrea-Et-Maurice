
import React, { useState } from 'react';
import { Quote } from '../types';

interface QuoteSectionProps {
  quote: Quote | null;
  isLoading: boolean;
}

const QuoteSection: React.FC<QuoteSectionProps> = ({ quote, isLoading }) => {
  const [showCopied, setShowCopied] = useState(false);

  const handleShare = async () => {
    if (!quote) return;

    const shareData = {
      text: `"${quote.text}" — ${quote.author}`,
    };

    const copyToClipboard = async () => {
      try {
        await navigator.clipboard.writeText(shareData.text);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed:', err);
      }
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        await copyToClipboard();
      }
    } catch (err) {
      console.warn('Share API failed, falling back to clipboard', err);
      await copyToClipboard();
    }
  };

  if (isLoading && !quote) {
    return (
      <div className="w-full max-w-lg mx-auto mb-8 px-6 py-4 glass rounded-2xl animate-pulse flex flex-col items-center">
        <div className="h-3 w-48 bg-white/5 rounded mb-2"></div>
        <div className="h-2 w-32 bg-white/5 rounded"></div>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="w-full max-w-lg mx-auto mb-10 px-6 py-6 glass rounded-[2rem] border-white/5 relative overflow-hidden group hover:scale-[1.02] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(255,255,255,0.05)] transition-all duration-500 ease-out cursor-default">
      {/* Petit éclat lumineux */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 blur-3xl rounded-full -mr-12 -mt-12 transition-all duration-700 group-hover:opacity-100 opacity-50 group-hover:bg-rose-500/20 group-hover:scale-150"></div>
      
      {/* Glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

      <div className="relative text-center">
        <div className="flex justify-center items-center relative">
          <span className="text-[10px] font-black tracking-[0.3em] uppercase text-rose-400/60 mb-3 block transition-colors group-hover:text-rose-400">
            L'Inspiration du jour
          </span>
          
          <button 
            onClick={handleShare}
            className="absolute right-0 top-0 text-white/10 hover:text-white/40 transition-colors p-1"
            title="Partager la citation"
          >
             {showCopied ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
             ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                </svg>
             )}
          </button>
        </div>

        <p className="text-white/90 font-serif italic text-lg leading-relaxed mb-3 px-4 drop-shadow-sm group-hover:text-white transition-colors duration-300">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="text-[#D4AF37] font-medium text-xs tracking-widest uppercase opacity-80 group-hover:opacity-100 transition-opacity">
          — {quote.author}
        </p>
      </div>
    </div>
  );
};

export default QuoteSection;
