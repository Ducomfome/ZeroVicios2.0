import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export function CountdownBar() {
  const [timeLeft, setTimeLeft] = useState({ m: 14, s: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.s === 0) {
          if (prev.m === 0) return prev;
          return { m: prev.m - 1, s: 59 };
        }
        return { ...prev, s: prev.s - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-bold shadow-md sticky top-0 z-50 flex justify-center items-center gap-2 animate-pulse">
      <Clock className="w-4 h-4" />
      <span>OFERTA RELÂMPAGO: O desconto de lançamento encerra em {String(timeLeft.m).padStart(2, '0')}:{String(timeLeft.s).padStart(2, '0')}</span>
    </div>
  );
}