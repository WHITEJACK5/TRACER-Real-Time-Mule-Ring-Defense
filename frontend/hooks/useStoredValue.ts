"use client";

import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();
let storageListenerAttached = false;

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (!storageListenerAttached && typeof window !== "undefined") {
    window.addEventListener("storage", emit);
    storageListenerAttached = true;
  }
  return () => {
    listeners.delete(listener);
  };
}

const subscribeHydration = () => () => {};

/** Write (or remove, when `value` is `null`) a localStorage entry and notify same-tab subscribers. */
export function writeStoredValue(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (e.g. blocked) — degrade to in-memory only */
  }
  emit();
}

/** Read a localStorage entry as an external store; SSR/prerender renders `fallback`. */
export function useStoredValue(key: string, fallback: string): string {
  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** `false` during SSR and the hydration render, `true` right after hydration. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribeHydration, () => true, () => false);
}
