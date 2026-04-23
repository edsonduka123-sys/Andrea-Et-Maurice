
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="text-center mb-10 pt-8 flex flex-col items-center">
      <div className="relative group">
        {/* Lueur subtile derrière le logo */}
        <div className="absolute -inset-4 bg-gradient-to-r from-pink-500/20 to-blue-500/20 rounded-full blur-3xl opacity-50"></div>
        
        <img 
          src="logo.png" 
          alt="Andrea & Maurice" 
          className="relative w-full max-w-[320px] md:max-w-[450px] h-auto drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)] transition-transform duration-700 hover:scale-105"
          onError={(e) => {
            // Si le fichier logo.png n'est pas encore accessible, on affiche un texte élégant temporaire
            (e.target as HTMLImageElement).style.display = 'none';
            const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-text');
            if (fallback) (fallback as HTMLElement).style.display = 'block';
          }}
        />
        
        <div className="fallback-text hidden text-center">
           <h1 className="text-4xl font-serif bg-gradient-to-r from-[#FF69B4] to-[#4169E1] bg-clip-text text-transparent">
             Andrea & Maurice
           </h1>
           <p className="text-[#D4AF37] tracking-[0.3em] uppercase text-[10px] mt-2 font-bold">
             Questions de Couple
           </p>
        </div>
      </div>
      
      <p className="mt-6 text-white/40 max-w-sm mx-auto text-sm italic font-light tracking-wide">
        "Chaque question est une porte ouverte vers l'autre."
      </p>
    </header>
  );
};

export default Header;
