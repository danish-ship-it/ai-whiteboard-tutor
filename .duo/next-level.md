# Chalk: next level (duo plan, 16 Nov 2026)

Codex SESSION_ID: `01a1e48e-ad5e-7cc3-a92c-2d3769174dfc` (gpt-6-astra, read-only)
Drafts: `.duo/next-level-claude-draft.md`, `.duo/next-level-codex1.json`, critique `.duo/next-level-codex2.json`

Budget about 12 focused hours plus 2 hours kept free for integration. Feature freeze end of 17 Nov; 18 Nov is for verification and submission.

## Final plan

| # | Task | Files | Acceptance test | Owner | Status |
|---|---|---|---|---|---|
| 1 | **Topic pictures.** One `picture` kind for the model (icon name or sketch points in one `draw` string, because the full schema overflowed the API's output grammar); validator splits it into icon/sketch, maps near-miss names, falls back to a labelled circle; 10 hand-drawn subjects (ringed/banded planets, comet, asteroid, cell, molecule, volcano, wave, magnifier); pictures at least 2x2; prompt rule "every scene has a picture of the subject"; one marker draws one stroke at a time and never before its cue; follow-up highlights limited to one scene | claude.ts, schema.ts, validate.ts, layout.ts, timeline.ts, icons.ts, build-icons.mjs, tests | Planets lesson shows sun, orbit sketch, Mercury–Mars, asteroid belt, banded Jupiter, ringed Saturn (verified live). 25 unit tests incl. cue/serial invariant | Claude | done, needs photosynthesis + Pythagoras check |
| 2 | **Checkpoint commit** of the work above so Codex's worktree starts from it | — | `git log` shows it; tests pass | Claude | next |
| 3 | **Q&A continuity.** One conversation shared by desktop panel and mobile sheet; abort stale requests; a late answer doesn't jump the board after the learner moved on | new src/hooks/useLessonQuestions.ts, Questions.tsx, PlayerView.tsx | Ask on desktop, resize to phone: answer and draft still there. Switch lesson mid-request: no stray answer | Claude | |
| 4 | **Instant demo lessons.** 2–3 reviewed lessons (lesson JSON + MP3 + alignment) in `public/demos/`; a `/api/demo` route signs the bundled lesson at request time so Q&A works without expiry; shown first on Home | scripts/make-demo.mjs, public/demos/*, src/app/api/demo/route.ts, HomeView.tsx, useLessonSession.ts | Demo plays in under 1 s with no Claude/ElevenLabs call; Q&A works on it | Claude | |
| 5 | **History store module.** IndexedDB, versioned records {id, topic, lesson, token+expiry, audio Blob, alignment, duration, createdAt}; list/get/delete/clear; cap 10 lessons or 30 MB; storage unavailable or quota error never breaks the current lesson | new src/lib/storage/history.ts + tests, fake-indexeddb devDependency (package.json, lockfile) | Unit tests: Blob round-trip, eviction order, unavailable storage, old version ignored | **Codex** (worktree) | |
| 6 | **Request and token hardening.** Byte-bounded body reads (no trusting Content-Length); strict token structure and finite issue time; 429 with Retry-After tested; basic security headers (no strict CSP) | http.ts, lesson-token.ts, next.config.ts, src/lib/__tests__/server/*.ts | Tampered/expired/extra-segment tokens rejected; oversized chunked body rejected; headers present in `next build` output | **Codex** (worktree) | |
| 7 | **History integration.** Save after narration; "Saved on this device" list on Home; replay with zero API calls; delete one / clear all; expired Q&A token explained | useLessonSession.ts, HomeView.tsx, page.tsx, PlayerView.tsx | Reload the page, open a saved lesson, it plays with no network calls; delete works | Claude | after 5 |
| 8 | **Liquid-glass chrome + learner controls.** Translucent blurred header, transport and panel shells with highlight border and soft shadow; board and reading surfaces stay opaque; opaque fallback for `prefers-reduced-transparency`, `prefers-contrast: more` and no backdrop-filter. Add 0.75×, captions on/off (remembered), audience selector (Kids / Teens / Adults → prompt) | globals.css, AppHeader.tsx, Transport.tsx, Button.tsx, Recall.tsx, GeneratingView.tsx, HomeView.tsx, claude.ts, api/lesson/route.ts | 320/390/768/1280/1440 px, light/dark, keyboard only, contrast ≥ 4.5:1 on glass; same topic differs by audience | Claude | |
| 9 | **Deadlines and error paths.** Total-operation deadline that includes retries (lesson 110 s, ask 55 s); outline preview while narration records; per-stage timings logged | claude.ts, api/ask/route.ts, GeneratingView.tsx | Mocked timeout returns a JSON error before the platform limit | Claude | |
| 10 | **Quiz timing** (per decision below) | PlayerView.tsx | Pausing mid-lesson after an answer doesn't bring the quiz back | Claude | |
| 11 | **CI and browser test.** GitHub Actions: typecheck, lint, test, build. Playwright: demo playback, mocked generation success/failure/cancel | .github/workflows/ci.yml, playwright.config.ts, e2e/*, package.json (after 5 is merged) | CI green on push; e2e passes locally | **Codex** (worktree) | after 7 |
| 12 | **Docs, verify, deploy.** README: demo walkthrough, rubric map, screenshots, measured timings, history/sharing, icon attribution, honest limits; research implementation status; full check on phone + desktop; commit, push, deploy | README.md, research/*.md | Live site passes the acceptance flow below | Claude | |

Cut order if late: audience selector → quiz timing → share → task 9 preview.

Acceptance flow: open a demo instantly → generate "planets" → see recognisable planets → pause, seek, 0.75× → ask a question that highlights the right scene → finish recall → reload and replay from history → (share link if approved).

## Disagreements

| Point | Claude's view | Codex's view | Recommendation |
|---|---|---|---|
| Drawing schedule | One marker, one stroke at a time | First: let independent strokes overlap at their cues. After critique: serial is fine if strokes never start before their cue | **Serial, never before cue, squeeze near scene end.** Built and tested |
| Quiz mid-lesson | It's a bug: quiz should appear only at the end | Product decision; current behaviour is deliberate | **Show only at the end, plus while reviewing a scene from "See it on the board".** Your call |
| Sharing | Real share links via Vercel Blob (needs you to create a store) | Export/import a `.chalk` file first; links are 2–3 h more | **Share links if you create a Blob store (5 min in Vercel); otherwise file export** |
| Demo lessons | 3 demos, 2 h | 1 verified demo first; static tokens expire after 12 h | **2–3 demos, signed by a server route at load time** so Q&A never expires |
| Step-end check questions | Build them | Defer: needs a state machine for seek/jump cases; end recall already covers retrieval | **Defer** (Codex) |
| Glass scope | Header, transport, panels, sheet, buttons, menus | Shells only; stacked translucency hurts contrast | **Shells only** (Codex) |
| Faster generation | Compare Sonnet 5.5 vs Opus 5.5, prompt caching | Little gain; show outline while narration runs instead | **Outline preview now; model timing test only if time is left** |
| Security focus | Headers + topic checks | Real gaps first: unbounded body read, loose token parsing; charset limits hurt multilingual topics | **Codex's fixes plus basic headers; no charset limit** |

## Needs the owner

- Share links: create a Vercel Blob store (Vercel → Storage → Blob → connect to the project).
- Global rate limits: Upstash Redis from the Vercel Marketplace (Vercel → Storage → Upstash → connect); it adds the env vars itself.
- AI images: ElevenLabs answered "This endpoint requires a Pro plan or above" (402). The Creator plan's credits can't be used through the API. Options: upgrade to Pro, or pre-make illustrations for the demo lessons only, using your credits through the ElevenLabs connector.
