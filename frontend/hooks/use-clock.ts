"use client";

import { useSyncExternalStore } from "react";

let currentSecond = typeof window !== "undefined" ? Math.floor(Date.now() / 1000) : 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function startTimer() {
  if (timer === null && typeof window !== "undefined") {
    currentSecond = Math.floor(Date.now() / 1000);
    timer = setInterval(() => {
      const next = Math.floor(Date.now() / 1000);
      if (next !== currentSecond) {
        currentSecond = next;
        listeners.forEach((listener) => {
          try {
            listener();
          } catch {
            // ignore
          }
        });
      }
    }, 1000);
  }
}

function stopTimer() {
  if (listeners.size === 0 && timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  startTimer();
  return () => {
    listeners.delete(callback);
    stopTimer();
  };
}

function getSnapshot() {
  return currentSecond;
}

function getServerSnapshot() {
  return 0;
}

/**
 * Returns the current Unix timestamp in seconds, updating strictly once per second.
 * Returns the exact same stable primitive across calls in the same second,
 * completely preventing React infinite re-render loops.
 */
export function useSecondClock(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * Returns current timestamp in milliseconds (rounded to second)
 */
export function useCurrentTimestampMs(): number {
  const sec = useSecondClock();
  return sec * 1000;
}
