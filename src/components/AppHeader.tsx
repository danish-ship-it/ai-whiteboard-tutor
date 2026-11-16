"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { IconButton } from "./ui/Button";
import { BrandMark, CloseIcon, KeyboardIcon, MoonIcon, SunIcon } from "./ui/icons";

const SHORTCUTS: Array<[string[], string]> = [
  [["Space"], "Play / pause"],
  [["←", "→"], "Back / forward one sentence"],
  [["R"], "Restart lesson"],
  [["Esc"], "Close an open panel"],
];

function subscribeTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

export function AppHeader({ onHome }: { onHome: () => void }) {
  const dark = useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );
  const [helpOpen, setHelpOpen] = useState(false);
  const helpButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!helpOpen) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelpOpen(false);
        helpButton.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [helpOpen]);

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try {
      localStorage.setItem("chalk-theme", next ? "dark" : "light");
    } catch {
      // Storage can be unavailable (private mode); the theme still applies for this visit.
    }
  };

  return (
    <header className="glass-strong sticky top-0 z-20 border-0 border-b">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-4 md:h-16 md:px-8">
        <button type="button" onClick={onHome} className="flex h-11 items-center gap-2 rounded-lg pr-2" aria-label="Chalk, start a new lesson">
          <BrandMark />
          <span className="font-serif text-[30px] leading-8 font-medium tracking-[-0.025em]">Chalk</span>
        </button>
        <div className="relative flex items-center gap-1">
          <IconButton label={dark ? "Use light theme" : "Use dark theme"} onClick={toggleTheme}>
            {dark ? <SunIcon /> : <MoonIcon />}
          </IconButton>
          <IconButton ref={helpButton} label="Keyboard shortcuts" aria-expanded={helpOpen} onClick={() => setHelpOpen((o) => !o)}>
            <KeyboardIcon />
          </IconButton>
          {helpOpen && (
            <div role="dialog" aria-label="Keyboard shortcuts" className="glass-strong absolute top-12 right-0 z-40 w-[312px] rounded-2xl p-4">
              <div className="flex items-start justify-between">
                <h2 className="text-base leading-6 font-semibold">Keyboard shortcuts</h2>
                <IconButton
                  ref={closeButton}
                  label="Close shortcuts"
                  className="-mt-2 -mr-2"
                  onClick={() => {
                    setHelpOpen(false);
                    helpButton.current?.focus();
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </div>
              <dl className="mt-3 space-y-1">
                {SHORTCUTS.map(([keys, label]) => (
                  <div key={label} className="flex h-8 items-center justify-between text-sm">
                    <dt className="flex gap-1">
                      {keys.map((k) => (
                        <kbd key={k} className="min-w-7 rounded border border-control px-1.5 py-0.5 text-center font-mono text-xs">
                          {k}
                        </kbd>
                      ))}
                    </dt>
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-sm text-muted">Playback shortcuts work when the player is focused.</p>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
