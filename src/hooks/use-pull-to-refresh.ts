import { useState, useRef, useCallback, useEffect } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 80, maxPull = 120 }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredHaptic = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
      hasTriggeredHaptic.current = false;
    }
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!pulling.current || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    if (diff > 0) {
      const distance = Math.min(diff * 0.5, maxPull);
      setPullDistance(distance);
      // Haptic when crossing threshold
      if (distance >= threshold && !hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = true;
        triggerHaptic();
      } else if (distance < threshold && hasTriggeredHaptic.current) {
        hasTriggeredHaptic.current = false;
      }
    } else {
      pulling.current = false;
      setPullDistance(0);
    }
  }, [isRefreshing, maxPull, threshold, triggerHaptic]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) return;
    pulling.current = false;
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold * 0.6);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    const el = containerRef.current || document;
    el.addEventListener("touchstart", handleTouchStart as any, { passive: true });
    el.addEventListener("touchmove", handleTouchMove as any, { passive: true });
    el.addEventListener("touchend", handleTouchEnd as any, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart as any);
      el.removeEventListener("touchmove", handleTouchMove as any);
      el.removeEventListener("touchend", handleTouchEnd as any);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing, containerRef };
}
