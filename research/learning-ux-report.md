# Chalk: learning-experience research report

Prepared 16 Nov 2026 for the Braynix Studios assignment. This is research only; no app code was changed.

**How to read the evidence labels**

- **Strong**: a meta-analysis or several independent experiments agree.
- **Moderate**: one or two good experiments, or a meta-analysis with mixed moderators.
- **Weak evidence**: small or single studies, failed replications, expert practice, or my own inference. These are marked *weak evidence* in the text.

Each citation links to a DOI or a stable record. I checked the less familiar ones against publisher or repository records while writing. Effect sizes are quoted only where I could confirm them.

Per-age reports: [6–9](age-6-9.md) · [10–12](age-10-12.md) · [13–17](age-13-17.md) · [adults and older adults](adults.md)

---

## Executive summary

1. **The core design of Chalk already follows the best-supported multimedia principles.** Narration with diagrams drawn in time with the voice applies the modality, temporal contiguity and dual-coding principles. Short board labels with the explanation in the voice apply coherence. Highlighting the current element applies signalling. Learners can play, pause and seek, and the lesson is split into steps, which applies segmenting. Each of these has meta-analytic support (Ginns 2005; Ginns 2006; Schneider et al. 2018; Rey et al. 2019).
2. **The biggest missing lever is retrieval.** Chalk explains well, but it never asks the learner to recall or predict anything. Short questions placed between segments substantially reduce mind-wandering in video lectures and raise final test scores (Szpunar, Khan & Schacter 2013). Practice testing is one of the two highest-utility learning techniques (Dunlosky et al. 2013; Adesope et al. 2017). One question per step, plus a two- or three-item recall at the end, is the highest-impact change available.
3. **Colour matters more for meaning and legibility than for mood.** Claims that particular hues raise attention or IQ (for example, that red harms test performance or blue boosts creativity) are mixed and partly unreplicated (Elliot & Maier 2014; Gnambs et al. 2015). The well-supported uses of colour are high contrast, consistent colour-coding that links a quantity across board, voice and equation (Ozcelik et al. 2009), and a calm, low-saturation background. **The current paper board and dark inks are the right choice.** However, a simulation I ran shows that some ink pairs (green/brick, brick/ochre, blue/teal, green/teal) become hard to tell apart for colour-blind viewers and for many older adults. **Limit each scene to two hue-coded quantities, blue and brick, and keep colour redundant with labels.**
4. **Age changes pacing, text size, tone and the amount of interaction more than it changes the core method.** Retrieval practice and prediction work from early primary school. Drawing and self-questioning prompts help only from secondary school onwards (Brod 2021). Older adults need slower narration and benefit from pauses (Wingfield et al. 1999; Murphy, Hoover & Castel 2023). An audience selector that sets these parameters is the second most valuable change.
5. **Avatar recommendation: do not build a talking-face avatar. Add a minimal marker nib that leads each stroke and points at the current element, plus a small voice-presence indicator.** Meta-analyses find small average gains from pedagogical agents, mostly when the agent gestures or points (Castro-Alonso et al. 2021; Davis 2018). An on-screen instructor face adds cognitive load and no measurable learning gain (Alemdag 2022; Henderson & Schroeder 2021). Watching a diagram being drawn, and specific pointing, are the features that help (Fiorella et al. 2019; Li et al. 2019). AI-generated presenters produce equal learning but lower enjoyment (Netland et al. 2025).

---

## 1. Colour and attention

### 1.1 What colour does and does not do

| Claim | Evidence | Verdict for Chalk |
|---|---|---|
| Specific hues change cognitive performance (red harms achievement, blue aids creativity) | Elliot et al. (2007) [doi](https://doi.org/10.1037/0096-3445.136.1.154) and Mehta & Zhu (2009) [doi](https://doi.org/10.1126/science.1169144) reported such effects. Elliot & Maier's (2014) review [doi](https://doi.org/10.1146/annurev-psych-010213-115035) calls the field "nascent" and notes replication problems. In a learning study with 190 secondary students, Gnambs, Appel & Kaspar (2015) [doi](https://doi.org/10.1016/j.lindif.2015.07.017) found inconsistent effects of red that depended on sex. | *Weak evidence.* Do not choose inks on the basis of hue-mood claims. |
| Saturation and brightness drive arousal more than hue does | Valdez & Mehrabian (1994) [doi](https://doi.org/10.1037/0096-3445.123.4.394); Wilms & Oberfeld (2018) [doi](https://doi.org/10.1007/s00426-017-0880-8). Saturated colours raised arousal; brighter colours felt more pleasant. | Moderate. Keep large areas (the board, the chrome) low in saturation. Reserve saturation for small marks that should catch the eye. |
| Warm, pleasant colours and rounded shapes ("emotional design") improve learning | Um et al. (2012) [doi](https://doi.org/10.1037/a0026609). Meta-analyses: Brom, Stárková & D'Mello (2018) [doi](https://doi.org/10.1016/j.edurev.2018.09.004); Wong & Adesope (2021) [doi](https://doi.org/10.1007/s10648-020-09545-x), which reported small positive effects on retention and transfer. | Moderate, small effects. The warm paper board (#FFFCF5) is consistent with this. Do not add decoration to "feel friendly". |
| Colour-coding links related elements and guides the eye | Ozcelik et al. (2009) eye-tracking study [doi](https://doi.org/10.1016/j.compedu.2009.03.002): colour-coding corresponding text and picture elements improved retention and transfer and sped up locating information. Signalling meta-analyses: Schneider et al. (2018) [doi](https://doi.org/10.1016/j.edurev.2017.11.001); Richter, Scheiter & Eitel (2016) [doi](https://doi.org/10.1016/j.edurev.2015.12.003). | Strong. This is the main job of colour in Chalk. The spec's rule to "keep the same quantity in the same ink" is correct. |
| Visually busy surroundings pull young children's attention off task | Fisher, Godwin & Seltman (2014) [doi](https://doi.org/10.1177/0956797614533801): kindergarteners in a heavily decorated classroom spent more time off task and learned less than in a sparse one. | Moderate. This is a single study, but it was well controlled. Keep the board sparse for every age, especially for young children. |

### 1.2 Legibility and contrast

- **Dark text on a light background reads better than light on dark, for both younger and older adults.** Piepenbrock et al. (2013) [doi](https://doi.org/10.1080/00140139.2013.790485) showed this for proofreading and acuity, and the advantage grew with smaller text. Keeping the board light even in the dark theme is correct.
- **WCAG thresholds:** 4.5:1 for normal text and 3:1 for non-text graphics such as strokes and arrows ([1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). Colour must not be the only carrier of meaning ([1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)). All six Chalk inks pass 4.5:1 at full opacity, and at 85% opacity on the board as well, according to the spec.
- **Print size:** reading speed stays at its maximum across a range of sizes above a "critical print size", then falls sharply below it (Legge & Bigelow 2011 [doi](https://doi.org/10.1167/11.5.8)). Children and older readers have larger critical print sizes. At the 390 px mobile width a 72-unit board label renders at about 16 px, which suits adults but is near the floor for early readers (see the [6–9 report](age-6-9.md)).

### 1.3 Colour-blind safety: a simulation of the current inks

About 8% of men and 0.4% of women of northern European descent have red-green colour-vision deficiency (Birch 2012 [doi](https://doi.org/10.1364/JOSAA.29.000313)). Colour discrimination also declines with age, sharply after 60 and most on the blue-yellow (tritan) axis (Paramei & Oakley 2014 [doi](https://doi.org/10.1364/JOSAA.31.00A375)).

I simulated the six inks using Machado et al. (2009) full-severity matrices and measured the CIELAB colour difference (ΔE76) between pairs. The pairs with the least separation were:

| Vision | Closest ink pairs (ΔE; below about 15 means risky for thin 2.5 px strokes) |
|---|---|
| Typical | green/teal **21**, graphite/teal 31 |
| Protan (red-weak) | green/brick **9**, green/teal 21 |
| Deutan (green-weak, the most common type) | brick/ochre **12**, green/teal 20 |
| Tritan (blue-weak; resembles age-related loss) | green/teal **4**, blue/teal **10**, blue/green 13 |

*The 15 ΔE cut-off for thin lines is a rule of thumb (weak evidence). Thin strokes and small text look less colourful than large patches, so the real separation is smaller than these numbers suggest.*

Implications:

- Green and teal are close even for typical vision. In the reference lesson, `a` is blue and `b` is teal, which is a risky pair under tritan vision and for older viewers.
- No six-colour set of dark, high-contrast inks stays distinct for every type of colour-vision deficiency. Adding a plum ink (#7A3B8C) in place of teal did not fix this. **The robust rule is to hue-code at most two contrasting quantities per scene and carry any third with graphite plus label, position or line style.** Blue versus brick (a blue/orange-red split, as in the Okabe & Ito [Color Universal Design](https://jfly.uni-koeln.de/color/) guidance) stayed well separated in every simulation.
- The spec already says "Colour never carries the whole meaning." Keep enforcing this in the lesson-generation prompt.

### 1.4 Recommended whiteboard ink use

1. Use graphite for structure and neutral labels (14:1 contrast).
2. Use blue and brick for the two quantities being contrasted or related. Keep each quantity in the same ink for the whole lesson.
3. Use ochre only for a short-lived attention mark, such as a circle or underline on the current item. Never use it to code a quantity that sits next to a brick one.
4. Use green and teal sparingly, for at most one role per lesson, and never next to each other or next to brick.
5. Keep the highlight tints (about 8% ink). Low-saturation fills signal without raising arousal (Wilms & Oberfeld 2018).

---

## 2. Methods that improve focus and retention

### 2.1 Retrieval practice and interpolated questions (strong)

- Recalling material produces better long-term retention than restudying it (Roediger & Karpicke 2006 [doi](https://doi.org/10.1111/j.1467-9280.2006.01693.x)). Meta-analyses: Rowland (2014) [doi](https://doi.org/10.1037/a0037559); Adesope, Trevisan & Sundararajan (2017) [doi](https://doi.org/10.3102/0034654316689306), g ≈ 0.6; classroom studies, Agarwal, Nunes & Blunt (2021) [doi](https://doi.org/10.1007/s10648-021-09595-9). Dunlosky et al. (2013) [doi](https://doi.org/10.1177/1529100612453266) rate practice testing as high utility.
- **Questions between video segments reduce mind-wandering, increase note-taking and improve final tests** (Szpunar, Khan & Schacter 2013 [doi](https://doi.org/10.1073/pnas.1221764110)). This maps directly onto Chalk's four steps.
- **Pre-questions** asked before a segment improve learning of the questioned content and sometimes of related content (Carpenter & Toftness 2017 [doi](https://doi.org/10.1016/j.jarmac.2017.07.003); review by Pan & Carpenter 2023 [doi](https://doi.org/10.1007/s10648-023-09814-5)). The size of the benefit varies with procedure and test, and some commentators consider it small (moderate evidence).
- **Feedback** strengthens the effect. Feedback that explains why an answer is right works better than simple right/wrong marking (Wisniewski, Zierer & Hattie 2020 [doi](https://doi.org/10.3389/fpsyg.2019.03087); Hattie & Timperley 2007 [doi](https://doi.org/10.3102/003465430298487)).

### 2.2 Worked examples and the expertise-reversal effect (strong)

- For novices, studying a worked example beats solving the same problem unaided (Sweller, van Merriënboer & Paas 2019 [doi](https://doi.org/10.1007/s10648-019-09465-5)). A meta-analysis of mathematics studies found a positive effect (Barbieri et al. 2023 [doi](https://doi.org/10.1007/s10648-023-09745-1)).
- As expertise grows, the same detailed guidance becomes redundant and can hurt (Kalyuga et al. 2003 [doi](https://doi.org/10.1207/S15326985EP3801_4)). Chalk's "Try 3, 4, 5" step is a worked example. For advanced learners a "now you try" variant (completion problem) would fit better.

### 2.3 Dual coding (strong for the combination; the theory is debated)

Words combined with pictures beat words alone (Clark & Paivio 1991 [doi](https://doi.org/10.1007/BF01320076); Mayer 2021, *Multimedia Learning*, 3rd ed. [doi](https://doi.org/10.1017/9781316941355)). Chalk's premise is sound. Note that this supports words *with* pictures. It is not evidence for "visual learner" matching, which has no support (Pashler et al. 2008 [doi](https://doi.org/10.1111/j.1539-6053.2009.01038.x)).

### 2.4 Mayer's multimedia principles applied to Chalk

| Principle | Evidence | Chalk today | Gap |
|---|---|---|---|
| **Signalling**: cue what matters | Meta-analyses: Schneider et al. 2018 [doi](https://doi.org/10.1016/j.edurev.2017.11.001); Richter et al. 2016 [doi](https://doi.org/10.1016/j.edurev.2015.12.003) | Current element gets a tint and underline; earlier geometry dims to 85% | Good. Add a pointing cue (§4). |
| **Segmenting**: learner-paced chunks | Meta-analysis: Rey et al. 2019 [doi](https://doi.org/10.1007/s10648-018-9456-4). Pause control helped 11–12-year-olds (Hasler, Kersten & Sweller 2007 [doi](https://doi.org/10.1002/acp.1345)) | Four steps, previous/next, outline | Steps flow straight through. An optional pause at each step boundary would make segmenting learner-paced. |
| **Temporal contiguity**: words and pictures at the same time | Meta-analysis: Ginns 2006 [doi](https://doi.org/10.1016/j.learninstruc.2006.10.001) | Strokes keyed to narration cues | Strong fit. Keep cue lag under about 300 ms (*weak evidence* for the exact figure). |
| **Spatial contiguity** | Ginns 2006 | Labels next to shapes; connector labels on the path | Good. |
| **Modality**: narration plus graphics beats on-screen text plus graphics | Meta-analysis: Ginns 2005 [doi](https://doi.org/10.1016/j.learninstruc.2005.07.001) | Explanations in the voice, keywords on the board | Strong fit. |
| **Redundancy**: identical on-screen text competes with narration | Meta-analysis: Adesope & Nesbit 2012 [doi](https://doi.org/10.1037/a0026483). Redundant text helped when no pictures were present and was neutral or harmful with pictures and system pacing | Full-sentence captions under the board, word-highlighted | Tension. Captions help accessibility, non-native speakers and early readers (Gernsbacher 2015 [doi](https://doi.org/10.1177/2372732215602130); Linebarger et al. 2010 [doi](https://doi.org/10.1111/j.1467-9817.2009.01412.x)). Keep them, but add a captions on/off toggle and keep them visually quieter than the board. |
| **Coherence / seductive details** | Rey 2012 [doi](https://doi.org/10.1016/j.edurev.2012.05.003); Sundararajan & Adesope 2020 [doi](https://doi.org/10.1007/s10648-020-09522-4) | The spec bans decorative doodles | Good. Apply the same rule to the generation prompt (no fun-fact tangents). |
| **Voice**: a human-like voice beats a robotic one | Mayer, Sobko & Mautone 2003 [doi](https://doi.org/10.1037/0022-0663.95.2.419). Craig & Schroeder 2017 [doi](https://doi.org/10.1016/j.compedu.2017.07.003) found a modern text-to-speech voice performed as well as a human voice | ElevenLabs narration | Good. Choose a warm, natural voice and avoid novelty voices. |
| **Personalisation**: conversational "you/we" | Meta-analysis: Ginns, Martin & Marsh 2013 [doi](https://doi.org/10.1007/s10648-013-9228-0) | The ready caption says "We'll take it one step at a time" | Make it a rule in the script prompt. |
| **Pre-training**: names and parts first | Mayer 2021 | Step 2, "Name the sides" | Good. |

### 2.5 Pacing and lesson length

- **The fixed "10-minute attention span" is a myth.** Attention fluctuates within minutes rather than collapsing at a set point (Wilson & Korn 2007 [doi](https://doi.org/10.1080/00986280701291291); Bradbury 2016 [doi](https://doi.org/10.1152/advan.00109.2016)). Mind-wandering does rise as a lecture goes on (Risko et al. 2012 [doi](https://doi.org/10.1002/acp.1814)).
- **Shorter videos hold engagement better.** In 6.9 million MOOC sessions, median engagement fell after about 6 minutes (Guo, Kim & Rubin 2014 [doi](https://doi.org/10.1145/2556325.2566239)). Brame (2016) [doi](https://doi.org/10.1187/cbe.16-03-0125) recommends keeping videos short. Chalk's lesson of about 2 minutes is well inside this range. Its 20–35-second steps are a good segment size.
- **Playback speed:** up to 2× costs young adults little comprehension (Murphy et al. 2022 [doi](https://doi.org/10.1002/acp.3899)). Older adults are hurt by faster playback (Murphy, Hoover & Castel 2023 [doi](https://doi.org/10.1080/09658211.2023.2198326)), and they recover recall when pauses are inserted at clause boundaries (Wingfield et al. 1999 [doi](https://doi.org/10.1037/0882-7974.14.3.380)). Chalk offers 1×, 1.25× and 1.5× only. **Add 0.75×**.
- **Spacing and interleaving.** Spaced review beats massed review (Cepeda et al. 2006 [doi](https://doi.org/10.1037/0033-2909.132.3.354)). Interleaving helps most when categories are easily confused (Brunmair & Richter 2019 [doi](https://doi.org/10.1037/bul0000209)). In a 2-minute single-topic lesson the practical form is one end-of-lesson question that mixes earlier steps, plus an optional "review tomorrow" prompt.

### 2.6 Cognitive load

Working memory is small. Novices are easily overloaded, so splitting attention, adding redundant material and including extraneous detail all cost learning (Sweller et al. 2019). Chalk's spec limits help directly: at most two diagram groups, eight or fewer short labels and about 14 characters per line. The main load risks left are:

- Full captions shown alongside a busy board (see Redundancy above).
- Follow-up answers whose annex drawing appears while narration continues.
- Fast narration for older adults and young children.

---

## 3. Age bands (summary; details in the per-age reports)

Brod's (2021) review of generative strategies by age [doi](https://doi.org/10.1007/s10648-020-09571-9) is the key anchor. **Practice testing and prediction work from lower primary school onwards. Drawing and self-questioning prompts work reliably only from secondary school. Every strategy works for university students.**

| | 6–9 | 10–12 | 13–17 | Adults | Older adults (65+) |
|---|---|---|---|---|---|
| Lesson length | 1.5–2 min | 2–3 min | 2–4 min | 2–5 min | 2–4 min |
| Step (segment) | 15–25 s | 20–30 s | 25–40 s | 30–60 s | 25–40 s, with pauses |
| Narration pace (*weak evidence*) | ~120–135 wpm | ~135–150 wpm | ~150–165 wpm | ~150–170 wpm, with speed control | ~130–145 wpm, pauses at clauses |
| Board label minimum on a phone | ≥ 20 px (≈ 90 units) | ≥ 18 px | 16 px | 16 px | ≥ 18–20 px |
| Colour | Same inks; more tint, still only 2 hue codes | Same | Same | Same | Avoid blue/teal/green distinctions |
| Interaction | Tap-to-answer after every step | One question per step | Per step, plus "predict" prompts | Optional; skip allowed | Per step, self-paced, no timers |
| Tone | Warm, concrete, short sentences | Friendly, "let's figure out" | Respectful peer, not childish | Direct, efficient | Respectful, clear, unhurried |
| Feedback | Immediate, praise effort and strategy | Immediate, explanatory | Explanatory, competence-focused | Explanatory, brief | Explanatory, no time pressure |

Full rationale and citations are in [age-6-9.md](age-6-9.md), [age-10-12.md](age-10-12.md), [age-13-17.md](age-13-17.md) and [adults.md](adults.md).

---

## 4. Animated pedagogical agents and AI avatars

### 4.1 What the evidence says

| Finding | Source | Strength |
|---|---|---|
| **The persona effect.** A lifelike agent made learners rate the experience more positively | Lester et al. 1997 [doi](https://doi.org/10.1145/258549.258797) | Early study; motivation rather than learning |
| Pedagogical agents give a **small** learning gain on average, larger for K-12 than for university students | Schroeder, Adesope & Gilbert 2013, 43 studies [doi](https://doi.org/10.2190/EC.49.1.a) | Strong (meta-analysis), small effect |
| A small positive effect overall; agents that **gesture** do better than static ones (Davis 2018) | Castro-Alonso et al. 2021 [doi](https://doi.org/10.1007/s10648-020-09587-1); gesture meta-analysis Davis 2018 [doi](https://doi.org/10.1016/j.edurev.2018.05.002) | Strong, small |
| Agents do not reliably improve motivation or learning; the outcome depends on design | Heidig & Clarebout 2011 [doi](https://doi.org/10.1016/j.edurev.2010.07.004) | Review |
| **Embodiment principle.** An agent with human-like gesture and gaze beats a static one | Mayer & DaPra 2012 [doi](https://doi.org/10.1037/a0028616) | Moderate |
| **Image principle.** Merely adding the speaker's image does not improve learning | Mayer, Dow & Mayer 2003 [doi](https://doi.org/10.1037/0022-0663.95.4.806); Mayer 2021 | Moderate |
| **Specific pointing** at the relevant part of the graphic improved learning and attention to the right material; general gestures did not | Li, Wang, Mayer & Liu 2019 [doi](https://doi.org/10.1037/edu0000352) | Moderate |
| Agents draw eye fixations away from the content | Wang et al. 2018 [doi](https://doi.org/10.1037/edu0000221); van Gog et al. 2014 [doi](https://doi.org/10.1016/j.compedu.2013.11.004) (a face drew attention without harming learning) | Moderate |
| An **on-screen instructor** gives no significant learning or social-presence gain and increases cognitive load, while raising motivation | Alemdag 2022, 20 experiments [doi](https://doi.org/10.1007/s10639-022-11532-4); Henderson & Schroeder 2021 [record](https://doaj.org/article/8153054b2828456987b7c3be15d2895d) | Strong (no average benefit) |
| **Watching the instructor draw live** beat seeing finished drawings (d ≈ 0.5); making the instructor visible added nothing more | Fiorella, Stull, Kuhlmann & Mayer 2019 [doi](https://doi.org/10.1037/edu0000325); Fiorella & Mayer 2016 [doi](https://doi.org/10.1037/edu0000065) | Moderate, replicated |
| Whiteboard-animation videos improved retention of advanced physics topics compared with conventional video | Türkay 2016 [doi](https://doi.org/10.1016/j.compedu.2016.03.004) | Moderate |
| **AI-generated presenter videos** produced exam scores equal to human-made videos; learners enjoyed them slightly less | Netland et al. 2025, n = 447 [doi](https://doi.org/10.1016/j.compedu.2024.105164) | Moderate, adults, short concepts |
| Near-human faces can feel eerie (the uncanny valley) | Mori 1970/2012 [doi](https://doi.org/10.1109/MRA.2012.2192811) | *Weak evidence* for learning effects |

### 4.2 Conditions by age

- **6–9:** agents show the largest gains in K-12 samples (Schroeder et al. 2013). Children also have the least spare attention (Fisher et al. 2014). If a character is used, it should be simple, non-realistic, appear only at transitions or questions, and point at the board. *Weak evidence* for any character beyond a pointer at this age.
- **10–17:** gains are smaller. Teens are sensitive to anything that seems childish or condescending (Yeager, Dahl & Dweck 2018 [doi](https://doi.org/10.1177/1745691617722620)). A cartoon tutor risks putting them off. *Weak evidence*: inference from motivation research.
- **Adults and older adults:** an on-screen face raises load without improving learning (Alemdag 2022). Older adults have less working-memory capacity to spare (Salthouse 1996 [doi](https://doi.org/10.1037/0033-295X.103.3.403)).

### 4.3 Recommendation for Chalk

**Choose the minimal hand/marker option, combined with a small voice-presence indicator. Do not build a full avatar. "None" leaves proven gains unused.**

- **Marker nib.** A small marker tip in the stroke's ink rides the leading end of each stroke as it draws. It then rests next to the current element while that element is being discussed. This adds the "watching it being drawn" benefit (Fiorella et al. 2019) and specific pointing (Li et al. 2019) at near-zero cognitive cost. A full hand graphic is optional; *weak evidence* that a hand adds anything over a nib.
- **Voice-presence indicator.** A small 3-bar level meter or a soft dot next to the "TUTOR" caption label, shown only while narration plays. It shows who is speaking and that audio is live. Learning evidence: none (*weak evidence*; a usability affordance).
- **Why not a face:** no learning gain and extra load (Alemdag 2022; Henderson & Schroeder 2021). Gaze competes with the board (Wang et al. 2018). Lip sync must stay in step with ElevenLabs audio, which adds engineering risk. Uncanny-valley risk. Lower enjoyment of AI presenters (Netland et al. 2025). Assessors weigh "quality of learning experience"; a face spends effort on an element the evidence says is neutral at best.

---

## 5. Recommendations for Chalk

Ranked by expected learning impact divided by effort. "Where" points to the spec section or code likely to be touched. **These are proposals for the main session; nothing has been changed here.**

| # | Change | Impact | Effort | Where | Evidence |
|---|---|---|---|---|---|
| 1 | **Step-end check question.** At each step boundary, pause and show one tap-to-answer question (2–3 options) over the caption area. Then give one sentence of explanatory feedback in the voice and on the board, and resume. Add a Skip option. Ask the lesson generator for one question per segment. | High | Medium | Lesson schema; player state machine (new "Checking" state beside Playing and Paused in spec §3); caption area | Szpunar 2013; Adesope 2017; Wisniewski 2020 |
| 2 | **End-of-lesson recall.** Replace "Lesson complete. What clicked?" with a 2–3-item mixed recall from earlier steps ("Which side is the hypotenuse?"). Show the score as "2 of 3", then offer Replay step / Ask a question. | High | Low–Medium | Lesson complete panel (spec §3) | Roediger & Karpicke 2006; Brunmair & Richter 2019 |
| 3 | **Audience selector on Home** (Kid 6–9 · 10–12 · Teen · Adult), passed to generation. It sets vocabulary, step length, words per minute (via ElevenLabs speed or text length), tone, minimum board label size and question frequency. Default to Adult. | High | Medium | Home form; generation prompt; board label minimum | Brod 2021; Kalyuga 2003; age reports |
| 4 | **Marker-nib pointer.** A nib follows the stroke tip during reveal and rests beside the current element (the `el.active` element). Hide it when `reducedMotion` is set, or show it static at the current element. | Medium–High | Low–Medium | `Whiteboard.tsx`: new `<Nib>` drawn after `Emphasis`, positioned from the path end and the shape bounds | Fiorella 2019; Li 2019 |
| 5 | **Ink rule: at most two hue-coded quantities per scene (blue and brick).** Never place green next to teal or brick, or brick next to ochre. Update the reference lesson so that `b` is not teal (use graphite with a label, or swap the roles). Add the rule to the generation prompt and validate it in the layout code. | Medium | Low | Spec §2 inks and §5 labels; generation prompt; layout validator | Simulation §1.3; Birch 2012; Paramei & Oakley 2014 |
| 6 | **Optional pause at step ends** ("Continue ▸"). On by default for Kid, off for Adult. | Medium | Low | Player; outline | Rey 2019; Hasler 2007 |
| 7 | **0.75× speed option** (and 0.9× if the menu allows). Insert short pauses at sentence ends in the TTS script. | Medium for older adults, children and non-native speakers | Low | Speed menu (spec §3) | Murphy et al. 2023; Wingfield 1999 |
| 8 | **Pre-question at Ready.** Change the Start caption to a prediction ("Guess: which side do you think is longest?"), with no answer required. | Medium | Low | Ready state caption | Pan & Carpenter 2023; Brod 2021 (predicting) |
| 9 | **Captions toggle (CC)**, remembered per user. Default on, for accessibility and early readers. Keep the caption styling quieter than the board ink. | Low–Medium | Low | Transport | Adesope & Nesbit 2012; Gernsbacher 2015 |
| 10 | **Voice-presence indicator** beside the "TUTOR" label while audio plays. | Low (for learning) | Low | Caption label | Usability only (*weak evidence*) |
| 11 | **Script rules in the prompt:** second person, sentences of 20 words or fewer for adults and 12 or fewer for children, no tangents, name the parts before using them, and finish with a one-line takeaway. | Medium | Low | Generation prompt | Ginns et al. 2013; Rey 2012; Mayer 2021 |
| 12 | **Follow-up answers:** narrate the annex while it draws, not before or after it, and pause the main lesson (already in the spec). | Low–Medium | Low | Follow-up annex | Ginns 2006 |

**Implementation status (17 Nov 2026):** built: 2 (end-of-lesson recall), 3 (audience selector, three bands: Kids 8–12, Teens, Adults), 4 (marker nib), 5 (ink rule), 7 (0.75×), 9 (captions toggle, remembered), 12 (follow-ups pause the lesson and point at the board), plus dual coding: every scene must draw a picture of the subject. Not yet built: 1 (step-end checks), 6 (pauses at step ends), 8 (pre-question), 10 (voice indicator), 11 (child sentence-length rule beyond the audience note).

**Do not build:** a talking-face avatar; colour themes based on hue-mood claims; badges, streaks or confetti in a 2-minute lesson. Gamification shows benefits mainly in longer courses, and its effects vary widely by design (Sailer & Homner 2020 [doi](https://doi.org/10.1007/s10648-019-09498-w)). Its value at this scale is *weak evidence*.

---

## References (alphabetical)

- Adesope, O. O., & Nesbit, J. C. (2012). Verbal redundancy in multimedia learning environments: A meta-analysis. *J. Educ. Psych.*, 104(1). https://doi.org/10.1037/a0026483
- Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: A meta-analysis of practice testing. *Rev. Educ. Res.*, 87(3). https://doi.org/10.3102/0034654316689306
- Agarwal, P. K., Nunes, L. D., & Blunt, J. R. (2021). Retrieval practice consistently benefits student learning. *Educ. Psych. Rev.*, 33. https://doi.org/10.1007/s10648-021-09595-9
- Alemdag, E. (2022). Effects of instructor-present videos on learning, cognitive load, motivation, and social presence: A meta-analysis. *Educ. Inf. Technol.*, 27. https://doi.org/10.1007/s10639-022-11532-4
- Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., & Chawla, K. (2023). A meta-analysis of the worked examples effect on mathematics performance. *Educ. Psych. Rev.*, 35. https://doi.org/10.1007/s10648-023-09745-1
- Bernard, M., Liao, C. H., & Mills, M. (2001). The effects of font type and size on the legibility and reading time of online text by older adults. *CHI '01 EA*. https://doi.org/10.1145/634067.634173
- Betts, J., McKay, J., Maruff, P., & Anderson, V. (2006). The development of sustained attention in children. *Child Neuropsychology*, 12(3). https://doi.org/10.1080/09297040500350938
- Birch, J. (2012). Worldwide prevalence of red-green color deficiency. *JOSA A*, 29(3). https://doi.org/10.1364/JOSAA.29.000313
- Bradbury, N. A. (2016). Attention span during lectures: 8 seconds, 10 minutes, or more? *Adv. Physiol. Educ.*, 40. https://doi.org/10.1152/advan.00109.2016
- Brame, C. J. (2016). Effective educational videos. *CBE—Life Sci. Educ.*, 15(4). https://doi.org/10.1187/cbe.16-03-0125
- Brod, G. (2021). Generative learning: Which strategies for what age? *Educ. Psych. Rev.*, 33, 1295–1318. https://doi.org/10.1007/s10648-020-09571-9
- Brom, C., Stárková, T., & D'Mello, S. K. (2018). How effective is emotional design? A meta-analysis. *Educ. Res. Rev.*, 25. https://doi.org/10.1016/j.edurev.2018.09.004
- Brunmair, M., & Richter, T. (2019). Similarity matters: A meta-analysis of interleaved learning. *Psych. Bull.*, 145(11). https://doi.org/10.1037/bul0000209
- Carpenter, S. K., & Toftness, A. R. (2017). The effect of prequestions on learning from video presentations. *JARMAC*, 6(1). https://doi.org/10.1016/j.jarmac.2017.07.003
- Castro-Alonso, J. C., Wong, R. M., Adesope, O. O., & Paas, F. (2021). Effectiveness of multimedia pedagogical agents predicted by diverse theories: A meta-analysis. *Educ. Psych. Rev.*, 33. https://doi.org/10.1007/s10648-020-09587-1
- Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks. *Psych. Bull.*, 132(3). https://doi.org/10.1037/0033-2909.132.3.354
- Clark, J. M., & Paivio, A. (1991). Dual coding theory and education. *Educ. Psych. Rev.*, 3(3). https://doi.org/10.1007/BF01320076
- Craig, S. D., & Schroeder, N. L. (2017). Reconsidering the voice effect when learning from a virtual human. *Computers & Education*, 114. https://doi.org/10.1016/j.compedu.2017.07.003
- Davis, R. O. (2018). The impact of pedagogical agent gesturing in multimedia learning environments: A meta-analysis. *Educ. Res. Rev.*, 24. https://doi.org/10.1016/j.edurev.2018.05.002
- Dunlosky, J., et al. (2013). Improving students' learning with effective learning techniques. *Psych. Sci. Public Interest*, 14(1). https://doi.org/10.1177/1529100612453266
- Elliot, A. J., & Maier, M. A. (2014). Color psychology. *Annu. Rev. Psych.*, 65. https://doi.org/10.1146/annurev-psych-010213-115035
- Elliot, A. J., et al. (2007). Color and psychological functioning: The effect of red on performance attainment. *JEP: General*, 136(1). https://doi.org/10.1037/0096-3445.136.1.154
- Fiorella, L., & Mayer, R. E. (2016). Effects of observing the instructor draw diagrams on learning from multimedia messages. *J. Educ. Psych.*, 108(4). https://doi.org/10.1037/edu0000065
- Fiorella, L., Stull, A. T., Kuhlmann, S., & Mayer, R. E. (2019). Instructor presence in video lectures: The role of dynamic drawings, eye contact, and instructor visibility. *J. Educ. Psych.*, 111(7). https://doi.org/10.1037/edu0000325
- Fisher, A. V., Godwin, K. E., & Seltman, H. (2014). Visual environment, attention allocation, and learning in young children. *Psych. Sci.*, 25(7). https://doi.org/10.1177/0956797614533801
- Gernsbacher, M. A. (2015). Video captions benefit everyone. *Policy Insights Behav. Brain Sci.*, 2(1). https://doi.org/10.1177/2372732215602130
- Ginns, P. (2005). Meta-analysis of the modality effect. *Learning & Instruction*, 15(4). https://doi.org/10.1016/j.learninstruc.2005.07.001
- Ginns, P. (2006). Integrating information: A meta-analysis of the spatial contiguity and temporal contiguity effects. *Learning & Instruction*, 16(6). https://doi.org/10.1016/j.learninstruc.2006.10.001
- Ginns, P., Martin, A. J., & Marsh, H. W. (2013). Designing instructional text in a conversational style: A meta-analysis. *Educ. Psych. Rev.*, 25. https://doi.org/10.1007/s10648-013-9228-0
- Gnambs, T., Appel, M., & Kaspar, K. (2015). The effect of the color red on encoding and retrieval of declarative knowledge. *Learning & Individual Differences*, 42. https://doi.org/10.1016/j.lindif.2015.07.017
- Guo, P. J., Kim, J., & Rubin, R. (2014). How video production affects student engagement. *Proc. L@S*. https://doi.org/10.1145/2556325.2566239
- Hasler, B. S., Kersten, B., & Sweller, J. (2007). Learner control, cognitive load and instructional animation. *Appl. Cogn. Psych.*, 21(6). https://doi.org/10.1002/acp.1345
- Hattie, J., & Timperley, H. (2007). The power of feedback. *Rev. Educ. Res.*, 77(1). https://doi.org/10.3102/003465430298487
- Heidig, S., & Clarebout, G. (2011). Do pedagogical agents make a difference to student motivation and learning? *Educ. Res. Rev.*, 6(1). https://doi.org/10.1016/j.edurev.2010.07.004
- Henderson, M. L., & Schroeder, N. L. (2021). A systematic review of instructor presence in instructional videos. *Computers and Education Open*, 2, 100059. https://doaj.org/article/8153054b2828456987b7c3be15d2895d
- Hughes, L. E., & Wilkins, A. J. (2000). Typography in children's reading schemes may be suboptimal. *J. Res. Reading*, 23(3). https://doi.org/10.1111/1467-9817.00126
- Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The expertise reversal effect. *Educ. Psychologist*, 38(1). https://doi.org/10.1207/S15326985EP3801_4
- Legge, G. E., & Bigelow, C. A. (2011). Does print size matter for reading? *J. Vision*, 11(5). https://doi.org/10.1167/11.5.8
- Lester, J. C., et al. (1997). The persona effect. *Proc. CHI '97*. https://doi.org/10.1145/258549.258797
- Li, W., Wang, F., Mayer, R. E., & Liu, H. (2019). Getting the point: Which kinds of gestures by pedagogical agents improve multimedia learning? *J. Educ. Psych.*, 111(8). https://doi.org/10.1037/edu0000352
- Li, Y., & Bates, T. C. (2019). You can't change your basic ability, but you work at things... *JEP: General*, 148(9). https://doi.org/10.1037/xge0000669
- Linebarger, D. L., Piotrowski, J. T., & Greenwood, C. R. (2010). Using captioned television as a supplemental literacy tool. *J. Res. Reading*, 33(2). https://doi.org/10.1111/j.1467-9817.2009.01412.x
- Machado, G. M., Oliveira, M. M., & Fernandes, L. A. F. (2009). A physiologically-based model for simulation of color vision deficiency. *IEEE TVCG*, 15(6). https://doi.org/10.1109/TVCG.2009.113
- Mayer, R. E. (2021). *Multimedia Learning* (3rd ed.). Cambridge University Press. https://doi.org/10.1017/9781316941355
- Mayer, R. E., & DaPra, C. S. (2012). An embodiment effect in computer-based learning with animated pedagogical agents. *J. Exp. Psych.: Applied*, 18(3). https://doi.org/10.1037/a0028616
- Mayer, R. E., Dow, G. T., & Mayer, S. (2003). Multimedia learning in an interactive self-explaining environment. *J. Educ. Psych.*, 95(4). https://doi.org/10.1037/0022-0663.95.4.806
- Mayer, R. E., Sobko, K., & Mautone, P. D. (2003). Social cues in multimedia learning: Role of speaker's voice. *J. Educ. Psych.*, 95(2). https://doi.org/10.1037/0022-0663.95.2.419
- Mehta, R., & Zhu, R. (2009). Blue or red? Exploring the effect of color on cognitive task performances. *Science*, 323. https://doi.org/10.1126/science.1169144
- Mori, M. (2012/1970). The uncanny valley (K. F. MacDorman & N. Kageki, Trans.). *IEEE Robot. Autom. Mag.*, 19(2). https://doi.org/10.1109/MRA.2012.2192811
- Mueller, C. M., & Dweck, C. S. (1998). Praise for intelligence can undermine children's motivation and performance. *JPSP*, 75(1). https://doi.org/10.1037/0022-3514.75.1.33
- Murphy, D. H., Hoover, K. M., Agadzhanyan, K., Kuehn, J. C., & Castel, A. D. (2022). Learning in double time. *Appl. Cogn. Psych.*, 36(1). https://doi.org/10.1002/acp.3899
- Murphy, D. H., Hoover, K. M., & Castel, A. D. (2023). The effect of video playback speed on learning and mind-wandering in younger and older adults. *Memory*. https://doi.org/10.1080/09658211.2023.2198326
- Netland, T., von Dzengelevski, O., Tesch, K., & Kwasnitschka, D. (2025). Comparing human-made and AI-generated teaching videos. *Computers & Education*, 224, 105164. https://doi.org/10.1016/j.compedu.2024.105164
- Okabe, M., & Ito, K. (2008). Color Universal Design. https://jfly.uni-koeln.de/color/
- Ozcelik, E., Karakus, T., Kursun, E., & Cagiltay, K. (2009). An eye-tracking study of how color coding affects multimedia learning. *Computers & Education*, 53(2). https://doi.org/10.1016/j.compedu.2009.03.002
- Pan, S. C., & Carpenter, S. K. (2023). Prequestioning and pretesting effects: A review. *Educ. Psych. Rev.*, 35. https://doi.org/10.1007/s10648-023-09814-5
- Paramei, G. V., & Oakley, B. (2014). Variation of color discrimination across the life span. *JOSA A*, 31(4), A375–A384. https://doi.org/10.1364/JOSAA.31.00A375
- Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R. (2008). Learning styles: Concepts and evidence. *Psych. Sci. Public Interest*, 9(3). https://doi.org/10.1111/j.1539-6053.2009.01038.x
- Piepenbrock, C., Mayr, S., Mund, I., & Buchner, A. (2013). Positive display polarity is advantageous for both younger and older adults. *Ergonomics*, 56(7). https://doi.org/10.1080/00140139.2013.790485
- Rey, G. D. (2012). A review of research and a meta-analysis of the seductive detail effect. *Educ. Res. Rev.*, 7(3). https://doi.org/10.1016/j.edurev.2012.05.003
- Rey, G. D., Beege, M., Nebel, S., Wirzberger, M., Schmitt, T. H., & Schneider, S. (2019). A meta-analysis of the segmenting effect. *Educ. Psych. Rev.*, 31. https://doi.org/10.1007/s10648-018-9456-4
- Richter, J., Scheiter, K., & Eitel, A. (2016). Signaling text-picture relations in multimedia learning. *Educ. Res. Rev.*, 17. https://doi.org/10.1016/j.edurev.2015.12.003
- Risko, E. F., Anderson, N., Sarwal, A., Engelhardt, M., & Kingstone, A. (2012). Everyday attention: Variation in mind wandering and memory in a lecture. *Appl. Cogn. Psych.*, 26(2). https://doi.org/10.1002/acp.1814
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psych. Sci.*, 17(3). https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Rowland, C. A. (2014). The effect of testing versus restudy on retention: A meta-analytic review. *Psych. Bull.*, 140(6). https://doi.org/10.1037/a0037559
- Sailer, M., & Homner, L. (2020). The gamification of learning: A meta-analysis. *Educ. Psych. Rev.*, 32. https://doi.org/10.1007/s10648-019-09498-w
- Salthouse, T. A. (1996). The processing-speed theory of adult age differences in cognition. *Psych. Rev.*, 103(3). https://doi.org/10.1037/0033-295X.103.3.403
- Schneider, S., Beege, M., Nebel, S., & Rey, G. D. (2018). A meta-analysis of how signaling affects learning with media. *Educ. Res. Rev.*, 23. https://doi.org/10.1016/j.edurev.2017.11.001
- Schroeder, N. L., Adesope, O. O., & Gilbert, R. B. (2013). How effective are pedagogical agents for learning? A meta-analytic review. *J. Educ. Comput. Res.*, 49(1). https://doi.org/10.2190/EC.49.1.a
- Sundararajan, N., & Adesope, O. (2020). Keep it coherent: A meta-analysis of the seductive details effect. *Educ. Psych. Rev.*, 32. https://doi.org/10.1007/s10648-020-09522-4
- Sweller, J., van Merriënboer, J. J. G., & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. *Educ. Psych. Rev.*, 31. https://doi.org/10.1007/s10648-019-09465-5
- Szpunar, K. K., Khan, N. Y., & Schacter, D. L. (2013). Interpolated memory tests reduce mind wandering and improve learning of online lectures. *PNAS*, 110(16). https://doi.org/10.1073/pnas.1221764110
- Türkay, S. (2016). The effects of whiteboard animations on retention and subjective experiences when learning advanced physics topics. *Computers & Education*, 98. https://doi.org/10.1016/j.compedu.2016.03.004
- Um, E., Plass, J. L., Hayward, E. O., & Homer, B. D. (2012). Emotional design in multimedia learning. *J. Educ. Psych.*, 104(2). https://doi.org/10.1037/a0026609
- Valdez, P., & Mehrabian, A. (1994). Effects of color on emotions. *JEP: General*, 123(4). https://doi.org/10.1037/0096-3445.123.4.394
- van Gog, T., Verveer, I., & Verveer, L. (2014). Learning from video modeling examples: Effects of seeing the human model's face. *Computers & Education*, 72. https://doi.org/10.1016/j.compedu.2013.11.004
- Van Gerven, P. W. M., Paas, F., van Merriënboer, J. J. G., & Schmidt, H. G. (2002). Cognitive load theory and aging: Effects of worked examples on training efficiency. *Learning & Instruction*, 12(1). https://doi.org/10.1016/S0959-4752(01)00020-2
- Van Gerven, P. W. M., Paas, F., van Merriënboer, J. J. G., Hendriks, M., & Schmidt, H. G. (2003). The efficiency of multimedia learning into old age. *Br. J. Educ. Psych.*, 73(4). https://doi.org/10.1348/000709903322591208
- Wang, F., Li, W., Mayer, R. E., & Liu, H. (2018). Animated pedagogical agents as aids in multimedia learning. *J. Educ. Psych.*, 110(2). https://doi.org/10.1037/edu0000221
- Wilms, L., & Oberfeld, D. (2018). Color and emotion: Effects of hue, saturation, and brightness. *Psych. Research*, 82. https://doi.org/10.1007/s00426-017-0880-8
- Wilson, K., & Korn, J. H. (2007). Attention during lectures: Beyond ten minutes. *Teaching of Psych.*, 34(2). https://doi.org/10.1080/00986280701291291
- Wingfield, A., Tun, P. A., Koh, C. K., & Rosen, M. J. (1999). Regaining lost time: Adult aging and the effect of time restoration on recall of time-compressed speech. *Psych. & Aging*, 14(3). https://doi.org/10.1037/0882-7974.14.3.380
- Wisniewski, B., Zierer, K., & Hattie, J. (2020). The power of feedback revisited: A meta-analysis. *Front. Psych.*, 10. https://doi.org/10.3389/fpsyg.2019.03087
- Wong, R. M., & Adesope, O. O. (2021). Meta-analysis of emotional designs in multimedia learning. *Educ. Psych. Rev.*, 33. https://doi.org/10.1007/s10648-020-09545-x
- Yeager, D. S., Dahl, R. E., & Dweck, C. S. (2018). Why interventions to influence adolescent behavior often fail but could succeed. *Perspect. Psych. Sci.*, 13(1). https://doi.org/10.1177/1745691617722620
