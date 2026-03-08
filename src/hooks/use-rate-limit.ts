import { useState, useCallback, useRef } from "react";

const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 30_000; // 30 seconds

export function useRateLimit() {
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const attemptsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const isLocked = cooldownSeconds > 0;

  const recordAttempt = useCallback(() => {
    attemptsRef.current += 1;
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      attemptsRef.current = 0;
      setCooldownSeconds(Math.ceil(COOLDOWN_MS / 1000));
      timerRef.current = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, []);

  const resetAttempts = useCallback(() => {
    attemptsRef.current = 0;
  }, []);

  return { isLocked, cooldownSeconds, recordAttempt, resetAttempts };
}
