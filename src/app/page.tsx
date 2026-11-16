"use client";

import { useSyncExternalStore } from "react";
import { AppHeader } from "@/components/AppHeader";
import { GenerationFailed, GeneratingView } from "@/components/GeneratingView";
import { HomeView } from "@/components/HomeView";
import { PlayerView } from "@/components/player/PlayerView";
import { useLessonSession } from "@/hooks/useLessonSession";

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export default function Page() {
  const { state, generate, openDemo, openSaved, cancel, goHome, continueWithCaptions } = useLessonSession();
  const offline = !useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );

  return (
    <div className="flex min-h-dvh flex-col text-fg">
      <AppHeader onHome={() => goHome(state.phase === "lesson" ? "" : "topic" in state ? state.topic : "")} />
      {offline && (
        <p role="status" className="border-b border-warning bg-warning-bg px-4 py-2 text-center text-sm text-warning">
          You&rsquo;re offline. Lessons and questions need a connection.
        </p>
      )}
      {state.phase === "home" && <HomeView initialTopic={state.topic} offline={offline} onSubmit={generate} onOpenDemo={openDemo} onOpenSaved={openSaved} />}
      {state.phase === "generating" && <GeneratingView topic={state.topic} stage={state.stage} slow={state.slow} outline={state.outline} offline={offline} onCancel={cancel} />}
      {state.phase === "failed" && (
        <GenerationFailed topic={state.topic} message={state.message} onRetry={() => generate(state.topic, state.audience)} onChangeTopic={() => goHome(state.topic)} />
      )}
      {state.phase === "lesson" && (
        <PlayerView key={state.data.token} data={state.data} offline={offline} onNewTopic={() => goHome()} onContinueWithCaptions={continueWithCaptions} />
      )}
    </div>
  );
}
