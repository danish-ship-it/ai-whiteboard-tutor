I’ll read the brief and relevant project notes, then work through the screen layouts, design tokens, and whiteboard rules.


I’m applying the `ui-design-system` skill. The direction is a warm, editorial teaching desk: crisp controls, an off-white board, and restrained marker colours. I’m also checking mobile legibility and error-state coverage.


The main risk is mobile board text: a desktop-sized label becomes unreadable when the SVG shrinks to 358 pixels wide. I’m setting a minimum source size of 72 units and keeping labels fully opaque when earlier drawings dim. I’m also defining ready-to-play, captions-only, and mobile question-sheet states so playback behaviour is unambiguous.


The layouts now fit both reference frames, including the mobile outline above the fixed question dock. The ink colours and primary UI text pairs pass the contrast checks. I’m finishing the playback and recovery rules, including how a follow-up drawing fits without covering the lesson.


# 1) Design concept

Chalk feels like a thoughtful tutor’s working desk: warm paper, dark ink, precise controls, and ideas drawn in front of you. An editorial serif gives the opening screen personality; the lesson player becomes quieter so the whiteboard commands attention. Forest-green controls, numbered lesson steps, and small handwritten marks create a recognisable identity without decorative clutter. The visual rhythm follows teaching: introduce one element, connect it to another, then leave the finished explanation visible.

# 2) Design tokens

## Colour

Use semantic CSS variables. Light is the initial theme; the theme toggle changes the chrome while preserving the whiteboard’s colours.

### App chrome

| Token | Light | Dark | Use |
|---|---|---|---|
| `--app-bg` | `#F2F0E8` | `#171C19` | Page background |
| `--surface` | `#FFFFFF` | `#202722` | Header, panels, captions, transport |
| `--surface-raised` | `#F8F6EF` | `#2B342D` | Hover surfaces, menus, user messages |
| `--text` | `#232824` | `#F3F4EB` | Primary text |
| `--text-muted` | `#5B625C` | `#B7C1B7` | Supporting text, placeholders, timestamps |
| `--divider` | `#D4D8CF` | `#3B473D` | Decorative separators |
| `--border-control` | `#7B8379` | `#7F9082` | Input boundaries, unselected controls |
| `--action` | `#255A46` | `#BCE0B7` | Primary button background, active indicator |
| `--on-action` | `#FFFFFF` | `#172318` | Primary button text and icons |
| `--action-hover` | `#194735` | `#CDEBC9` | Primary button hover |
| `--action-pressed` | `#123828` | `#A3CB9E` | Primary button pressed |
| `--selected-bg` | `#E2EDE3` | `#304C38` | Current outline row, selected option |
| `--focus` | `#255A46` | `#BCE0B7` | Focus ring |
| `--disabled-bg` | `#E5E7DF` | `#303A32` | Disabled controls |
| `--disabled-text` | `#5B625C` | `#AEB8AE` | Disabled labels and icons |
| `--danger` | `#9E352B` | `#FFB5A7` | Error text, error border |
| `--danger-bg` | `#FBEDE9` | `#442922` | Error notice background |
| `--warning` | `#765609` | `#F1CF7E` | Offline and voice-warning text |
| `--warning-bg` | `#FFF3CC` | `#3F351F` | Warning notice background |
| `--spoken-bg` | `#DCE9DC` | `#415B43` | Current caption word |
| `--spoken-text` | `#1F4937` | `#FFFFFF` | Current caption word text |

Primary text, supporting text, placeholders, and button labels meet the 4.5:1 normal-text contrast requirement in their specified pairings. Calculated examples: light muted text on the page is **5.50:1**; dark muted text on a panel is **8.24:1**; primary button labels are **7.99:1 light** and **11.23:1 dark**. Contrast requirements follow [WCAG’s contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

Do not use `--divider` to identify an input boundary or essential icon; use `--border-control`.

### Whiteboard and marker inks

These tokens remain identical in both themes.

| Token | Hex | Contrast on board | Meaning |
|---|---|---:|---|
| `--board` | `#FFFCF5` | — | Board surface |
| `--board-border` | `#A9AEA3` | — | Inset board boundary |
| `--ink-graphite` | `#262A28` | 14.19:1 | Main structure, neutral labels |
| `--ink-blue` | `#2356A8` | 6.91:1 | Inputs, first term, first relationship |
| `--ink-green` | `#21654B` | 6.77:1 | Result, valid relationship |
| `--ink-brick` | `#A13D32` | 6.35:1 | Contrast, exception, quantity being solved |
| `--ink-ochre` | `#765609` | 6.60:1 | Attention, intermediate step |
| `--ink-teal` | `#17666E` | 6.48:1 | Second term, parallel relationship |

All six inks meet AA for normal-size text on the board.

Use these solid highlight fills, equivalent to approximately 8% ink over the board:

| Graphite | Blue | Green | Brick | Ochre | Teal |
|---|---|---|---|---|---|
| `#EEEBE5` | `#EDEFEF` | `#EDF0E7` | `#F7EDE5` | `#F4EFE2` | `#ECF0EA` |

Text over a highlight uses its corresponding ink or graphite at **100% opacity**.

## Typography

Google Fonts families:

- [Newsreader](https://fonts.google.com/specimen/Newsreader): wordmark and opening headline; weights 400 and 500.
- [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans): interface, captions, and board labels; weights 400, 500, and 600.
- [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono): timestamps, step numbers, keyboard keys, and equations; weights 400 and 500.

Fallbacks: `Georgia, serif`; `Arial, sans-serif`; `monospace`, respectively. Self-host the selected font files through the Next.js font pipeline.

Sizes below are `font-size / line-height / weight`.

| Style | Desktop | Mobile | Family |
|---|---|---|---|
| Wordmark | `30 / 32 / 500` | Same | Newsreader |
| Home headline | `56 / 60 / 400` | `40 / 44 / 400` | Newsreader |
| Generating topic | `48 / 56 / 400` | `32 / 40 / 400` | Newsreader |
| Margin statement | `32 / 40 / 400` | Hidden | Newsreader |
| Lesson title | `24 / 28 / 600` | `20 / 24 / 600` | Instrument Sans |
| Panel heading | `20 / 28 / 600` | Same | Instrument Sans |
| Section heading | `16 / 24 / 600` | Same | Instrument Sans |
| Home input | `20 / 28 / 400` | `18 / 26 / 400` | Instrument Sans |
| Body/input/message | `16 / 24 / 400` | Same | Instrument Sans |
| Caption | `18 / 28 / 500` | `16 / 22 / 500` | Instrument Sans |
| Button/chip | `14 / 20 / 600` | Same | Instrument Sans |
| Supporting text | `14 / 20 / 400` | Same | Instrument Sans |
| Small label | `12 / 16 / 500` | Same | Instrument Sans |
| Time/counter/key | `12 / 16 / 400` | Same | IBM Plex Mono |
| Desktop transport time | `13 / 20 / 400` | — | IBM Plex Mono |
| Board title | `88 / 104 / 600` SVG units | Scales with board | Instrument Sans |
| Board label | `72 / 88 / 600` SVG units | Scales with board | Instrument Sans |
| Board equation | `80 / 96 / 500` SVG units | Scales with board | IBM Plex Mono |

Use sentence case. Uppercase is reserved for short labels such as `YOU`, `CHALK`, and `TRY A TOPIC`, with `0.08em` tracking. Headlines use `-0.025em`; other text uses normal tracking.

## Spacing, radii, borders, and elevation

- Spacing scale: **0, 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96 px**.
- Desktop page gutters: **32 px**.
- Mobile page gutters: **16 px**.
- Control height and minimum pointer target: **44 px**.
- Icon drawing size: **20 × 20 px**, centred in its target.
- Border widths: **1 px** standard; **2 px** invalid input; **3 px** current-step indicator.
- Radii: **4 px** keycaps and caption highlights; **8 px** buttons, chips, menus, messages; **12 px** prompt and player shell; **16 px** mobile sheet’s top corners.
- Circular radii are reserved for the timeline thumb and small status dots.

| Elevation | Light | Dark |
|---|---|---|
| Flat | None | None |
| Board/panel | `0 2px 0 rgba(35,40,36,0.08)` | `0 2px 0 rgba(0,0,0,0.32)` |
| Popover | `0 8px 24px rgba(35,40,36,0.14)` | `0 8px 24px rgba(0,0,0,0.36)` |
| Sheet | `0 -8px 32px rgba(35,40,36,0.16)` | `0 -8px 32px rgba(0,0,0,0.40)` |

Modal scrim: `rgba(23,28,25,0.48)`. No blur.

Focus ring: **2 px `--focus`**, separated from the component by a **2 px surface-coloured gap**. On the whiteboard, use the light-theme focus colour.

## Motion

| Event | Duration | Easing |
|---|---:|---|
| Button/chip hover | 120 ms | `cubic-bezier(0.2,0,0,1)` |
| Press feedback | 80 ms | `ease-out` |
| Popover entry/exit | 120 ms | `cubic-bezier(0.2,0,0,1)` |
| Theme colour transition | 180 ms | `ease-out` |
| Sheet entry | 240 ms | `cubic-bezier(0.2,0.8,0.2,1)` |
| Sheet exit | 180 ms | `cubic-bezier(0.4,0,1,1)` |
| Current-element emphasis | 120 ms | `ease-out` |
| Board stroke reveal | 180–700 ms, constrained by narration cue | `linear` |
| Board label appearance | 120 ms | `ease-out` |
| Generating underline traversal | 900 ms, repeating | `ease-in-out` |

Reduced motion removes travel, stroke animation, and fades. Elements appear complete at their scheduled narration cue; audio and caption timing remain unchanged.

# 3) Screens and states at 1440 desktop and 390 mobile

## Frame conventions

- Desktop reference frame: **1440 × 1000 px**.
- Mobile reference frame: **390 × 844 px**.
- Coordinates use **`(x, y, width, height)`**, measured from the frame’s top-left.
- Coordinates are global unless explicitly marked **local**.
- Borders are inset and do not change the stated dimensions.
- Reference frames use 100% text scaling and no browser chrome. On devices with safe-area insets, add the inset to bottom docks and sheets.
- Fixed heights describe the reference composition. Text enlargement allows text regions to grow and the page to scroll.
- State variants inherit all geometry except the changes explicitly specified.

Create every screen family in both widths and both theme modes. Use names such as `Desktop / Player / Playing / Light` and `Mobile / Questions / Error / Dark`.

### Responsive rules between reference widths

- **1280 px and above:** two-column lesson layout; 384 px right rail, 32 px gap, 32 px page gutters. Main width is `viewport − 480px`.
- **768–1279 px:** single column, maximum width 960 px, centred; 32 px outer gutters; outline below transport; questions use the bottom sheet.
- **Below 768 px:** 16 px gutters; mobile transport and bottom sheet.
- Board width always follows its available column and height remains exactly `width × 9 / 16`.
- Home’s margin statement disappears below 1280 px.
- No whole-page horizontal scrolling.

## Shared header

| Element | Desktop | Mobile |
|---|---|---|
| Header | `(0,0,1440,64)` | `(0,0,390,56)` |
| Home/brand target | `(32,10,120,44)` | `(16,6,120,44)` |
| Theme button | `(1308,10,44,44)` | `(274,6,44,44)` |
| Help button | `(1364,10,44,44)` | `(330,6,44,44)` |

Header uses `--surface`, with a 1 px bottom divider.

Brand: a 24 px drawn right-angle mark followed by **“Chalk”**. The mark is two rounded SVG strokes, 2 px wide; use `--action`. The wordmark uses `--text`.

Theme button:

- Light theme: outlined moon icon; accessible label **“Use dark theme”**.
- Dark theme: outlined sun icon; accessible label **“Use light theme”**.
- Persist the choice locally.

Help button: outlined keyboard icon; accessible label **“Keyboard shortcuts”**.

Icons use a 24-unit SVG grid, 1.75-unit strokes, rounded joins and caps. No emoji.

### Keyboard-help popover

- Desktop: **`(1096,64,312,272)`**.
- Mobile: **`(62,56,312,272)`**.
- Surface background, control border, 8 px radius, popover shadow.
- Local heading: `(16,16,224,24)`, **“Keyboard shortcuts”**.
- Local close target: `(256,8,44,44)`, accessible label **“Close shortcuts”**.
- Four rows at local `y = 64, 100, 136, 172`, each `(16,y,280,32)`:

| Key | Copy |
|---|---|
| `Space` | Play / pause |
| `←` `→` | Previous / next step |
| `R` | Restart lesson |
| `Esc` | Close an open panel |

Footer at `(16,224,280,32)`: **“Playback shortcuts work when the player is focused.”**

Clicking the board focuses the player region. Playback shortcuts do not intercept typing, native button activation, menus, or timeline controls. Escape closes the active overlay. Closing restores focus to the opener.

## Home

### Base layout

| Element | Desktop | Mobile |
|---|---|---|
| Kicker | `(96,152,864,20)` | `(16,96,358,16)` |
| Headline | `(96,196,864,120)` | `(16,132,358,88)` |
| Prompt container | `(96,348,864,184)` | `(16,244,358,184)` |
| Text entry area | `(116,368,824,80)` | `(32,260,326,80)` |
| Counter | `(116,492,100,20)` | `(32,384,100,20)` |
| Submit button | `(788,472,152,44)` | `(206,368,152,44)` |
| Validation slot | `(96,540,864,20)` | `(16,436,358,40)` |
| Explanation | `(96,584,864,24)` | `(16,496,358,48)` |
| Examples label | `(96,636,864,16)` | `(16,576,358,16)` |

Copy:

- Kicker: **“A LESSON IN TWO MINUTES”**
- Headline, with an explicit line break:  
  **“What do you want**  
  **to learn?”**
- Input accessible label: **“What do you want to learn?”**
- Placeholder: **“A topic, a question, a thing that never clicked.”**
- Submit: **“Make a lesson”**, followed by a 16 px right arrow.
- Counter: **“0 / 200”**
- Desktop-only keyboard hint at `(232,492,160,20)`: **“Enter to start”**
- Explanation: **“A tutor talks. The board draws. You can ask why.”**
- Examples label: **“TRY A TOPIC”**

The prompt uses `--surface`, a 1 px control border, and 12 px radius. The textarea itself has no separate visible border.

### Example chips

Desktop: two columns, each 424 px wide.

| Copy | Desktop | Mobile |
|---|---|---|
| How does a neural network learn? | `(96,664,424,44)` | `(16,604,358,44)` |
| Pythagorean theorem | `(536,664,424,44)` | `(16,656,358,44)` |
| Photosynthesis | `(96,720,424,44)` | `(16,708,358,44)` |
| How TCP handshakes work | `(536,720,424,44)` | `(16,760,358,44)` |

Each chip has 12 px horizontal padding, left-aligned text, an 8 px radius, and a 1 px control border. Clicking a chip fills and focuses the prompt; it does not submit.

### Desktop margin statement

- Vertical green rule: `(1040,348,2,184)`.
- Statement: `(1064,348,264,120)`, Newsreader 32/40:

  **“See it.**  
  **Hear it.**  
  **Ask why.”**

- Supporting copy: `(1064,492,264,48)`:

  **“A tutor’s voice and a board that keeps up.”**

This region is absent on mobile.

### Home states

| State | Exact treatment |
|---|---|
| Empty | Placeholder and `0 / 200`; submit remains enabled so validation is discoverable. |
| Focused | Apply focus ring around the entire prompt container. |
| Populated | Reference text: **“Pythagorean theorem”**. Counter updates to the character count. |
| Empty submission | Danger border; inline **“Enter a topic to start.”** Focus stays in the textarea. |
| Too long | Allow entry beyond 200 characters; counter and border become danger-coloured. Inline **“Keep your topic to 200 characters or fewer.”** Submission is prevented. |
| Valid submission | Immediately transition to Generating with the entered topic retained. |
| Offline | Input remains editable; submit is disabled; show the shared offline notice. |

Count user-perceived characters. Trim leading/trailing whitespace for validation. Enter submits; Shift+Enter inserts a line break. The validation slot stays reserved in every state to avoid moving the examples.

## Generating

### Layout

| Element | Desktop | Mobile |
|---|---|---|
| Kicker | `(96,168,864,20)` | `(16,96,358,20)` |
| Topic | `(96,208,864,112)` | `(16,132,358,80)` |
| Stage list | `(96,352,864,264)` | `(16,244,358,264)` |
| Timing/status copy | `(96,640,864,48)` | `(16,532,358,48)` |
| Cancel | `(96,704,112,44)` | `(16,596,112,44)` |

Kicker: **“PREPARING YOUR LESSON”**  
Reference topic: **“Pythagorean theorem”**  
Timing copy: **“Usually 10–25 seconds.”**  
Button: **“Cancel”**

The topic wraps without truncation. If it exceeds the reserved height, grow the topic block by complete line heights and shift everything below it by the same amount.

Desktop retains the Home margin statement at its original coordinates.

### Stage rows

Each row is 88 px high, separated by a 1 px divider. Local row structure:

- Number/check: `(16,20,32,32)`.
- Title: `(64,12,width−140,24)`.
- Supporting text: `(64,40,width−140,40)`.
- Status: `(width−60,16,44,20)`, right-aligned.
- Active indicator: 3 px vertical line along the row’s left edge.

| Number | Exact title | Supporting text |
|---|---|---|
| 01 | Planning the lesson | Finding a clear path through the idea. |
| 02 | Drawing the board | Laying out the diagrams and steps. |
| 03 | Recording the voice | Matching the voice to the board. |

States:

- **Pending:** number in a thin outlined square; status **“Next”**; muted text.
- **Current:** number in action-coloured square with `--on-action` text; status **“Now”**; title semibold. An 80 px marker stroke traverses a 160 px path along the row’s lower edge.
- **Complete:** check replaces number; status **“Done”**; no movement.

Create separate Planning, Drawing, and Recording frames using these states. Advance only from actual stage events; show no estimated percentage.

Additional variants:

- **Slow, after 30 seconds:** replace timing copy with **“This is taking a little longer. You can keep waiting or cancel.”**
- **Cancelling:** Cancel becomes **“Stopping…”**, disabled. Return to Home with the topic preserved and ignore late completion events.
- **Finished:** open Player / Ready. Do not begin audio automatically.

## Lesson player

The reference lesson is an illustrative **2:00 Pythagorean theorem lesson**. The reference playing frame is at **01:08**, in step 3.

### Desktop layout

| Region | Rectangle |
|---|---|
| Title region | `(32,96,960,48)` |
| Whiteboard | `(32,160,960,540)` |
| Caption strip | `(32,700,960,80)` |
| Transport | `(32,780,960,112)` |
| Context/completion strip | `(32,912,960,56)` |
| Lesson outline | `(1024,96,384,256)` |
| Questions panel | `(1024,368,384,600)` |

Board, caption strip, and transport share one 12 px-radius shell. Only the board’s top corners are rounded; only the transport’s bottom corners are rounded. Separators are inset 1 px lines.

Title:

- `(32,96,720,28)`: **“Pythagorean theorem”**
- `(32,128,720,16)`: **“2:00 lesson · 4 steps”**
- `(864,98,128,44)`: secondary **“New topic”**

Context strip:

- `(48,930,928,20)`: **“Step 3 of 4 · Add the squares”**

### Mobile layout

| Region | Rectangle |
|---|---|
| Title region | `(16,72,358,48)` |
| Whiteboard | `(16,136,358,201.375)` |
| Caption strip | `(16,337.375,358,80)` |
| Transport | `(16,417.375,358,104)` |
| Lesson outline | `(16,537.375,358,224)` |
| Fixed question dock | `(0,776,390,68)` |

Title:

- `(16,72,250,24)`: **“Pythagorean theorem”**
- `(16,100,250,20)`: **“2:00 · 4 steps”**
- `(278,74,96,44)`: secondary **“New topic”**

Long mobile titles use two 24 px lines and replace the metadata line. Desktop titles truncate to one line. A truncated title becomes a text-styled button labelled **“View full topic”**; activation opens a surface popover below it:

- Desktop: `(32,152,480,auto)`.
- Mobile: `(16,128,358,auto)`.
- Padding 16 px, body 16/24, maximum height 240 px, internal scrolling.

### Whiteboard

Use SVG `viewBox="0 0 1600 900"`, with the surface colour from Section 2. Preserve the exact 16:9 aspect ratio.

The sample drawing, its staged reveal, and follow-up annex are specified in Section 5.

### Captions

Desktop:

- Label `(48,712,928,16)`: **“TUTOR”**
- Sentence `(48,736,928,28)`

Mobile:

- Sentence `(28,344.375,334,66)`
- No visible speaker label.

Reference sentence:

**“The square on the longest side equals the sum of the squares on the other two sides.”**

Reference spoken word: **“sum”**.

Highlight the current word with `--spoken-bg`, `--spoken-text`, a 2 px underline, and 2 px horizontal padding. Reserve this padding consistently so highlighting never changes line wrapping. Keep caption font weight constant.

Mobile permits three lines. Split longer sentences into synchronized continuation chunks at phrase boundaries; never clip or shrink the caption. Expose the complete sentence to assistive technology. Do not announce every spoken word through a live region.

### Transport

#### Desktop

| Control | Rectangle |
|---|---|
| Play/pause | `(48,796,44,44)` |
| Restart | `(100,796,44,44)` |
| Previous step | `(152,796,44,44)` |
| Next step | `(204,796,44,44)` |
| Elapsed/total | `(268,808,144,20)` |
| Current segment | `(432,808,400,20)` |
| Speed | `(884,796,92,44)` |
| Timeline hit area | `(48,844,928,44)` |

Copy:

- Time: **“01:08 / 02:00”**
- Segment: **“Add the squares”**
- Speed: **“1×”**, followed by a downward chevron.

#### Mobile

| Control | Rectangle |
|---|---|
| Timeline hit area | `(28,417.375,334,44)` |
| Play/pause | `(24,465.375,44,44)` |
| Restart | `(68,465.375,44,44)` |
| Previous step | `(112,465.375,44,44)` |
| Next step | `(156,465.375,44,44)` |
| Elapsed/total | `(204,477.375,82,20)` |
| Speed | `(294,465.375,72,44)` |

Mobile time copy: **“1:08 / 2:00”**. Hide the redundant segment name.

Control accessible labels and desktop tooltips:

- **“Play lesson”** / **“Pause lesson”**
- **“Restart lesson”**
- **“Previous step”**
- **“Next step”**
- **“Playback speed”**

#### Timeline

- Rail: 4 px high; desktop `y=864`, mobile `y=437.375`.
- Unplayed rail: `--border-control`.
- Played rail: `--action`.
- Thumb: 12 px circle, action fill, 2 px surface-coloured outline.
- Segment marks: 2 × 12 px, centred on the rail.
- The entire 44 px-high region is the slider target.

For the reference lesson:

| Segment start | Desktop x | Mobile x |
|---|---:|---:|
| 00:00 | 48 | 28 |
| 00:24 | 233.6 | 94.8 |
| 00:58 | 496.533 | 189.433 |
| 01:32 | 759.467 | 284.067 |

At 01:08, the thumb is at desktop **x=573.867**, mobile **x=217.267**.

Hovering within 12 px of a marker shows its title and timestamp. Slider focus shows the current segment; dragging shows the destination segment and time.

Tooltip:

- Size: **248 × 48 px**.
- Positioned 8 px above the timeline hit area.
- Centre on the relevant marker/thumb, clamped to the player’s horizontal padding.
- Reference copy: **“Add the squares · 00:58”**.
- Surface background, control border, 8 px radius, popover shadow.

Markers are visual features within one slider, avoiding overlapping interactive targets. The outline supplies individual segment buttons.

Slider keyboard controls: arrows seek 5 seconds; Home seeks to start; End seeks to finish. Global step shortcuts are inactive while the slider has focus.

#### Speed menu

- Desktop: `(864,640,112,148)`.
- Mobile: `(254,309.375,112,148)`.
- Padding: 8 px vertically.
- Three 44 px rows: **“1×”**, **“1.25×”**, **“1.5×”**.
- Selected option has a leading check and selected background.
- Arrow keys navigate; Enter selects; Escape closes.
- Changing speed retains the current timestamp and updates audio, captions, and drawing together.

### Outline

| Element | Desktop | Mobile |
|---|---|---|
| Heading | `(1040,112,240,24)` | `(28,549.375,240,20)` |
| Step count | `(1336,116,56,20)` | `(314,549.375,48,20)` |
| Rows | `x=1040, w=352, h=44` | `x=28, w=334, h=44` |
| Row y positions | `148,196,244,292` | `577.375,621.375,665.375,709.375` |

Heading: **“Lesson outline”**. Count: **“3 / 4”**.

| Step | Title | Timestamp |
|---|---|---|
| 01 | Meet the triangle | 00:00 |
| 02 | Name the sides | 00:24 |
| 03 | Add the squares | 00:58 |
| 04 | Try 3, 4, 5 | 01:32 |

Within each row:

- Index/check: local `(12,14,16,16)`.
- Title: local `(40,12,width−148,20)`.
- Current label: local `(width−92,12,32,20)`, **“Now”**.
- Timestamp: local `(width−56,12,44,20)`.

States:

- Future: numbered, normal surface.
- Earlier: check replaces number.
- Current: selected background, 3 px left indicator, **“Now”**, semibold title.
- Hover: raised surface.
- Focus: standard focus ring.

Selecting an outline row seeks to its start and preserves the playing/paused state.

### Playback state variants

| State | Required visual and behaviour |
|---|---|
| Ready | Board title only. Centred primary **“Start lesson”** button, 160 × 44. Desktop `(432,408,160,44)`; mobile `(115,214.688,160,44)`. Caption reads **“Press play. We’ll take it one step at a time.”** Transport shows Play. |
| Playing | No central overlay. Pause icon shown. Board, captions, time, and outline follow the same playback clock. |
| Paused | Freeze drawing and caption position; show Play. Do not cover the board with a large overlay. |
| Scrubbing | Pause audio while dragging; preview the board and caption at the destination. Resume on release only if previously playing. |
| Previous/next | Seek to the adjacent segment’s start; preserve playing/paused state. Previous is disabled in step 1; next is disabled in step 4. |
| Restart | Seek to 00:00 and preserve playing/paused state. Do not regenerate the lesson. |
| Seek backward | Remove elements whose reveal time is after the destination; restore earlier highlights correctly. |
| End reached | Stop the clock at 02:00 and show Lesson complete. |

## Follow-up questions

### Desktop panel

Panel: `(1024,368,384,600)`.

| Element | Rectangle |
|---|---|
| Heading | `(1040,384,352,28)` |
| Supporting line | `(1040,416,352,20)` |
| Scrollable messages | `(1040,456,352,288)` |
| Suggested chips | `(1040,760,352,44)` |
| Composer | `(1040,820,352,128)` |

Copy:

- Heading: **“Questions”**
- Supporting line: **“Ask about this lesson.”**
- Suggestions: **“Show an example”**, **“Explain it simply”**

The suggestion row uses two 172 px chips with an 8 px gap.

### Mobile collapsed dock

Dock: `(0,776,390,68)`, surface background, top divider.

Button: `(16,784,358,44)`, **“Ask a question”**, upward chevron aligned 12 px from the right edge.

Opening the sheet pauses playback. Closing leaves playback paused.

### Mobile expanded sheet

Sheet: **`(0,280,390,564)`**. Apply scrim to the rest of the app; background becomes inert.

Local coordinates:

| Element | Local rectangle |
|---|---|
| Handle | `(175,8,40,4)` |
| Heading | `(16,24,288,28)` |
| Close target | `(330,12,44,44)` |
| Messages viewport | `(16,80,358,248)` |
| Suggestions | `(16,344,358,44)` |
| Composer | `(16,404,358,128)` |

Heading: **“Questions”**. Close accessible label: **“Close questions”**.

Suggestions are 175 px wide, separated by 8 px.

Opening focuses the sheet heading without summoning the keyboard. Tapping the input opens the keyboard. Trap focus within the sheet; Escape or Close dismisses it and restores focus to the opener.

### Mobile keyboard frame

Reference keyboard occupies `(0,544,390,300)`; it is OS UI, not app artwork.

With visual viewport height `H=544`:

- Sheet: `(0,56,390,488)`.
- Header: `(0,56,390,56)`.
- Messages: `(16,128,358,256)`.
- Composer: `(16,400,358,128)`.
- Suggestions are hidden.

For other keyboard heights, composer top is `H−144`; messages height is `max(0,H−288)`. Keep header and composer pinned; scroll only the message region. Use visual-viewport measurements, not an assumed keyboard height.

### Composer anatomy

Local to its 128 px-high frame:

- Textarea: `(12,12,width−24,48)`.
- Hint: `(12,80,width−80,32)`.
- Send target: `(width−56,72,44,44)`.

Copy:

- Placeholder: **“Ask about this lesson…”**
- Hint: **“Enter to send · Shift+Enter for a new line”**
- Send accessible label: **“Send question”**

Textarea uses 16/24 text, two visible lines, then internal scrolling. The enclosing composer has a 1 px control border and 8 px radius.

States:

- Empty: Send disabled.
- Draft: Send enabled.
- Focus: enclosing focus ring.
- Sending: clear the sent text; allow drafting another question; disable Send until the outstanding answer resolves.
- Offline: preserve the draft; disable Send.
- Sending hint: **“Thinking… You can draft your next question.”**

Suggestion chips populate and focus the input; they do not send immediately.

### Message states and exact sample copy

Coordinates below are local to the message viewport. Use the same arrangement at both widths; substitute the viewport’s width.

**Empty**

- Green 3 px rule at `(0,24,3,112)`.
- Heading `(16,24,width−16,28)`: **“Keep the question going.”**
- Body `(16,64,width−16,48)`: **“Ask about a step, or try another example.”**

**User message**

- Label `(40,0,width−40,16)`: **“YOU”**
- Bubble `(40,20,width−40,72)`, raised surface, 8 px radius.
- Inner padding: 12 px.
- Copy: **“What if the two shorter sides are 5 and 12?”**

**Tutor loading**

- Label `(0,108,width,16)`: **“CHALK”**
- At `y=132`: 16 px animated marker stroke, followed by **“Working through your question…”**
- Reduced motion uses a static stroke.
- Announce the loading state once.

**Tutor answer**

- Label remains at `y=108`.
- Answer `(0,132,width,72)`, with these reference line breaks:

  **“If 5 and 12 are the two short sides,**  
  **then c² = 25 + 144 = 169.**  
  **So the longest side is 13.”**

Ordinary answers stop here.

**Answer with drawing**

- Additional line `(0,216,width,20)`: **“I drew this on the board.”**
- Secondary button `(0,244,136,44)`: **“View drawing”**
- Add the annex specified in Section 5 when the answer resolves.
- On mobile, the answer-state reference uses message scroll offset **40 px**, keeping View drawing visible.
- View drawing closes the sheet, leaves playback paused, and applies current-element emphasis to the annex.

**Failed answer**

Replace the tutor answer area with a danger panel at `(0,132,width,120)`:

- Copy `(12,12,width−24,40)`:  
  **“I couldn’t answer that.**  
  **Your question is saved.”**
- Button `(12,64,112,44)`: **“Try again”**

Retry replaces this panel with the loading state and reuses the original question. Do not insert a duplicate user message.

For longer histories, messages use natural height with 16 px spacing. Scroll to a new answer only when the learner is already at the bottom. Otherwise show a **“New reply”** button, 128 × 44 px, horizontally centred and 8 px above the viewport’s lower edge.

Sending a question pauses desktop playback. Receiving a response never starts playback.

## Lesson complete

Restore all lesson strokes to full opacity; remove current-element highlighting. Keep the fully drawn board, outline, captions, and questions available.

Transport time becomes **“02:00 / 02:00”** desktop and **“2:00 / 2:00”** mobile. Play becomes a replay icon with accessible label **“Replay lesson”**.

### Desktop

Replace the context strip with:

- Container: `(32,912,960,56)`, selected background.
- Check icon: `(48,930,20,20)`.
- Copy: `(80,928,500,24)`, **“Lesson complete. What clicked?”**
- Primary **“Replay”**: `(620,918,104,44)`.
- Secondary **“Ask a question”**: `(736,918,144,44)`.

New topic remains at the top. Ask a question focuses the desktop composer.

### Mobile

Insert a completion panel at **`(16,537.375,358,88)`**:

- Heading `(28,549.375,220,24)`: **“Lesson complete”**
- Supporting copy `(28,581.375,220,40)`: **“Ask a question or try another topic.”**
- Primary **“Replay”**: `(266,565.375,96,44)`.

Move the outline to **`(16,641.375,358,224)`**. The page scrolls and has 84 px bottom padding so all outline rows can move above the fixed dock.

The question dock becomes action-coloured, making **“Ask a question”** the next visual focus. Do not automatically focus the textarea or open the keyboard.

Replay seeks to zero and starts playback. New topic returns to an empty Home form. Retain the existing lesson in navigation history.

## Error states

### Generation failed

Retain the Generating header and topic. Replace the stage list with an error panel.

| Element | Desktop | Mobile |
|---|---|---|
| Panel | `(96,352,864,216)` | `(16,244,358,232)` |
| Heading | `(120,376,816,28)` | `(32,264,326,56)` |
| Body | `(120,420,816,48)` | `(32,332,326,48)` |
| Try again | `(120,500,120,44)` | `(32,404,144,44)` |
| Change topic | `(252,500,144,44)` | `(188,404,170,44)` |

Panel: danger background, 4 px danger top rule, 8 px radius.

Copy:

- **“We couldn’t make this lesson.”**
- **“Your topic is saved. Try again, or change the topic.”**
- Primary: **“Try again”**
- Secondary: **“Change topic”**

Try again returns to Planning with the same topic. Change topic returns to populated Home and focuses the prompt. Remove the generating estimate and Cancel button in this state.

### Voice failed

Keep the generated board and lesson data.

Desktop warning:

- `(32,160,960,80)`
- Heading `(80,172,500,24)`: **“The voice couldn’t load.”**
- Body `(80,200,500,20)`: **“The board and captions are ready.”**
- Warning icon `(48,180,20,20)`.
- CTA `(768,178,208,44)`: **“Continue with captions”**

Move the desktop board and everything below it in the main column down **96 px**. The right rail stays in place.

Mobile warning:

- `(16,136,358,136)`
- Heading `(32,148,326,24)`.
- Body `(32,180,326,20)`.
- CTA `(32,212,208,44)`.

Move the mobile board, captions, transport, and outline down **152 px**. The dock stays fixed; the page scrolls.

Until Continue is selected, playback is paused. Continue removes the notice, restores the normal layout, and starts or resumes a silent timeline using the generated cue timings. Replace title metadata with **“Captions only · 2:00”**. Speed, seeking, and completion still work.

### Network offline

Insert a notice directly below the shared header.

| Element | Desktop | Mobile |
|---|---|---|
| Notice | `(0,64,1440,56)` | `(0,56,390,80)` |
| Icon | `(32,82,20,20)` | `(16,72,20,20)` |
| Copy | `(64,82,1180,20)` | `(48,68,210,56)` |
| Retry button | `(1292,70,116,44)` | `(282,74,92,44)` |

Copy:

- Desktop: **“You’re offline. Loaded lessons still play.”**
- Mobile: **“You’re offline. Loaded lessons still play.”**
- Button: **“Try again”**

Use warning colours. Shift normal document content down **56 px desktop** or **80 px mobile**. Fixed bottom docks remain anchored; sheets retain their viewport-based positioning.

Behaviour by context:

| Context | Offline behaviour |
|---|---|
| Home | Preserve topic; disable Make a lesson. |
| Generating | Preserve completed stages; current status becomes **“Waiting”**. Supporting copy becomes **“Waiting for a connection…”**. Cancel remains available. |
| Fully loaded lesson | Playback, captions, seeking, and speed remain available. |
| Lesson missing required media | Pause at the available position; notice copy becomes **“You’re offline. Reconnect to continue this lesson.”** |
| Follow-up draft | Preserve draft; disable Send. |
| Follow-up request interrupted | Keep the question and show **“Connection lost. Your question is saved.”** with **“Try again”** in its response slot. |

After reconnection, dismiss the global notice. Reconcile any existing generation job before restarting it. Follow-up retry reuses the original question.

# 4) Component inventory

| Component | Variants | Sizes | States and rules |
|---|---|---|---|
| `AppHeader` | Light, dark; desktop, mobile | 64 or 56 px high | Sticky; theme and help controls |
| `BrandLink` | Light, dark | 120 × 44 | Rest, hover, focus |
| `Button` | Primary, secondary, ghost, danger | 44 px high; widths specified per screen | Rest, hover, pressed, focus, disabled, busy |
| `IconButton` | Ghost, filled | 44 × 44; icon 20 × 20 | Tooltip on hover/focus; accessible label required |
| `TopicPrompt` | Empty, populated, invalid | 864 × 184; 358 × 184 | Focus encloses full component; counter and validation remain visible |
| `TopicChip` | Home, follow-up | 44 px high; 424/358/172/175 px wide | Rest, hover, focus, pressed, disabled |
| `InlineValidation` | Empty, error | 20 px desktop; 40 px mobile reserved | Icon plus text; connected to input with `aria-describedby` |
| `TopicTitle` | Short, wrapped, truncated | Screen-specific | Truncation exposes full-topic popover |
| `StageRow` | Pending, current, done | 88 px high | Number/check, title, detail, status |
| `BoardViewport` | Ready, playing, paused, complete, annex | Exact 16:9 | Constant light surface in both themes |
| `CaptionStrip` | Ready, speaking, paused, captions-only | 80 px high | Word highlight; mobile continuation chunks |
| `Transport` | Desktop, mobile | 112 or 104 px high | Ready, playing, paused, scrubbing, complete |
| `Timeline` | Desktop, mobile | 928 × 44; 334 × 44 reference | Hover segment, focused, dragging, start/end |
| `TimelineTooltip` | Segment, seek preview | 248 × 48 | Clamped inside available width |
| `SpeedMenu` | Three radio options | 112 × 148 | Selected, hover, keyboard focus |
| `OutlineRow` | Future, earlier, current | 352 × 44; 334 × 44 | Current marker and “Now”; clickable seek |
| `QuestionPanel` | Desktop | 384 × 600 | Empty, active conversation |
| `QuestionSheet` | Collapsed, expanded, keyboard | 390 × 68; 390 × 564; viewport-derived | Modal when expanded; focus trap and explicit close |
| `ChatMessage` | User, tutor, loading, error | Flexible width/height | User bubble; tutor open text with label |
| `QuestionComposer` | Empty, draft, sending, offline | 352 × 128; 358 × 128 | Two-line input, helper, Send |
| `DrawingLink` | Available, selected | 136 × 44 | “View drawing”; exposes corresponding annex |
| `CompletionPanel` | Desktop, mobile | 960 × 56; 358 × 88 | Replay plus question emphasis |
| `StatusNotice` | Generation error, voice warning, offline | Screen-specific | Icon and text; no colour-only meaning |
| `HelpPopover` | Light, dark | 312 × 272 | Open, closed; focus restoration |
| `Keycap` | Single key, arrow pair | Minimum 28 × 24 | Mono text, 1 px border, 4 px radius |

Shared component state styling:

- **Secondary/ghost hover:** raised background.
- **Chip hover:** selected background and action-coloured border.
- **Pressed:** pressed colour or inset 1 px action border; no layout shift.
- **Disabled:** disabled tokens, no opacity reduction; retain the label.
- **Busy:** preserve width, replace action copy where specified, announce status once.
- **Focus:** consistent external focus ring.
- **Errors:** visible text plus border/icon; never depend on red alone.

Layer order: content `0`; sticky header/dock `20`; popovers `40`; modal scrim `60`; sheet `70`.

# 5) Whiteboard visual language

## Composition and legibility

Author every board in a **1600 × 900** coordinate space.

- Outer safe area: **64 units**.
- Maximum two major diagram groups in the initial composition.
- Prefer eight or fewer short labels.
- Minimum normal label size: **72 units**.
- Minimum equation size: **80 units**.
- Labels use up to two lines and approximately 14 characters per line.
- Explanations belong in captions; the board carries relationships and quantities.

At the mobile reference width, the scale is `358 / 1600 = 0.22375`. Thus:

- 72-unit label → **16.11 px**
- 80-unit equation → **17.9 px**
- 88-unit title → **19.69 px**

Do not generate desktop-sized 24–36-unit labels and shrink them into the mobile board.

## Shapes and connectors

| Element | Rule |
|---|---|
| Main shape outline | 2.5 px rendered stroke |
| Secondary construction line | 1.5 px rendered stroke |
| Arrow shaft | 2.5 px rendered stroke |
| Right-angle indicator | 2 px rendered stroke |
| Current-element underline/bracket | 3 px rendered stroke |
| Current-element boundary | 3 px rendered stroke where a boundary is needed |
| Arrowhead | Open chevron, 10 px long × 8 px wide in rendered coordinates |
| Caps and joins | Round |
| Default fill | None |
| Highlight fill | One of the six solid tints from Section 2 |

Apply `vector-effect="non-scaling-stroke"` to diagram strokes. Adjust arrowhead geometry for viewport scale so its rendered dimensions remain consistent.

Shapes:

- Rectangles: four slightly bowed edges; 8–16-unit visual corner softness.
- Circles: one continuous contour using eight cubic segments.
- Triangles/polygons: vertices remain mathematically correct; variation affects the edge between them.
- Braces and brackets: functional grouping only; their endpoints align with the grouped content.
- Use no decorative doodles unrelated to the explanation.

Connect arrows at shape boundaries. Maintain at least **24 units** between text and geometry and **32 units** between unrelated groups. Route around labels, with at most two elbows. Connector labels sit beside the middle third of the path with a board-coloured knockout and 8-unit padding.

Colour never carries the whole meaning. Pair it with labels, direction, line style, or shape.

## Hand-drawn rules

The drawing should look intentional and human, with restrained variation.

- Seed variation from each element’s stable ID.
- Maximum control-point displacement: **2.5 SVG units**.
- Maximum shape rotation: **0.35°**, excluding mathematical constructions whose orientation matters.
- At most two curvature changes along a nominally straight edge.
- Maximum corner misalignment: **4 units**.
- Use one outline per shape; no doubled “scratchy” contours.
- Keep text, numbers, arrow direction, intersections, and right-angle markers precise.
- Do not jitter paths between frames.
- Do not rotate individual letters, imitate messy handwriting, or add paper noise.

Reveal paths with `stroke-dashoffset`. Set the final path geometry before playback.

Stroke duration is:

`min(cueWindow, clamp(180ms, pathLength × 0.6ms, 700ms))`

Labels appear at their narration cue. On seeking, render the correct final state immediately without replaying earlier drawing animations.

## Labels and equations

Use Instrument Sans for labels and IBM Plex Mono for equations. Maintain consistent baselines.

- Normal equations: 80/96 units.
- Superscripts/subscripts: 64 units, shifted 32 units from the main baseline.
- Minimum gap between equation rows: 16 units.
- Break long equations at `=` or another meaningful operator; never reduce font size to fit.
- Reveal meaningful terms together; do not animate letters as if they were being typed.
- Keep the same quantity in the same ink across a lesson.

For the reference lesson:

- `a` / `3`: blue.
- `b` / `4`: teal.
- `c` / `5`: brick.
- Right-angle indicator: green.
- Operators and neutral structure: graphite.

Provide an accessible plain-language equivalent for every equation, such as **“a squared plus b squared equals c squared.”**

## Highlights, dimming, and current-element emphasis

**Current element**

- Geometry and text at 100% opacity.
- Corresponding tint behind its bounded group, extending **16 units** beyond the content.
- A 3 px underline below its label or a short bracket beside the group.
- No glow, pulsing, or scale animation.

**Earlier elements**

- Geometry strokes at **85% opacity**.
- Labels and equations remain at **100% opacity**.
- Remove their highlight fills and current-element underlines.

All proposed inks at 85% opacity on the plain board remain above 4.5:1. Do not dim whole SVG groups: text over tinted fills can otherwise fall below AA contrast.

**Upcoming elements**

- Absent until their cue.
- Do not show ghost placeholders that reveal the answer early.

**Complete**

- Restore geometry to 100%.
- Remove current-element emphasis.
- Leave the complete explanation readable.

## Exact reference board

These coordinates are in SVG units.

### Main composition

| Element | Geometry or text box |
|---|---|
| Title | `(80,64,720,104)`, **“Right triangles”** |
| Triangle | Path through `(240,260) → (240,620) → (720,620) → close` |
| Right-angle mark | `(240,572) → (288,572) → (288,620)` |
| Vertical-side label | `(112,396,80,88)` |
| Base label | `(440,648,80,88)` |
| Hypotenuse label | `(504,348,80,88)` |
| Main equation | `(880,232,640,96)` |
| Result equation | `(880,352,640,96)` |
| Takeaway | `(80,760,760,88)`, **“Right angles only.”** |
| Reserved follow-up annex | `(896,516,640,320)` |

Use graphite for the triangle. Labels follow the quantity colours above.

### Reference reveal sequence

| Cue | Board state |
|---|---|
| Ready, 00:00 | Title only; Start lesson overlay supplied by the player |
| 00:05 | Draw triangle |
| 00:12 | Add and emphasise right-angle marker |
| 00:18 | Reveal “Right angles only.” |
| 00:24 | Reveal `a`, `b`, `c` beside the corresponding sides |
| 00:58 | Reveal **`a² + b² = c²`** in the main equation position |
| 01:08 reference frame | Main equation is current; earlier geometry dimmed |
| 01:32 | Replace side labels with `3`, `4`, `5` |
| 01:38 | Replace main equation with **`3² + 4² = 5²`** |
| 01:50 | Reveal **`9 + 16 = 25`** in the result position |
| 02:00 | Complete board, all strokes restored |

These are design-fixture timings. Production cues must follow the actual narration.

## Follow-up drawing annex

For **“What if the two shorter sides are 5 and 12?”**, use the reserved 640 × 320-unit area. Preserve the main lesson drawing.

Annex geometry:

- Triangle: `(1008,564) → (1008,724) → (1392,724) → close`.
- Right-angle marker: `(1008,692) → (1040,692) → (1040,724)`.
- Label **`5`**: `(928,608,56,88)`, blue.
- Label **`12`**: `(1136,748,128,88)`, teal.
- Label **`13`**: `(1168,528,128,88)`, brick.
- Outline: graphite.
- Apply current-element emphasis to the annex when it first appears or when View drawing is selected.

The annex’s leg proportions are 5:12; its labels remain at the same readable size as the main board. Its explanation stays in the associated chat answer.

Show one annex at a time. A newer diagram replaces the annex; selecting View drawing on an older answer restores that answer’s annex. Seeking or replaying changes the lesson layer without deleting question history. Do not accumulate progressively smaller diagrams.

## Accessible representation

The SVG has a meaningful title and description, for example:

- Title: **“Pythagorean theorem diagram”**
- Description: **“A right triangle has short sides 3 and 4 and longest side 5. Three squared plus four squared equals five squared.”**

Maintain a screen-reader-accessible text description of each revealed relationship and the lesson transcript alongside the visual player. Announce segment changes and newly available answers once; avoid live announcements for individual strokes or words.