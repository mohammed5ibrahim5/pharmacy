import { useState, useEffect } from 'react';

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function useCountdown(target: Date | null): Countdown | null {
  const [remaining, setRemaining] = useState<number>(() => compute(target));

  useEffect(() => {
    if (!target) {
      setRemaining(0);
      return;
    }
    setRemaining(compute(target));
    const interval = setInterval(() => {
      setRemaining(compute(target));
    }, 1000);
    return () => clearInterval(interval);
  }, [target]);

  if (!target || remaining <= 0) return null;

  return {
    days: Math.floor(remaining / 86400000),
    hours: Math.floor((remaining % 86400000) / 3600000),
    minutes: Math.floor((remaining % 3600000) / 60000),
    seconds: Math.floor((remaining % 60000) / 1000),
  };
}

function compute(target: Date | null): number {
  if (!target) return 0;
  return Math.max(0, target.getTime() - Date.now());
}
