# Chalk for adults and older adults

Part of the [learning-UX report](learning-ux-report.md); full references are there. Lines marked *weak evidence* rest on practice or inference rather than direct experiments.

## Adults (about 18–64)

### What matters

- **Attention does not collapse at a fixed point**, but mind-wandering rises over a lecture (Wilson & Korn 2007 [doi](https://doi.org/10.1080/00986280701291291); Risko et al. 2012 [doi](https://doi.org/10.1002/acp.1814)). Questions placed between segments cut mind-wandering in online lectures (Szpunar, Khan & Schacter 2013 [doi](https://doi.org/10.1073/pnas.1221764110)).
- **Engagement drops for videos longer than about 6 minutes** (Guo, Kim & Rubin 2014 [doi](https://doi.org/10.1145/2556325.2566239)).
- **Prior knowledge varies.** Remove scaffolding for experts (Kalyuga et al. 2003 [doi](https://doi.org/10.1207/S15326985EP3801_4)).
- **Adults want relevance and control.** This is commonly stated in andragogy (Knowles) but rests on *weak evidence*. Learner control and autonomy do have support (Ryan & Deci 2000 [doi](https://doi.org/10.1037/0003-066X.55.1.68)).

### Recommended settings

| Parameter | Recommendation | Basis |
|---|---|---|
| Lesson length | 2–5 min | Guo et al. 2014 |
| Step length | 30–60 s, continuous; optional pause | Rey et al. 2019 |
| Board text | Default spec (72-unit minimum, ≤ 8 labels) | Spec §5 |
| Colour | Default inks; two hue codes per scene | Simulation in the main report |
| Narration pace | ≈ 150–170 words per minute; speed menu 0.75×–1.5× (consider 2×) | Murphy et al. 2022 [doi](https://doi.org/10.1002/acp.3899) |
| Tone | Direct and efficient; state the goal in one line; real-world application | Ginns et al. 2013; relevance is *weak evidence* |
| Interactivity | One step-end question, skippable; end recall; follow-up chat | Adesope et al. 2017; Szpunar et al. 2013 |
| Feedback | Brief explanation; never block progress | Wisniewski et al. 2020 |
| Motivation | Respect time: show the length up front; "Skip to equation" via the outline | Ryan & Deci 2000 |

### Avatar

None beyond the marker nib and the voice indicator. An on-screen instructor raises load and does not improve learning (Alemdag 2022 [doi](https://doi.org/10.1007/s10639-022-11532-4)). AI presenters give equal learning and slightly lower enjoyment (Netland et al. 2025 [doi](https://doi.org/10.1016/j.compedu.2024.105164)).

## Older adults (about 65+)

### What is different

- **Processing speed and working memory decline with age** (Salthouse 1996 [doi](https://doi.org/10.1037/0033-295X.103.3.403)).
- **Fast speech hurts comprehension, and pauses help.** Inserting pauses at clause boundaries in time-compressed speech restored older adults' recall (Wingfield et al. 1999 [doi](https://doi.org/10.1037/0882-7974.14.3.380)). Faster video playback harms older adults more than younger adults (Murphy, Hoover & Castel 2023 [doi](https://doi.org/10.1080/09658211.2023.2198326)).
- **Worked examples and narration with diagrams lower load for older learners.** Older adults gained in training efficiency from worked examples (Van Gerven et al. 2002 [doi](https://doi.org/10.1016/S0959-4752(01)00020-2)) and from modality-based multimedia (Van Gerven et al. 2003 [doi](https://doi.org/10.1348/000709903322591208)). Chalk's format suits them.
- **Colour discrimination declines, most on the blue-yellow axis**, accelerating after 60 (Paramei & Oakley 2014 [doi](https://doi.org/10.1364/JOSAA.31.00A375)). In the main report's simulation, blue/teal/green are the pairs that collapse first.
- **Dark text on a light background helps at all ages** (Piepenbrock et al. 2013 [doi](https://doi.org/10.1080/00140139.2013.790485)). Older readers preferred larger type on screen; 14 pt over 12 pt in one study (Bernard, Liao & Mills 2001 [doi](https://doi.org/10.1145/634067.634173)).

### Recommended settings

| Parameter | Recommendation | Basis |
|---|---|---|
| Lesson length | 2–4 min | Load (Salthouse 1996); the exact figure is *weak evidence* |
| Step length | 25–40 s; pause at step ends on by default | Rey et al. 2019; Wingfield et al. 1999 |
| Board text | Minimum ≈ 80–90 units (≈ 18–20 px on a phone); captions 18–20 px | Bernard et al. 2001; Legge & Bigelow 2011 |
| Colour | Never contrast blue, teal and green with each other; use blue and brick; keep strong labels | Paramei & Oakley 2014; simulation |
| Narration pace | ≈ 130–145 words per minute; 300–500 ms pauses at sentence ends; 0.75× available; default 1× | Wingfield et al. 1999; Murphy et al. 2023. The exact pause length is *weak evidence*. |
| Tone | Respectful and clear; never patronising; define terms once | *Weak evidence* |
| Interactivity | One question per step; untimed; large targets (≥ 44 px already in the spec) | Szpunar et al. 2013; WCAG target size |
| Feedback | Explanatory, gentle, with the option to replay the step | Wisniewski et al. 2020 |
| Captions | On by default | Gernsbacher 2015 [doi](https://doi.org/10.1177/2372732215602130) |

### Avatar

None beyond the marker nib. Spare working memory is scarce (Salthouse 1996), and an instructor face raises load (Alemdag 2022). The pointing nib directs attention without competing for it (Li et al. 2019 [doi](https://doi.org/10.1037/edu0000352)).

## Chalk changes for this band

1. Add **0.75×** to the speed menu.
2. A "Larger text" option, or an older-adult preset, that raises the board label minimum and caption size.
3. Pause at step ends, on by default in that preset.
4. Generation: insert sentence-end pauses in the TTS script for slow presets.
