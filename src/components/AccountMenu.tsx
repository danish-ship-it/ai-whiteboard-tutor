"use client";

import { useEffect, useState } from "react";
import { currentTenant, resetTenant } from "@/lib/storage/cloud-history";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Button } from "./ui/Button";

/** The signed-in school's name and a sign-out button. Renders nothing when sign-in is off. */
export function AccountMenu() {
  const [tenant, setTenant] = useState<string | null>(null);
  const db = supabaseBrowser();

  useEffect(() => {
    if (!db) return;
    let live = true;
    currentTenant().then((t) => live && setTenant(t?.name ?? null));
    return () => {
      live = false;
    };
  }, [db]);

  if (!db) return null;

  const signOut = async () => {
    await db.auth.signOut();
    resetTenant();
    // A full page load drops everything the last school had loaded in memory.
    window.location.replace("/login");
  };

  return (
    <div className="flex items-center gap-1">
      {tenant && <span className="hidden max-w-48 truncate px-2 text-sm text-muted sm:inline" title={`Signed in to ${tenant}`}>{tenant}</span>}
      <Button variant="ghost" className="px-3" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
