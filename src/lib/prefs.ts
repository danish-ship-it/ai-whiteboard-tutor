"use client";

/** Small persisted viewer preferences, readable with useSyncExternalStore. */
const KEY = "chalk:captions";
const listeners = new Set<() => void>();

export function subscribeCaptions(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function captionsOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setCaptions(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the choice still applies until the page reloads.
  }
  memory = on;
  listeners.forEach((l) => l());
}

let memory: boolean | null = null;
export const captionsSnapshot = () => memory ?? captionsOn();
