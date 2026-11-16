# Claude's draft: Chalk next level (1.5 days)

Ordered by judge impact per hour.

1. **Topic pictures on the board** (whiteboard 20, AI 15). Prompt teaches `icon` (pick from ICON_NAMES for real objects) and `sketch` (0–100 points for orbits, triangles, waves, graphs, curves). Rule: every scene has at least one picture tied to the topic. Validator warns when a scene has no picture. One-marker stroke timing (done). Files: claude.ts, validate.ts, fixtures + tests. 3 h.
2. **Instant demo lessons** (end-to-end 25). Three curated lessons (planets, photosynthesis, Pythagoras) stored as JSON + MP3 + alignment in `public/demos/`, shown first on Home. They play instantly with zero API calls, so judges see the best output even if keys or quota fail. Script `scripts/make-demo.mjs` generates them via the real pipeline. 2 h.
3. **Lesson history in the browser** (UX, storage). IndexedDB store of {topic, lesson, token, alignment, audio blob, createdAt, recall score}. "Recent lessons" on Home; replay without new API calls; delete one / clear all. No server DB needed. Files: new src/lib/storage/history.ts (+ tests with fake-indexeddb), useLessonSession, HomeView. 3 h.
4. **Liquid-glass chrome** (UI/UX 10). Tokens for glass surfaces (translucent fill, backdrop-filter blur + saturate, inner highlight border, soft shadow), applied to header, transport, side panels, mobile sheet, buttons, menus; smooth springy transitions. Board stays solid paper. Fallbacks: `prefers-reduced-transparency` and `prefers-contrast: more` → opaque; no blur when unsupported. Contrast checked ≥ 4.5:1. Files: globals.css, AppHeader, Transport, Questions, Recall, Button, PlayerView. 3 h.
5. **Research items** (UX, learning). 0.75× speed; captions on/off; audience selector on Home (Kids 8–12 / Teens / Adults) passed to the prompt; quiz only at end (bug fix); optional "check yourself" pause at scene ends using the recall question for that scene. Files: Transport, HomeView, PlayerView, claude.ts, /api/lesson. 3 h.
6. **Faster first play** (end-to-end, perf). Measure Sonnet 5.5 vs Opus 5.5 at effort low on 5 topics (quality + time); prompt caching on the system prompt; start narration request as soon as the lesson arrives (already sequential); show the first scene's board drawing preview while narration records. 2 h. Streaming per-scene TTS deferred (too risky for the deadline).
7. **Security hardening**. Security headers (CSP, frame-ancestors, referrer, permissions) in next.config; topic treated as data in the prompt (injection guard) with a server-side length/charset check; keep HMAC tokens; note the in-memory limiter in README. 1.5 h.
8. **Tests and CI**. Unit tests for icon/sketch layout, stroke serialisation (no two drawn actions overlap in a scene), history store. Playwright smoke test that plays a demo lesson (no keys needed). GitHub Actions: typecheck, lint, test, build. 2 h.
9. **Docs**. README: screenshots/GIF, architecture diagram, demo lessons, history, accessibility, decisions and trade-offs, eval results from step 6. 1 h.

Deferred / needs owner: share links (need Vercel Blob or KV, which the owner must create); AI images (ElevenLabs Pro); global rate limits (Upstash).

Owners: Codex → 3 (storage module + tests only), 7, 8. Claude → 1, 2, 4, 5, 6, 9 and all PlayerView/HomeView edits.
