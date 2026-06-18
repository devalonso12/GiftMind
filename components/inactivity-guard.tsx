'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useGiftFlow } from '../lib/store';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const WARNING_BEFORE = 30 * 1000; // 30 second warning

export function InactivityGuard({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { senderWallet, disconnectWallet } = useGiftFlow();

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);

    if (!senderWallet?.connected) return;

    warningTimerRef.current = setTimeout(() => {
      // Could show a toast here if desired
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

    timerRef.current = setTimeout(() => {
      disconnectWallet();
    }, INACTIVITY_TIMEOUT);
  }, [senderWallet?.connected, disconnectWallet]);

  useEffect(() => {
    if (!senderWallet?.connected) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      return;
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click', 'wheel'];

    const handler = () => resetTimer();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [senderWallet?.connected, resetTimer]);

  return <>{children}</>;
}
