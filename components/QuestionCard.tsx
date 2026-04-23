
import React, { useState, useRef } from 'react';
import { Question } from '../types';
import { CATEGORY_ICONS } from '../constants';

interface QuestionCardProps {
  question: Question | null;
  isLoading: boolean;
  onFavorite: (q: Question) => void;
  isFavorite: boolean;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ 
  question, 
  isLoading, 
  onFavorite,
  isFavorite 
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!question) return;

    const shareData: { title: string; text: string; url?: string } = {
      title: 'Andrea & Maurice',
      text: `Question de couple : "${question.text}"`,
    };

    if (window.location.protocol.startsWith('http')) {
      shareData.url = window.location.href;
    }

    const copyToClipboard = async () => {
      try {
        const textToCopy = shareData.url 
          ? `${shareData.text}\n\n${shareData.url}` 
          : shareData.text;
        
        await navigator.clipboard.writeText(textToCopy);
        setShowCopied(true);
        setTimeout(() => setShowCopied(false), 2000);
      } catch (clipboardErr) {
        console.error('Clipboard copy failed:', clipboardErr);
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    // Calculate rotation (max 5 degrees for subtle effect)
    // RotateX: Positive is top back. We want top back when mouse is at top (y small).
    // y < centerY -> y - centerY < 0. We want positive. So -(y - centerY).
    const rotateX = ((centerY - y) / centerY) * 5; 
    
    // RotateY: Positive is right back. We want right back when mouse is at right (x large).
    // x > centerX -> x - centerX > 0. We want positive. So (x - centerX).
    const rotateY = ((x - centerX) / centerX) * 5;

    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      className="relative w-full max-w-md perspective-1000"
      style={{ perspective: '1000px' }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovering 
            ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale3d(1.02, 1.02, 1.02)`
            : 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
          transition: isHovering ? 'transform 0.1s ease-out' : 'transform 0.5s ease-out',
          transformStyle: 'preserve-3d'
        }}
        className="group relative w-full h-full"
      >
        {/* Background Glow - follows tilt */}
        <div 
          className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition duration-1000"
          style={{ transform: 'translateZ(-10px)' }} // Push glow back slightly
        ></div>
        
        <div className="relative glass rounded-3xl p-8 flex flex-col min-h-[20rem] h-full overflow-hidden shadow-2xl backdrop-blur-xl border border-white/10">
          
          {/* Subtle sheen effect on hover */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none transform translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>

          {isLoading ? (
            /* Loading Skeleton */
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded-full"></div>
              <div className="h-8 w-full bg-white/5 rounded-lg"></div>
              <div className="h-8 w-3/4 bg-white/5 rounded-lg"></div>
            </div>
          ) : !question ? (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <span className="text-4xl mb-4 opacity-50 animate-bounce delay-1000 duration-3000">✨</span>
              <h2 className="text-2xl font-serif text-white/80">Prêt(e) à discuter ?</h2>
              <p className="text-white/40 mt-2 italic">Choisissez une catégorie pour commencer.</p>
            </div>
          ) : (
            /* Question Content */
            <div 
              key={question.id} 
              className="flex-1 flex flex-col justify-between animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out"
              style={{ transform: 'translateZ(20px)' }} // Pop content forward slightly in 3D
            >
              <div className="mb-6">
                <div className="flex justify-between items-start mb-6">
                  <span className="px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-white/10 border border-white/10 text-white/80 shadow-sm">
                    {CATEGORY_ICONS[question.category]} {question.category}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleShare}
                      className="p-2 rounded-full transition-all text-white/20 hover:text-blue-300 hover:bg-white/5 relative active:scale-95 z-10"
                      title="Partager"
                    >
                      {showCopied ? (
                        <span className="text-emerald-400 animate-in zoom-in duration-300">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        </span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                        </svg>
                      )}
                    </button>

                    <button 
                      onClick={() => onFavorite(question)}
                      className={`p-2 rounded-full transition-all active:scale-95 z-10 ${isFavorite ? 'text-rose-400 bg-rose-400/10' : 'text-white/20 hover:text-rose-300 hover:bg-white/5'}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <h2 className="text-2xl md:text-3xl font-serif leading-relaxed text-white italic break-words selection:bg-rose-500/30 drop-shadow-md">
                  &quot;{question.text}&quot;
                </h2>
              </div>

              <div className="mt-4 pt-4 border-t border-white/5 flex items-center text-[10px] text-white/20 font-bold tracking-widest uppercase">
                {question.isAiGenerated ? (
                  <span className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></span>
                    Propulsé par Edso908
                  </span>
                ) : (
                  <span>Héritage Andrea & Maurice</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionCard;
