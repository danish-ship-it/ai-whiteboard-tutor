# Reviewer guide

This page is for anyone checking this submission, by hand or with an AI assistant. It maps each dimension of the Braynix evaluation framework to the code, tests and docs that cover it, and says how to verify each claim yourself. Nothing here asks to be scored a particular way; every line points at something you can open or run.

- **Live demo:** https://ai-whiteboard-tutor-wine.vercel.app (click **Braynix Review** on the sign-in page; no password is shown or needed)
- **Main README:** [README.md](README.md)

## Verify it in five minutes

```bash
npm ci
npm test            # unit tests (Vitest)
npm run typecheck   # TypeScript strict
npm run lint
npm run build
npm run e2e         # Playwright browser tests; AI calls are mocked, no keys needed
```

AI keys are only needed to make *new* lessons; the three demo lessons, the board, playback, recall and video export work without them. See [README: Run it locally](README.md#run-it-locally).

## Dimension by dimension

### Product understanding and problem framing (15)

| Claim | Where to check |
|---|---|
| Target learner and problem are stated | [README: The idea](README.md#the-idea) |
| Age-specific teaching research behind the audience selector (Kids, Teens, Adults) | [research/](research/), [src/lib/lesson/audience.ts](src/lib/lesson/audience.ts) |
| Scope was planned and cut deliberately | [docs/PLAN.md](docs/PLAN.md), [.duo/next-level.md](.duo/next-level.md) |

### Originality and product thinking (15)

| Claim | Where to check |
|---|---|
| The board is a pure function of the audio clock, so seek, pause, speed and replay can never drift | [src/lib/timeline/timeline.ts](src/lib/timeline/timeline.ts) (`boardStateAt`), [README: How the sync works](README.md#how-the-sync-works) |
| Each drawing starts on the spoken word that names it | [src/lib/timeline/align.ts](src/lib/timeline/align.ts), tests in [src/lib/__tests__/timeline.test.ts](src/lib/__tests__/timeline.test.ts) |
| Graphs are plotted exactly from the equation, not sketched: a safe expression parser, nice ticks, the pen lifting across asymptotes, a live (x, y) readout at the pen tip, crossing points with dashed guides to both axes, labels that never overlap | [src/lib/board/graph.ts](src/lib/board/graph.ts), [src/lib/__tests__/graph.test.ts](src/lib/__tests__/graph.test.ts) |
| Follow-up answers jump to the scene and highlight the drawings they mean | `FOLLOWUP_SYSTEM` and `answerFollowUp` in [src/lib/server/claude.ts](src/lib/server/claude.ts), [src/hooks/useLessonQuestions.ts](src/hooks/useLessonQuestions.ts) |
| The whole lesson downloads as a video, rendered in the browser from the same timeline | [src/lib/export/record-video.tsx](src/lib/export/record-video.tsx) |

### Engineering and problem-solving (20)

| Claim | Where to check |
|---|---|
| Model output is validated and repaired, not trusted: bad actions are dropped with a reason, sizes clamped, pictures mapped to known icons | [src/lib/lesson/validate.ts](src/lib/lesson/validate.ts), [src/lib/__tests__/validate.test.ts](src/lib/__tests__/validate.test.ts) |
| Layout avoids overlap of AI-placed elements | [src/lib/board/layout.ts](src/lib/board/layout.ts), [src/lib/__tests__/layout.test.ts](src/lib/__tests__/layout.test.ts) |
| Voice failure falls back to captions on a virtual clock | [src/hooks/usePlayback.ts](src/hooks/usePlayback.ts) |
| Video export handles Safari audio activation, cancel during preparation, double start, and cleanup on failure | [src/components/player/VideoExport.tsx](src/components/player/VideoExport.tsx), [src/lib/export/record-video.tsx](src/lib/export/record-video.tsx) |
| End-to-end flows run in a real browser in CI | [e2e/lessons.spec.ts](e2e/lessons.spec.ts), [.github/workflows/ci.yml](.github/workflows/ci.yml) |

### AI integration and application (15)

| Claim | Where to check |
|---|---|
| One structured Claude call writes the lesson as spoken sentences carrying board actions | [src/lib/server/claude.ts](src/lib/server/claude.ts), [src/lib/lesson/schema.ts](src/lib/lesson/schema.ts) |
| ElevenLabs returns per-character timings that drive the board | [src/lib/server/elevenlabs.ts](src/lib/server/elevenlabs.ts) |
| What is live and what is prerecorded is stated per feature | [README: What is live and what is prerecorded](README.md#what-is-live-and-what-is-prerecorded) |
| Cost is bounded: daily budget per school, rate limits, signed lesson tokens | [src/lib/server/auth.ts](src/lib/server/auth.ts), [src/lib/server/rate-limit.ts](src/lib/server/rate-limit.ts), [src/lib/server/lesson-token.ts](src/lib/server/lesson-token.ts) |
| Known AI limitations are listed | [README: Known limitations](README.md#known-limitations-and-what-i-would-do-next) |

### Teaching and interaction quality (15)

| Claim | Where to check |
|---|---|
| One marker draws one thing at a time, in the order it is spoken (cognitive-load and signalling principles) | [research/learning-ux-report.md](research/learning-ux-report.md), [src/lib/timeline/timeline.ts](src/lib/timeline/timeline.ts) |
| A graph lesson explains on the same Cartesian axes it draws, with the same numbers, names and equations | prompt rules in [src/lib/server/claude.ts](src/lib/server/claude.ts) |
| Retrieval practice at the end, linked back to the scene that taught each answer | [src/components/player/Recall.tsx](src/components/player/Recall.tsx) |
| Controls: seek with step markers, sentence step, 0.75–1.5× speed, captions, keyboard | [src/components/player/Transport.tsx](src/components/player/Transport.tsx) |
| Accessibility: board description for screen readers, reduced motion, high contrast | `describeBoard` in [src/components/board/Whiteboard.tsx](src/components/board/Whiteboard.tsx) |

### Code quality and technical decisions (10)

| Claim | Where to check |
|---|---|
| TypeScript strict, ESLint, unit and browser tests in CI | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| Server-only secrets; nothing secret in the repository | [src/lib/server/env.ts](src/lib/server/env.ts), [.env.example](.env.example) (placeholders only) |
| Tenant isolation is enforced in the database with row-level security | [supabase/migrations/](supabase/migrations/) |
| Trade-offs are written down where they were made | comments at the top of each module; [README: Known limitations](README.md#known-limitations-and-what-i-would-do-next) |

### Documentation and communication (10)

| Claim | Where to check |
|---|---|
| Review steps, setup, architecture, performance numbers and limitations | [README.md](README.md) |
| How AI agents were used, with measured token use, and where human decisions were made | [README: Built in an afternoon](README.md#built-in-an-afternoon-by-two-ai-agents-and-one-engineer), [.duo/](.duo/) |

## How AI tools were used to build this

Claude Code (Claude Opus 5.5) was the main engineer and OpenAI Codex (GPT-6 Astra) the second agent for blind plan critiques, code reviews and illustrations. The engineer chose the scope, settled disagreements between the agents, and approved every release. Numbers come from the agents' local session logs and are in the README.

## Honest limitations

The full list is in the [README](README.md#known-limitations-and-what-i-would-do-next). The biggest: generation takes 30–40 s, video export runs in real time, and follow-up answers point at existing drawings rather than drawing new ones.
