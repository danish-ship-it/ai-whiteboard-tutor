# Product brief: Chalk, an AI whiteboard tutor

Working name: **Chalk**. It is a web app where a learner types a topic and gets a roughly 2-minute lesson. A tutor voice narrates while a whiteboard draws diagrams, shapes, arrows, labels, equations and highlights, step by step, in sync with the voice. After the lesson the learner asks follow-up questions.

The audience is evaluators at an AI product studio and curious learners of any age. It should feel like a real tutor at a whiteboard. It should not feel like a chatbot that prints paragraphs, and it should not look like a generic AI template.

## Screens and states (desktop at 1440 wide, mobile at 390 wide)

1. **Home (chat-first).** A single prompt box ("What do you want to learn?") with 4 example topic chips, e.g. "How does a neural network learn?", "Pythagorean theorem", "Photosynthesis", "How TCP handshakes work". There is also a short line explaining what happens next. Validation: an empty or too-long topic shows an inline message.
2. **Generating.** A progress state with named stages: "Planning the lesson", "Drawing the board", "Recording the voice". It takes about 10–25 s. The topic stays visible, there is a cancel option, and the state shouldn't look like a bare spinner.
3. **Lesson player (the main screen).**
   - The whiteboard canvas (16:9, the visual hero). Elements appear with a hand-drawn feel (stroke animation, slightly sketchy lines, marker colours on an off-white board). The element currently being discussed is highlighted; earlier elements dim slightly.
   - A caption strip under the board showing the current narration sentence, with the spoken word highlighted.
   - A transport bar: play/pause, restart, back/forward one step, and a scrubbable timeline with segment markers. Hovering a marker shows the segment title. It also shows elapsed and total time and playback speed (1x/1.25x/1.5x).
   - A lesson outline (the segment list: title and timestamp; clicking one seeks there; the current segment is marked).
   - A follow-up chat panel (side panel on desktop, bottom sheet on mobile). Messages, an input, a loading state, an error with retry, and suggested follow-up chips. An answer may say "I drew this on the board", and the board then shows an extra small diagram.
4. **Lesson complete.** The board stays fully drawn with a "Replay" CTA, an "Ask a question" focus and a "New topic" option.
5. **Error states.** AI generation failed (retry or change topic); voice failed (continue with captions only); network offline.

## Constraints
- Accessible: WCAG AA contrast, visible focus, keyboard shortcuts (Space play/pause, ←/→ step, R restart) shown in a small help popover.
- Light theme first, with a dark variant of the app chrome (the board itself can stay light).
- The build is Next.js + Tailwind and the board is rendered as SVG, so components must be buildable in code.
