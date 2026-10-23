# Preschool Fun: icon, tutorial and richer feedback

2026-10-22. Tier 3: responsive UI, touch, Web Audio, embedded lifecycle and answer/point behavior. Follow-up in the existing games enhancement worktree, preserving the primary checkout and prior game changes. No publishing or release is included.

Explicit scope: a catalog icon matching the glossy Clock Game / 2 Players Math Write family; a quick tutorial explaining the purple bird's escape from the larger blue bird; analyze and improve engagement; generate and integrate effects using the user's ElevenLabs account. Preserve the ABC/counting/pattern question model, bird sprite atlases, tap/drag plus submit interaction, 10-point correct-answer contract and shared bird-escape engine.

## Direction contract

Thesis: connect every puzzle answer to the bird's escape, with one short optional practice on the opening page and readable feedback above the chase. Extend the bright sky, tactile toy letters and original birds rather than replacing the game.

Own-world: glossy purple/blue birds, sunny cyan and grass green, golden reward accents, existing rounded Baloo/Nunito typography. Use a full-bleed illustrated icon consistent with the verified sibling references; retain the real in-game bird animations.

Story: the child sees the little purple bird being followed, learns to place an answer and check it, sees a correct answer create more space, then starts the real game. Practice gives no points and has no penalties. A visible Help action can replay the tutorial during a paused attempt.

First viewport: a compact tutorial with the two real bird identities, short steps, an A/?/C practice row and a clear play button. Keep essential controls visible; allow accessible contained scrolling only for short/zoomed tutorial content. Gameplay keeps the puzzle, answer choices and flight strip together, with an inline feedback message.

Form: code-led extension, delegated routine choices. One icon candidate plus at most one targeted revision. Fixed self-review rubric: brief fidelity, composition, finish, style consistency and usability; each needs at least 8/10 with no critical defect. Direct execution without delegation; assessment is not independent certification.

Finish: inspect actual captures, verify positive/negative answer paths and practice isolation, audio decode/play/mute/visibility/lifecycle, phone/tablet/desktop fit and the real catalog integration. Record exact generated prompts, outputs and dirty-source hashes. Physical-device and native-shell coverage remain separate gates.

## Baseline findings and priorities

1. Opening copy says only to fill a missing spot; it never explains the chase. The strip is aria-hidden and unlabelled. Add narrative, optional practice and accessible in-game context.
2. The first alphabet question can begin near Q, and question difficulty is unrelated to progress. Introduce easier early ABC/counting/AB-pattern puzzles, then widen the range as answers are solved.
3. On phones the status/footer is hidden, so wrong answers lack visible instructional feedback. Show concise feedback near Check answer, remove an incorrect option for that puzzle, and celebrate short streaks without changing points.
4. All effects are synthesized oscillator/noise cues, including harsh wrong-answer waveforms. Replace them with a bounded set of generated ElevenLabs effects and a subtle garden loop; cap overlap and gain, keep gesture unlock and silence on mute/background/host pause.
5. Help and host lifecycle need to pause the current attempt and defer auto-advance. Preserve pending answers and restore focus; avoid resets or point awards from tutorial actions.

Generation uses the built-in image tool and the official authenticated ElevenLabs CLI because the exposed ElevenLabs MCP catalog contains agent tools but no sound-generation operation. No API secret is exported or stored.

## Delivered, 2026-10-23

- New full-bleed glossy icon: `public/Games/PreschoolFun/thumb.png` (1024px), the optimized 256px catalog WebP, plus small local tutorial/favicon exports. The actual app catalog was checked: both Preschool entries load the new 256px WebP. Original `thumb.svg` is preserved. This is an in-app catalog icon, not a native launcher/store replacement.
- Opening tutorial explains the two bird identities and the effect of answers. Optional A/?/C practice moves the demonstration birds without points, penalties or real chase changes. The Help button reopens it and pauses an unfinished attempt; closing restores the selected answer and focus.
- Visible Check answer feedback and an accessible flight heading connect puzzles to the chase. Incorrect options are removed for the current puzzle; encouraging hints remain visible on phones. Early questions use beginning letters/counting and simple alternating patterns, then widen with successful answers. Three-answer streaks get a distinct reward cue. Correct answers still award exactly 10 points.
- Nine generated effects replace the oscillator/noise engine. Sound uses gesture unlock, separate effect/ambience gains, a compressor, capped overlapping effects, no late queued playback, mute/zero-volume support and background/host pause handling. A trusted-parent/origin check protects host audio/lifecycle messages. The shared bird engine, atlas art, route and point message contract are unchanged.

The opening icon now loads a 32.6 KB local WebP instead of the 2.43 MB source PNG. The entire nine-clip MP3 pack is 274,147 bytes. Files are normalized with a -2 dBTP target and checked after encoding: observed peaks range from -10 to -2.4 dBFS with no clipping/decode errors. These measurements and browser playback events are not subjective listening certification; the assistant's audio input was unavailable.

## Sound pack and provenance

| Event | Asset |
|---|---|
| UI taps | `audio/ui-tap.mp3` |
| Answer placement | `audio/answer-place.mp3` |
| Correct answer | `audio/answer-correct.mp3` |
| Encouraging retry | `audio/try-again.mp3` |
| Extra room to fly | `audio/wing-boost.mp3` |
| Three-answer streak | `audio/streak-reward.mp3` |
| Escape complete | `audio/escape-win.mp3` |
| Friendly catch/retry | `audio/bird-bump.mp3` |
| Quiet looping garden | `audio/garden-ambience.mp3` |

Paths are relative to `public/Games/PreschoolFun`. Exact sound prompts, durations, output hashes and model (`eleven_text_to_sound_v2`) are in `audio/manifest.json`. Original generated MP3s are retained under `output/preschool-premium/audio-raw`; processed media is game-local and does not call ElevenLabs at runtime. Generation used the already authenticated official OAuth CLI; no key or OAuth token was exported.

The icon used built-in image generation, one candidate, with the Clock Game / 2 Players Math Write icons as style references and the existing purple/blue birds as identity references. Exact prompt and export list: `assets/icon-manifest.json`. PNGs carry prompt metadata and WebPs have prompt sidecars. Before/after pixel hashes confirm provenance did not alter the artwork. `output/preschool-premium/icon-size-review.png` shows 256/128/64/48px exports; tiny title detail naturally simplifies, while the purple-bird silhouette remains recognizable.

## Verification and review

`node scripts/preschoolPremium.browser.mjs`: 7/7 profiles passed (desktop Chromium, Android viewport Chromium, iPhone WebKit, small-phone WebKit, iPad WebKit, short-landscape WebKit and embedded Chromium). Covered tutorial practice isolation, gentle initial questions, correct/wrong answer effects on bird positions, eliminated wrong options, Help pause/resume and focus, 10-point awards, mute/resume, trusted/invalid host messages and viewport fit. Desktop and iPhone-engine profiles also completed the full escape, loss and restart loops. Report: `output/preschool-premium/final-browser-report.json`.

After the final small-icon and contrast improvements, `node output/preschool-premium/final-input-smoke.mjs` passed four desktop/phone/small-phone/landscape profiles. It checks actual touch taps and mouse-driven drag placement, no points before submitting, one 10-point award, final icon decoding, button contrast colors and captures. These are synthetic inputs, not physical touch evidence. Report: `output/preschool-premium/final-input-report.json`.

`npm run audit:games` passed 84 entries; catalog `--check`, targeted ESLint, `node --check` on both runtime scripts and `git diff --check` passed. No full app build or unrelated multi-game suite was required for these game-local changes. FFprobe/FFmpeg decoded all nine clips and recorded duration, codec, size, levels and hashes in `audio-audit.json`.

The installed Windows WebKit engine exposes neither AudioContext nor webkitAudioContext. Its profiles verified gameplay/layout and graceful silence; they did not verify audio playback. The three Chromium profiles decoded all nine assets and verified context/play/stop events. Physical iPhone/iPad Safari, Android hardware, native Capacitor loading, OS interruptions, safe-area behavior and subjective listening remain untested. Real hardware tools were not available for this run; no device PASS or world-class certification is claimed.

The detector ran once and was not clean. Its real low-contrast white-on-orange CTA finding was fixed with dark text, and enabled Check answer text now uses a dark green foreground. Final colors were checked in the four-profile smoke. The remaining findings concern incumbent panel shadows/borders, nested game surfaces, toy-letter gradient treatment and decorative chase artwork; those established visuals were retained. The tutorial-flight padding warning describes decorative birds, not flush body text. No clean-detector claim is made and it was not rerun.

Visual self-assessment (DEGRADED: single-context, user requested direct execution): brief fidelity 9/10, composition 8/10, finish 8/10, style consistency 9/10, usability/motion 8/10. The icon has one accepted candidate. UI uses one code-led extension with a targeted compact-layout revision; no new visual world or extra illustration candidates. Actual app tutorial: `output/preschool-premium/side-panel-tutorial.png`; actual catalog: `side-panel-catalog.png`; final phone/landscape captures sit beside the reports.

## Scrolling and remaining improvements

The normal tutorial and gameplay have no document overflow in the tested sizes. The tutorial body (`.tutorial-scroll`) may scroll vertically on short phones/landscape or larger text so all instructions/practice stay accessible; the play/resume button remains in its fixed footer. This is an expanded-content/small-screen exception. On short gameplay screens decorative choice offsets are removed, choices become a row of four usable targets, and landscape groups choices and birds in one column. Tiny/zoomed viewports beyond the matrix still need a separate accessibility pass; controls are not clipped to conceal that gap.

Ranked follow-up opportunities, not shipped features:

1. Add lightweight saved learning milestones or a feather collection to make repeat sessions rewarding. The current session score resets on replay, as before.
2. Review the number of successful answers needed to escape across lane widths. The shared chase engine uses geometry-based steps; keeping it unchanged avoids affecting other games, but a game-specific consistent mission length deserves a separate design/test pass.
3. Reduce desktop empty panel space and self-host the existing fonts for offline consistency as a focused layout/performance follow-up.

Current tested journeys have no remaining confirmed functional failures. Receipts: `output/preschool-premium/source-receipt.json` fingerprints this dirty local scope against base `703dd258dc8c9cf2267d9d7da8887232d72ebdc8`. The primary checkout remains clean; prior Car King, Animal Champion and Many Birds edits are preserved. No commit, push, merge, release or store update was performed. The existing Vite preview remains open on Preschool Fun.

Validation: Tier 3 | ran seven core browser profiles, four final touch/drag profiles, asset/audio audits, catalog, lint and syntax checks | physical/native and WebKit audio coverage remain open.

## Spoken help follow-up: 2026-10-23

User explicitly requested their ElevenLabs account for a friendly tutorial and question reader. The tutorial now has a speaker button, questions read automatically after Start Playing, and each question has a Listen/Stop replay button. Tapping a choice reads its name and reminds the child to check it. Practice choices and practice feedback are voiced, too. Auto voice can be switched off independently of effects; manual question replay remains available. Tutorial audio starts with an explicit tap to respect browser autoplay rules.

Question narration is assembled from real recorded vocabulary, matching the current letter, number or picture sequence. Every missing item becomes the recorded word "blank"; its stored answer is never inserted into the reading. Pattern instructions now say "missing picture" to match the internal gap, and the red triangle's label and narration match its actual emoji color.

Generation used the authenticated official ElevenLabs OAuth CLI, the verified premade Sarah voice (`EXAVITQu4vr4xnSDxMaL`) and the account's available `eleven_v4` model. No credentials were exported. Four timestamped banks supplied the tutorial, instructions, alphabet, numbers and pictures; one separate clip corrected the triangle's color name. `audio/voice/manifest.json` records all 57 exact texts, clip timing/provenance, settings, sizes, durations and SHA-256 hashes. Files are bundled mono 44.1 kHz MP3s at 96 kbps, normalized to -18 LUFS / -2 dBTP, with a gentle 0.94x tempo adjustment. The pack is approximately 1.5 MB and makes no runtime ElevenLabs requests. Raw responses and generation/splitting helpers are retained under ignored `output/preschool-premium/voice-raw` and its parent.

Narration shares the gesture-unlocked Web Audio context with existing effects, uses its own voice gain, and softens ambience/effects while speaking. Only one reading can be active. Selecting, checking, opening Help, starting a new puzzle, muting, setting effects volume to zero, host pause, hidden page, session end and exit cancel obsolete readings. Resuming/unmuting does not unexpectedly restart old narration. Replay recovers after failed downloads, and canceled downloads cannot later start a stale reading. Voice buffers load on demand with a bounded 24-clip decoded cache. Unsupported audio disables the voice buttons while gameplay remains usable.

The compact phone layout preserves 44px speaker targets. On the smallest phones the question button uses its speaker icon plus an accessible label, and picture slots now receive the existing compact pattern-card class. The initial verification caught small-phone overflow first in the question header and then in picture puzzles; both causes were fixed. The tutorial retains its documented contained-scroll exception with a fixed Start/Back footer.

Desktop narration checks verified all 57 hashes and browser decodes, exact visible-sequence reading with blanks, answer-name readings, tutorial interruption, Help, mute, zero volume, pause, manual replay, automatic-reading preference, three 10-point awards, failed-download recovery, and cancellation of a delayed request. The existing desktop core regression also passed its full escape, loss and restart loops. All seven responsive profiles passed: desktop and Android viewport Chromium, iPhone/small-phone/iPad/landscape WebKit, and embedded Chromium. The tablet run initially exceeded the test's 15-second animation-frame polling budget while its captured state had already advanced to an unlocked next puzzle. Polling that state independently of frame delivery with a bounded 45-second budget passed the focused tablet retry; no runtime timing was changed to satisfy it. The original failure and successful retry are retained. The game audit passed all 84 catalog entries; runtime syntax checks, targeted browser-script lint and scoped whitespace checks passed. Final responsive matrix and identity receipts are in `output/preschool-narration`.

The design detector ran once for this follow-up. It reported inherited accent borders, panel nesting, toy-text gradients/glows, heading hierarchy and a decorative tutorial-flight inset warning; it did not report voice-button contrast failures. These do not justify replacing the established visual world during a narration change. No clean-detector claim is made. Self-review: existing-style fidelity 9/10, legibility/control usability 8/10, voice-flow completeness 9/10; subjective listening quality remains a human acceptance gate.

Xatori Device Lab inventory was refreshed after starting its coordinator headlessly: only stopped Android emulators and browser profiles were available, with no connected physical devices or Mac workers. The task-owned coordinator was stopped afterward. The installed Windows WebKit still lacks AudioContext; its coverage proves unavailable-audio fallback, layout and gameplay, not Safari voice playback. Physical Android/iPhone/iPad speakers, Safari autoplay/interruption, Capacitor shell and subjective listening are unverified. Local preview remains on Preschool Fun; the main checkout is clean and earlier games work is preserved. No commit, push, merge or release was performed for this follow-up.
