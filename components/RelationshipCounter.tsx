
import React, { useState, useEffect } from 'react';

const RelationshipCounter: React.FC = () => {
  const [duration, setDuration] = useState({ months: 0, days: 0 });
  const startDate = new Date('2025-04-26T00:00:00');

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      if (now < startDate) {
        setDuration({ months: 0, days: 0 });
        return;
      }

      let years = now.getFullYear() - startDate.getFullYear();
      let months = now.getMonth() - startDate.getMonth();
      let days = now.getDate() - startDate.getDate();

      if (days < 0) {
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
        days += lastDayOfMonth;
        months--;
      }

      if (months < 0) {
        months += 12;
        years--;
      }

      const totalMonths = (years * 12) + months;
      setDuration({ months: totalMonths, days });
    };

    calculateTime();
    // Mise à jour toutes les heures pour la précision
    const timer = setInterval(calculateTime, 3600000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto mb-8 animate-in fade-in zoom-in duration-1000">
      <div className="glass rounded-2xl py-3 px-6 flex items-center justify-center gap-4 border-white/10 shadow-[0_0_20px_rgba(212,175,55,0.1)] animate-float">
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D4AF37] mb-1">
            Ensemble depuis le 26.04.25
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-serif italic text-white">
              {duration.months} <span className="text-xs font-sans not-italic text-white/40 uppercase tracking-tighter">mois</span>
            </span>
            <span className="text-[#D4AF37] opacity-40 text-sm">∞</span>
            <span className="text-xl font-serif italic text-white">
              {duration.days} <span className="text-xs font-sans not-italic text-white/40 uppercase tracking-tighter">jours</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipCounter;
