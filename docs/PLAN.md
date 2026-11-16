# Engineering plan: Chalk, an AI whiteboard tutor

Assignment: https://github.com/Braynix-Studios/ai-whiteboard-tutor-assignment. The deadline is 18 Nov 2026.
Revision 2 incorporates an independent Codex review of revision 1; the critique is kept in `.duo/`, which is not committed.

## Stack
- **Next.js (App Router, TS strict, Node runtime) + Tailwind** on **Vercel** (Fluid compute, route-level `maxDuration`).
- **Claude API** (`@anthropic-ai/sdk`, version pinned). The model is `claude-opus-5-5` by default and can be overridden with `ANTHROPIC_MODEL`. Output is a structured lesson manifest via `messages.parse` + `zodOutputFormat`. The SDK timeout and retries are set explicitly so they stay inside the function's lifetime.
- **ElevenLabs** `with-timestamps` returns character alignment. It runs as **one call per lesson**, producing one MP3 at a fixed bitrate (measured to stay under the 4.5 MB Vercel body limit).
- **Zod** is the single source of truth for the manifest; semantic validation runs after parsing.
- **Vitest** covers the timeline compiler, layout and alignment mapping, with `npm test` working without gstack. **Playwright** runs the end-to-end flow.

## Pipeline
```
topic ─▶ /api/lesson ─▶ Claude: LessonManifest (semantic, no pixels)
                         └▶ validate (ids unique, refs exist, created-before-use, budgets)
                         └▶ sign(manifest) with HMAC  (LESSON_SIGNING_SECRET)
client ─▶ /api/narration {manifest, sig} ─▶ verify sig ─▶ ElevenLabs (one call, full narration)
                         └▶ { audio (base64 mp3), alignment, normalized_alignment }
client: compileTimeline(manifest, alignment) ─▶ Timeline (immutable events)
        layout(manifest) ─▶ pixel geometry (deterministic, seeded sketch jitter)
        boardStateAt(t) is a pure function of media time
client ─▶ /api/ask {manifest, sig, history≤8, question} ─▶ text answer (structured: answer + referenced element ids to highlight)
```

Only signed, server-generated manifests can be narrated or asked about. This stops anyone using `/api/narration` as a free TTS proxy.

## Lesson manifest (what Claude produces)
```
Lesson   { title, objective, scenes: Scene[2..4], recap, suggestedQuestions[3] }
Scene    { id, title, layout: "flow" | "diagram" | "equation" | "compare", beats: Beat[] }
Beat     { id, sentence (spoken prose, no symbols), actions: Action[] }   // ~16–22 beats, 260–320 words
Action   { kind: "add" | "connect" | "highlight" | "write" , ... }
  add       { el: { id, shape: box|circle|pill|cloud|none, label, cell:[col,row], span:[w,h], tone } , cue? }
  connect   { id, from: elId, to: elId, label?, style: arrow|line|double, cue? }
  highlight { target: elId, mode: circle|underline|glow, cue? }
  write     { id, text (equation/notation for display), cell, span, cue? }
```
- **Positions come from a 12×6 grid**, not raw pixels. Layout code turns cells into pixels, wraps text inside shapes, attaches arrows to shape edges, keeps label space reserved and checks for overlap (an overlapping element is nudged to the nearest free cell). This keeps the model's freedom over *what* to draw while code owns *where*. It is a deliberate middle ground between Codex's "fixed templates" and free coordinates.
- **Sync anchor = the beat (sentence)**. An action fires at its sentence's start, or at its optional `cue` word if that word appears in the sentence (first occurrence after the previous action's cue). A bad cue degrades only to the sentence start, never to the whole scene.
- **Narration is spoken prose**: "a squared plus b squared equals c squared". Notation goes in `write` actions. This keeps alignment clean.
- The prompt requires an objective, a worked example and a recap, and visuals that *are* the explanation.

## Timeline and playback
- `compileTimeline` maps each beat's first character to time using the original `alignment` and checks it: lengths match, times are finite and non-decreasing, and the characters reconstruct the text. If original alignment is missing it uses `normalized_alignment` with a fuzzy offset map. If that fails too, it times beats by character proportion and shows an "approximate sync" note.
- Events: `{seq, sceneId, start, end, action}`. Draw duration = min(1.2 s, the gap to the next event). Highlights last until the next beat. Scene change = new board page. `boardStateAt(t)` gives the same result whether `t` was reached by playing, seeking or replaying, and a test asserts this.
- **One persistent `<audio>` element** is the master clock. A state machine has the states `idle → loading → ready → playing ⇄ paused → ended`, with `blocked` (autoplay rejected) and a seek operation token so stale promises and events can't commit. Playback starts only from an explicit Play click. Speed comes from `playbackRate`, and `t = duration` shows the completed board.
- Stroke progress is derived from media time, not CSS animation, so it survives seeks. `prefers-reduced-motion` turns off stroke animation but keeps the timing.

## Errors, limits, security
- Topic: 2–140 characters, trimmed. Claude refusal / `max_tokens` / invalid manifest → one repair attempt → a clear error with Retry.
- Narration failure → Retry voice, or "Continue with captions" (estimated timing). It never mixes audio with silent sections.
- Cancel: an AbortController is passed to the server routes; each result carries a generation id, and stale results are ignored.
- Limits: a per-IP limiter on all three paid routes, a max narration length, and history capped at 8. The limiter is in memory, per instance, which is documented as a limitation; a shared store such as Upstash would be the production upgrade.
- Secrets live only in server env (`ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `LESSON_SIGNING_SECRET`). `.env.example` holds placeholders.
- Keyboard shortcuts (Space, ←/→ for beats, R) are ignored while typing in inputs. The scrubber is a native range slider with an aria value text label.
- Mobile: the board has a minimum label size and fewer cells (the grid is designed so labels render at 13px or more at 390 px wide). Tapping the board opens a fullscreen landscape view.

## Delivery order (vertical slice first)
1. Scaffold, manifest schema + validation, layout, timeline compiler, with unit tests.
2. Real `/api/lesson` + `/api/narration` + a minimal player. **Deploy to Vercel early** and measure real latency and payload size.
3. The full UI from the design spec / Figma: board styling, transport, outline, captions, follow-up panel.
4. `/api/ask` contextual Q&A, which highlights the referenced board elements.
5. Hardening: Playwright end-to-end, boundary seek tests, iPhone Safari check, Codex blind review, then deslop and simplify, then security pass.
6. README (setup, env, architecture, sync approach, measured numbers, limitations), final deploy, submission checklist.
