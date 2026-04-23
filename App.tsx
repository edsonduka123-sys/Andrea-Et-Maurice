
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import QuestionCard from './components/QuestionCard';
import ActionButtons from './components/ActionButtons';
import QuoteSection from './components/QuoteSection';
import RelationshipCounter from './components/RelationshipCounter';
import ChatInterface from './components/ChatInterface';
import { Category, Question, Quote, GameMode } from './types';
import { FALLBACK_QUESTIONS, CATEGORY_ICONS } from './constants';
import { geminiService } from './services/geminiService';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const App: React.FC = () => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [dailyQuote, setDailyQuote] = useState<Quote | null>(null);
  const [history, setHistory] = useState<Question[]>([]);
  const [favorites, setFavorites] = useState<Question[]>([]);
  
  const [gameMode, setGameMode] = useState<GameMode>('CONVERSATION');
  const [activeCategory, setActiveCategory] = useState<Category>(Category.DEEP);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  
  // View Navigation State
  const views = ['generate', 'chat', 'history', 'favorites'] as const;
  type ViewType = typeof views[number];
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const viewLabels: Record<ViewType, string> = {
    generate: 'Jeu',
    chat: 'Coach IA',
    history: 'Historique',
    favorites: `Favoris (${favorites.length})`
  };

  useEffect(() => {
    const saved = localStorage.getItem('spark_favorites');
    if (saved) setFavorites(JSON.parse(saved));
    
    const savedHistory = localStorage.getItem('spark_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    fetchDailyQuote();
    geminiService.warmup(Category.DEEP);
    geminiService.warmup(Category.CHALLENGE);
    geminiService.warmup(Category.QUIZ);
    geminiService.warmup(Category.YOU_RATHER);
    geminiService.warmup(Category.TRUE_FALSE);
    geminiService.warmup(Category.STORYTELLER);
  }, []);

  useEffect(() => {
    if (gameMode === 'CONVERSATION') {
      geminiService.warmup(activeCategory);
    } else if (gameMode === 'CHALLENGE') {
      geminiService.warmup(Category.CHALLENGE);
    } else if (gameMode === 'QUIZ') {
      geminiService.warmup(Category.QUIZ);
    } else if (gameMode === 'YOU_RATHER') {
      geminiService.warmup(Category.YOU_RATHER);
    } else if (gameMode === 'TRUE_FALSE') {
      geminiService.warmup(Category.TRUE_FALSE);
    } else if (gameMode === 'STORYTELLER') {
      geminiService.warmup(Category.STORYTELLER);
    }
  }, [activeCategory, gameMode]);

  const fetchDailyQuote = async () => {
    setIsQuoteLoading(true);
    try {
      const quote = await geminiService.generateDailyQuote();
      setDailyQuote(quote);
    } catch (err) {
      console.error(err);
    } finally {
      setIsQuoteLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('spark_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('spark_history', JSON.stringify(history));
  }, [history]);

  const handleShuffleLocal = useCallback(() => {
    let targetCategory = activeCategory;
    if (gameMode === 'CHALLENGE') targetCategory = Category.CHALLENGE;
    if (gameMode === 'QUIZ') targetCategory = Category.QUIZ;
    if (gameMode === 'YOU_RATHER') targetCategory = Category.YOU_RATHER;
    if (gameMode === 'TRUE_FALSE') targetCategory = Category.TRUE_FALSE;
    if (gameMode === 'STORYTELLER') targetCategory = Category.STORYTELLER;

    const questions = FALLBACK_QUESTIONS[targetCategory] || [];
    
    let randomText = '';
    let attempts = 0;
    const recentTexts = history.slice(0, 25).map(q => q.text);
    
    do {
      randomText = questions[Math.floor(Math.random() * questions.length)];
      attempts++;
    } while (recentTexts.includes(randomText) && attempts < 20);
    
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      text: randomText,
      category: targetCategory,
      isAiGenerated: false,
      timestamp: Date.now(),
    };

    setCurrentQuestion(newQuestion);
    setHistory(prev => [newQuestion, ...prev].slice(0, 100));
  }, [activeCategory, gameMode, history]);

  const handleGenerateAI = useCallback(async () => {
    setIsLoading(true);
    try {
      let targetCategory = activeCategory;
      if (gameMode === 'CHALLENGE') targetCategory = Category.CHALLENGE;
      if (gameMode === 'QUIZ') targetCategory = Category.QUIZ;
      if (gameMode === 'YOU_RATHER') targetCategory = Category.YOU_RATHER;
      if (gameMode === 'TRUE_FALSE') targetCategory = Category.TRUE_FALSE;
      if (gameMode === 'STORYTELLER') targetCategory = Category.STORYTELLER;

      const text = await geminiService.generateQuestion(targetCategory);
      
      const recentTexts = history.slice(0, 30).map(q => q.text);
      if (recentTexts.includes(text)) {
        handleShuffleLocal();
        return;
      }

      const newQuestion: Question = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        category: targetCategory,
        isAiGenerated: true,
        timestamp: Date.now(),
      };
      setCurrentQuestion(newQuestion);
      setHistory(prev => [newQuestion, ...prev].slice(0, 100));
    } catch (error) {
      handleShuffleLocal();
    } finally {
      setIsLoading(false);
    }
  }, [activeCategory, gameMode, history, handleShuffleLocal]);

  const toggleFavorite = (q: Question) => {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === q.id);
      if (exists) return prev.filter(f => f.id !== q.id);
      return [...prev, q];
    });
  };

  const isFavorite = (qId: string) => favorites.some(f => f.id === qId);

  const conversationCategories = Object.values(Category).filter(
    c => c !== Category.CHALLENGE && c !== Category.QUIZ
  );

  // Navigation Logic
  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentViewIndex((prevIndex) => {
      let nextIndex = prevIndex + newDirection;
      if (nextIndex < 0) nextIndex = views.length - 1;
      if (nextIndex >= views.length) nextIndex = 0;
      return nextIndex;
    });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  const currentView = views[currentViewIndex];

  return (
    <div className="min-h-screen pb-24 md:pb-12 text-white selection:bg-[#e91e63]/30 overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4">
        <Header />

        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8 px-2">
          <button 
            onClick={() => paginate(-1)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm border border-white/10"
          >
            <ChevronLeft className="w-6 h-6 text-white/80" />
          </button>
          
          <div className="text-center">
            <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 uppercase tracking-widest drop-shadow-sm">
              {viewLabels[currentView]}
            </h2>
            <div className="flex justify-center gap-1.5 mt-2">
              {views.map((_, idx) => (
                <div 
                  key={idx} 
                  className={`h-1 rounded-full transition-all duration-300 ${idx === currentViewIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/20'}`}
                />
              ))}
            </div>
          </div>

          <button 
            onClick={() => paginate(1)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors backdrop-blur-sm border border-white/10"
          >
            <ChevronRight className="w-6 h-6 text-white/80" />
          </button>
        </div>

        <div className="relative min-h-[600px]">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentViewIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 }
              }}
              className="w-full"
            >
              {currentView === 'generate' && (
                <div className="space-y-6">
                  <RelationshipCounter />
                  <QuoteSection quote={dailyQuote} isLoading={isQuoteLoading} />
                  
                  <div className="mt-8 flex flex-col items-center w-full">
                    {/* Game Mode Selector */}
                    <div className="flex justify-center flex-wrap gap-2 mb-6">
                        {(['CONVERSATION', 'CHALLENGE', 'QUIZ', 'YOU_RATHER', 'TRUE_FALSE', 'STORYTELLER'] as GameMode[]).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setGameMode(mode)}
                                className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${
                                    gameMode === mode 
                                    ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                                    : 'bg-transparent text-white/50 border-white/10 hover:border-white/30 hover:text-white'
                                }`}
                            >
                                {mode === 'CONVERSATION' ? 'Conversation' : mode === 'CHALLENGE' ? 'Défis' : mode === 'QUIZ' ? 'Quiz' : mode === 'YOU_RATHER' ? 'Tu préfères' : mode === 'TRUE_FALSE' ? 'Vrai/Faux' : 'Histoire'}
                            </button>
                        ))}
                    </div>

                    {gameMode === 'CONVERSATION' && (
                      <div className="flex flex-wrap justify-center gap-2 mb-6">
                        {conversationCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                              activeCategory === cat
                                ? 'bg-white/10 text-white border-white/20 shadow-lg backdrop-blur-sm'
                                : 'bg-transparent text-white/30 border-transparent hover:bg-white/5'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}

                    <QuestionCard 
                      question={currentQuestion} 
                      isLoading={isLoading} 
                      isFavorite={currentQuestion ? isFavorite(currentQuestion.id) : false}
                      onFavorite={() => currentQuestion && toggleFavorite(currentQuestion)}
                    />
                    
                    <ActionButtons 
                      onGenerate={handleGenerateAI} 
                      onShuffle={handleShuffleLocal}
                      isLoading={isLoading}
                      gameMode={gameMode}
                    />
                  </div>
                </div>
              )}
              
              {currentView === 'chat' && <ChatInterface />}
              
              {currentView === 'history' && (
                <div className="space-y-4">
                   <h3 className="text-lg font-bold mb-4 px-2">Historique récent</h3>
                   {history.length === 0 ? (
                       <div className="text-center py-12 text-white/30 italic">Aucune question pour le moment</div>
                   ) : (
                       history.map((q) => (
                           <div key={q.id} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                               <div className="flex justify-between items-start gap-4">
                                   <p className="text-sm text-white/90">{q.text}</p>
                                   <button onClick={() => toggleFavorite(q)} className="text-white/40 hover:text-yellow-400 transition-colors">
                                       {isFavorite(q.id) ? '★' : '☆'}
                                   </button>
                               </div>
                               <div className="mt-2 flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider">
                                   <span>{q.category}</span>
                                   <span>•</span>
                                   <span>{new Date(q.timestamp).toLocaleDateString()}</span>
                               </div>
                           </div>
                       ))
                   )}
                </div>
              )}
              
              {currentView === 'favorites' && (
                <div className="space-y-4">
                   <h3 className="text-lg font-bold mb-4 px-2">Vos favoris</h3>
                   {favorites.length === 0 ? (
                       <div className="text-center py-12 text-white/30 italic">Aucun favori enregistré</div>
                   ) : (
                       favorites.map((q) => (
                           <div key={q.id} className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors">
                               <div className="flex justify-between items-start gap-4">
                                   <p className="text-sm text-white/90 font-medium">{q.text}</p>
                                   <button onClick={() => toggleFavorite(q)} className="text-yellow-400 hover:text-white/40 transition-colors">
                                       ★
                                   </button>
                               </div>
                               <div className="mt-2 flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-wider">
                                   <span>{q.category}</span>
                                   <span>•</span>
                                   <span>{new Date(q.timestamp).toLocaleDateString()}</span>
                               </div>
                           </div>
                       ))
                   )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-2xl border-t border-white/5 py-4 text-center px-4 z-50">
        <p className="text-[9px] text-white/20 font-black tracking-[0.4em] uppercase">
          Andrea & Maurice — L'art de se parler
        </p>
      </footer>
    </div>
  );
};

export default App;
