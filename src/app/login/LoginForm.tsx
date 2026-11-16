"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/icons";
import { DEMO_ACCOUNTS, type DemoAccount } from "@/lib/supabase/config";
import { supabaseBrowser } from "@/lib/supabase/browser";

export function LoginForm() {
  /** A full page load, so the server sees the new session and no earlier screen state survives. */
  const goHome = () => window.location.replace("/");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = supabaseBrowser();
    if (!db) return;
    setBusy("form");
    setError("");
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError("That email and password don't match an account.");
      setBusy(null);
      return;
    }
    goHome();
  };

  const demo = async (account: DemoAccount) => {
    setBusy(account);
    setError("");
    const response = await fetch("/api/auth/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account }),
    }).catch(() => null);
    if (response?.ok) return goHome();
    const body = await response?.json().catch(() => null);
    setError(body?.error ?? "Couldn't reach the server. Check your connection and try again.");
    setBusy(null);
  };

  return (
    <div className="glass-strong w-full max-w-[420px] rounded-2xl p-6 md:p-8">
      <div className="flex items-center gap-2">
        <BrandMark />
        <span className="font-serif text-[30px] leading-8 font-medium tracking-[-0.025em]">Chalk</span>
      </div>
      <h1 className="mt-6 font-serif text-2xl leading-8">Sign in to your school</h1>
      <p className="mt-1 text-sm text-muted">Each school sees only its own lessons.</p>

      <section aria-labelledby="demo-heading" className="mt-6">
        <h2 id="demo-heading" className="text-sm font-semibold">
          Try a demo school
        </h2>
        <div className="mt-2 grid gap-2">
          {(Object.keys(DEMO_ACCOUNTS) as DemoAccount[]).map((key) => {
            const a = DEMO_ACCOUNTS[key];
            return (
              <button
                key={key}
                type="button"
                disabled={busy !== null}
                onClick={() => demo(key)}
                className="flex items-center justify-between gap-3 rounded-lg border border-control bg-surface px-4 py-3 text-left text-sm font-semibold transition-colors duration-[120ms] ease-ui hover:bg-raised disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>
                  <span className="block">{a.label}</span>
                  <span className="block text-xs font-normal text-muted">Sign in as {a.role.toLowerCase()}</span>
                </span>
                <span className="text-xs font-normal text-muted">{busy === key ? "Signing in…" : "Enter →"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden>
        <span className="flex-1 border-t border-control opacity-50" />
        or with email
        <span className="flex-1 border-t border-control opacity-50" />
      </div>

      <form onSubmit={signIn} className="grid gap-3">
        <label className="grid gap-1 text-sm font-medium">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-lg border border-control bg-surface px-3 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border border-control bg-surface px-3 font-normal"
          />
        </label>
        <Button type="submit" disabled={busy !== null} className="mt-1">
          {busy === "form" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p role="alert" aria-live="polite" className="mt-3 min-h-5 text-sm text-danger">
        {error}
      </p>
    </div>
  );
}
