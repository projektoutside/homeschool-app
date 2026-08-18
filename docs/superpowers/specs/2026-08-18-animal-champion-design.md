# Animal Champion Design

**Status:** Approved in chat on 2026-08-18; written specification pending product-owner review
**Validation tier:** Tier 3

## Goal

Create **Animal Champion**, a polished standalone animal-identification game that preserves Car King's recognizable menu, modes, countdown, four-choice round loop, scoring, streak, leaderboard, and platform-reward behavior while replacing the automotive content and visual identity with a wildlife championship theme.

The release must use exactly 50 animals and exactly two quality-approved images per animal, for 100 unique runtime image references. Audio, speech, microphone access, and sound controls are intentionally deferred to a later phase. The game must remain fully playable without them.

## Chosen approach

Build a focused DOM/CSS/JavaScript game under `public/Games/Animal Champion/` instead of copying Car King's implementation wholesale or changing Car King itself.

The game will reproduce the intended Car King experience through smaller, testable modules and explicit state transitions. It will preserve user-visible mechanics while correcting known Car King defects: repeat-click scoring, audio-dependent progression, inconsistent streak resets, stale timers, incomplete deck resets, and inaccessible menu controls.

The existing `Animals/` library remains the non-destructive source pool. Runtime data will select 84 existing QA-approved images and 16 newly generated replacements. The remaining source images stay unreferenced by gameplay; they are not deleted or duplicated into a second library.

## Current-state evidence

- `public/Games/CarKingFinal/` is the live Car King source of truth. It contains 41 database entries and exactly 100 referenced gameplay images.
- Car King uses ordinary DOM images and CSS, not canvas, SVG, or a game engine.
- Its active loop uses a shuffled no-repeat deck, a 15-second answer window, four answer choices, +10 points per correct answer, Challenger and Continuous modes, and a local top-three leaderboard.
- `public/Games/Animal Champion/` currently contains `Animals/` and `animals-manifest.json`, but no HTML, CSS, JavaScript runtime, UI artwork, or thumbnail.
- The Animal Champion source library contains 50 folders and 191 unique WebP files. Every animal has at least three images, every manifest path exists, and every file decodes.
- Of those images, 189 are 853 x 1280 portrait and two are 1280 x 853 landscape. A plain copy of Car King's black 4:3 `object-fit: contain` stage would leave large side bars around almost every animal image.
- Visual QA found no gore or visible watermarks, but found answer-revealing labels, inconsistent art lanes, aggressive poses, and anatomy/species problems in some candidates.
- The catalog foundations currently generate `src/generated/contentCatalog.ts`; generated catalog files must never be edited by hand.

## Alternatives considered

### Literal Car King fork

Copy all Car King HTML, CSS, and JavaScript, then rename car concepts and remove voice/audio code. This is superficially closest to the source but would carry thousands of lines of unused microphone logic, hard-coded automotive assumptions, and known scoring/state/accessibility defects. Rejected.

### Shared Car King/Animal Champion engine refactor

Extract a generic identification-game engine and migrate both games. This could reduce future duplication, but it would broaden the change into a regression-prone Car King rewrite and conflict with the requirement to preserve existing working behavior. Deferred until there are at least two verified consumers and a separate migration decision.

### Focused standalone replica — selected

Reproduce the approved behavior and hierarchy with a compact game-specific implementation, leave Car King untouched, and integrate Animal Champion through existing catalog and points patterns. This provides the closest safe outcome with the narrowest runtime risk.

## Gameplay contract

### Menu and setup

- Initial load shows a full-screen cinematic wildlife wallpaper, layered ambient effects, the split **Animal Champion** title, and a keyboard-accessible **Click anywhere to begin** control.
- The first activation reveals a glass menu panel.
- The panel exposes a Challenger/Continuous mode toggle and **Start Game**.
- No audio settings, voice mode, microphone prompt, or sound toggle appear in this phase.
- Starting a run shows a drift-safe 3, 2, 1, GO countdown before the first round.

### Round loop

- Every new run creates a Fisher-Yates shuffled deck containing all 50 animals.
- Each animal appears once before the deck reshuffles. A new game creates a fresh deck.
- A round chooses one of the animal's two curated images with balanced randomness so both variants are exercised over time.
- The image must finish loading before the 15-second answer window starts.
- Exactly four distinct answer buttons appear: the correct animal plus three distinct wrong animals.
- Choice order is randomized independently each round.
- Only the first answer activation is accepted. Pointer, touch, keyboard, or synthetic repeated events cannot score twice or start overlapping transitions.

### Outcomes

- Correct: lock the round, stop the timer, add 10 in-game points, increase streak by one, request one 10-point platform reward, show correct feedback, then advance after a short audio-independent delay.
- Wrong: lock the round, stop the timer, reset streak to zero, mark the selected choice incorrect, reveal the correct choice, and show text feedback.
- Timeout: lock the round, reset streak to zero, reveal the correct choice, and show timeout feedback.
- Challenger mode ends after the first wrong answer or timeout.
- Continuous mode advances after wrong answers and timeouts and has no fixed win condition.
- There are no lives, levels, round limits, or streak bonuses.
- **New Game** returns to the menu and fully clears pending animation frames, delays, timer state, current choices, score, streak, and deck state.

### Game over

- Show the final score and the local top three nonzero scores.
- Persist leaderboard entries under a new Animal Champion-specific key so Car King data is never read or overwritten.
- **Play Again** starts a fresh countdown and fresh deck.
- **Main Menu** returns to the revealed menu with a reset run.

## Content and curated asset contract

The roster is fixed to the 50 existing animal folders:

Bat, Bear, Camel, Cat, Cheetah, Chicken, Chimpanzee, Cow, Crocodile, Deer, Dog, Dolphin, Donkey, Duck, Eagle, Elephant, Flamingo, Fox, Frog, Giraffe, Goat, Gorilla, Hamster, Hippopotamus, Horse, Kangaroo, Koala, Lion, Monkey, Mouse, Octopus, Owl, Panda, Parrot, Peacock, Penguin, Pig, Polar Bear, Rabbit, Rhinoceros, Seal, Shark, Sheep, Snake, Squirrel, Tiger, Turtle, Whale, Wolf, and Zebra.

`js/animal-data.js` is the runtime source of truth. It must contain exactly 50 unique entries and exactly two distinct WebP paths per entry. The broader `animals-manifest.json` remains the source-library inventory, is updated to include each new generated file, and does not determine gameplay selection.

### Exact runtime selection

| Animal | Primary image | Secondary image |
| --- | --- | --- |
| Bat | `Animals/Bat/chatgpt-generated.webp` | `Animals/Bat/animal-champion-secondary.webp` |
| Bear | `Animals/Bear/chatgpt-generated.webp` | `Animals/Bear/chatgpt-anime.webp` |
| Camel | `Animals/Camel/chatgpt-generated.webp` | `Animals/Camel/chatgpt-anime.webp` |
| Cat | `Animals/Cat/chatgpt-generated.webp` | `Animals/Cat/chatgpt-anime.webp` |
| Cheetah | `Animals/Cheetah/93ff7ae1-90a0-428d-8db7-fd4b3a9f54b0.webp` | `Animals/Cheetah/animal-champion-secondary.webp` |
| Chicken | `Animals/Chicken/chatgpt-generated.webp` | `Animals/Chicken/chatgpt-anime.webp` |
| Chimpanzee | `Animals/Chimpanzee/chatgpt-generated.webp` | `Animals/Chimpanzee/chatgpt-anime.webp` |
| Cow | `Animals/Cow/chatgpt-generated.webp` | `Animals/Cow/chatgpt-anime.webp` |
| Crocodile | `Animals/Crocodile/animal-champion-primary.webp` | `Animals/Crocodile/animal-champion-secondary.webp` |
| Deer | `Animals/Deer/chatgpt-generated.webp` | `Animals/Deer/chatgpt-anime.webp` |
| Dog | `Animals/Dog/chatgpt-generated.webp` | `Animals/Dog/chatgpt-anime.webp` |
| Dolphin | `Animals/Dolphin/chatgpt-generated.webp` | `Animals/Dolphin/chatgpt-anime.webp` |
| Donkey | `Animals/Donkey/chatgpt-generated.webp` | `Animals/Donkey/chatgpt-anime.webp` |
| Duck | `Animals/Duck/chatgpt-generated.webp` | `Animals/Duck/chatgpt-anime.webp` |
| Eagle | `Animals/Eagle/chatgpt-generated.webp` | `Animals/Eagle/chatgpt-anime.webp` |
| Elephant | `Animals/Elephant/d3635c1a-c89c-4039-9af6-ebd44c927d6b.webp` | `Animals/Elephant/chatgpt-anime.webp` |
| Flamingo | `Animals/Flamingo/chatgpt-generated.webp` | `Animals/Flamingo/chatgpt-anime.webp` |
| Fox | `Animals/Fox/chatgpt-generated.webp` | `Animals/Fox/chatgpt-anime.webp` |
| Frog | `Animals/Frog/chatgpt-generated.webp` | `Animals/Frog/chatgpt-anime.webp` |
| Giraffe | `Animals/Giraffe/chatgpt-generated.webp` | `Animals/Giraffe/animal-champion-secondary.webp` |
| Goat | `Animals/Goat/chatgpt-generated.webp` | `Animals/Goat/animal-champion-secondary.webp` |
| Gorilla | `Animals/Gorilla/chatgpt-generated.webp` | `Animals/Gorilla/animal-champion-secondary.webp` |
| Hamster | `Animals/Hamster/chatgpt-generated.webp` | `Animals/Hamster/chatgpt-anime.webp` |
| Hippopotamus | `Animals/Hippopotamus/chatgpt-generated.webp` | `Animals/Hippopotamus/animal-champion-secondary.webp` |
| Horse | `Animals/Horse/chatgpt-generated.webp` | `Animals/Horse/chatgpt-anime.webp` |
| Kangaroo | `Animals/Kangaroo/chatgpt-generated.webp` | `Animals/Kangaroo/chatgpt-anime.webp` |
| Koala | `Animals/Koala/chatgpt-generated.webp` | `Animals/Koala/chatgpt-anime.webp` |
| Lion | `Animals/Lion/chatgpt-generated.webp` | `Animals/Lion/chatgpt-anime.webp` |
| Monkey | `Animals/Monkey/chatgpt-generated.webp` | `Animals/Monkey/chatgpt-anime.webp` |
| Mouse | `Animals/Mouse/chatgpt-generated.webp` | `Animals/Mouse/chatgpt-anime.webp` |
| Octopus | `Animals/Octopus/animal-champion-primary.webp` | `Animals/Octopus/animal-champion-secondary.webp` |
| Owl | `Animals/Owl/chatgpt-generated.webp` | `Animals/Owl/chatgpt-anime.webp` |
| Panda | `Animals/Panda/chatgpt-generated.webp` | `Animals/Panda/chatgpt-anime.webp` |
| Parrot | `Animals/Parrot/chatgpt-generated.webp` | `Animals/Parrot/chatgpt-anime.webp` |
| Peacock | `Animals/Peacock/chatgpt-generated.webp` | `Animals/Peacock/chatgpt-anime.webp` |
| Penguin | `Animals/Penguin/chatgpt-generated.webp` | `Animals/Penguin/chatgpt-anime.webp` |
| Pig | `Animals/Pig/chatgpt-generated.webp` | `Animals/Pig/animal-champion-secondary.webp` |
| Polar Bear | `Animals/Polar Bear/chatgpt-generated.webp` | `Animals/Polar Bear/chatgpt-anime.webp` |
| Rabbit | `Animals/Rabbit/chatgpt-generated.webp` | `Animals/Rabbit/animal-champion-secondary.webp` |
| Rhinoceros | `Animals/Rhinoceros/chatgpt-generated.webp` | `Animals/Rhinoceros/chatgpt-anime.webp` |
| Seal | `Animals/Seal/chatgpt-generated.webp` | `Animals/Seal/chatgpt-anime.webp` |
| Shark | `Animals/Shark/chatgpt-generated.webp` | `Animals/Shark/animal-champion-secondary.webp` |
| Sheep | `Animals/Sheep/chatgpt-generated.webp` | `Animals/Sheep/chatgpt-anime.webp` |
| Snake | `Animals/Snake/chatgpt-generated.webp` | `Animals/Snake/animal-champion-secondary.webp` |
| Squirrel | `Animals/Squirrel/chatgpt-generated.webp` | `Animals/Squirrel/chatgpt-anime.webp` |
| Tiger | `Animals/Tiger/chatgpt-generated.webp` | `Animals/Tiger/animal-champion-secondary.webp` |
| Turtle | `Animals/Turtle/chatgpt-generated.webp` | `Animals/Turtle/chatgpt-anime.webp` |
| Whale | `Animals/Whale/chatgpt-generated.webp` | `Animals/Whale/chatgpt-anime.webp` |
| Wolf | `Animals/Wolf/chatgpt-generated.webp` | `Animals/Wolf/chatgpt-anime.webp` |
| Zebra | `Animals/Zebra/chatgpt-generated.webp` | `Animals/Zebra/animal-champion-secondary.webp` |

This contract selects 84 existing files and 16 new files. New gameplay assets are required for Bat, Cheetah, Crocodile (two), Giraffe, Goat, Gorilla, Hippopotamus, Octopus (two), Pig, Rabbit, Shark, Snake, Tiger, and Zebra.

### Generated-image art direction

- One unmistakable animal species per image; no hybrids, duplicate heads, extra eyes or limbs, missing defining features, or species ambiguity.
- Child-safe, confident, and energetic without attacks, gore, exposed prey, or threatening close-up teeth.
- No humans, handlers, cages, text, letters, labels, logos, signatures, or watermarks.
- Full animal or all defining anatomy visible with safe space around ears, horns, tails, paws, wings, and tentacles.
- Natural habitat with a clean subject silhouette and readable lighting.
- New replacements use the existing 2:3 portrait orientation so the selected secondary lane remains visually coherent.
- Crocodile must have a taxonomically clear narrow V-shaped snout and one coherent head.
- Octopus must visibly have two eyes and eight anatomically plausible arms.
- Goat must read as a domestic goat, not an ibex or mountain goat.
- Turtle must remain a turtle rather than a land tortoise.
- New image generation uses the repository-approved built-in image-generation workflow, and generated outputs are copied into the explicit paths above.

The implementation records the prompt and final file path for every newly generated asset. Each output receives visual QA at full resolution before it enters `animal-data.js`.

### UI assets

- `assets/images/ui/menu-wallpaper.webp`: text-free cinematic wildlife ensemble, portrait-safe central composition, deep emerald jungle, amber rim light, and negative space for the DOM title.
- `assets/images/ui/thumb.webp`: square text-free champion emblem using a crown/leaf motif and recognizable wildlife silhouettes; the shell renders the title separately.
- `/assets/thumbnails/optimized/animal-champion-128.webp`: optimized catalog thumbnail derived from the approved square artwork.

Important words, buttons, scores, and answers remain native HTML text rather than baked into generated images.

## Visual design

Animal Champion keeps Car King's premium competitive hierarchy while changing the theme:

- Deep jungle navy and near-black backgrounds replace automotive navy/black.
- Emerald is the primary action and timer color.
- Amber/gold is the championship accent.
- Warm coral marks incorrect answers and emerald marks correct answers.
- Metallic ivory/gold typography replaces chrome silver.
- Ambient leaves, mist, firefly-like particles, and light streaks replace smoke and road streaks.
- The title remains split and cinematic but uses responsive sizing for the longer word **CHAMPION**.
- Glass cards, strong depth, rounded panels, and concise HUD pills preserve the Car King visual language.

The gameplay image stage remains approximately 4:3 to preserve the overall layout. It renders the same selected image twice: an enlarged `cover` layer with dark blur as a habitat backdrop and an uncropped `contain` foreground layer. The foreground animal remains completely visible while the stage avoids empty black pillar bars. Both layers are decorative/semantic parts of one image and expose only one meaningful alt description.

## Runtime architecture and components

```text
public/Games/Animal Champion/
  index.html
  animals-manifest.json
  Animals/
    <existing and newly generated WebP files>
  assets/images/ui/
    menu-wallpaper.webp
    thumb.webp
  css/
    style.css
  js/
    animal-data.js
    game-engine.js
    game.js
```

- `animal-data.js`: immutable roster, exactly two image paths per animal, display names, and alt text.
- `game-engine.js`: testable deck, choice generation, scoring, mode, timer-transition, and leaderboard rules without DOM dependencies.
- `game.js`: DOM controller, screen transitions, image loading, pointer/keyboard interaction, platform points bridge, and cleanup.
- `style.css`: wildlife theme, responsive composition, state styling, safe areas, focus, and reduced-motion behavior.
- `index.html`: semantic screens and controls with no third-party font or runtime dependency.

The game initializes `../shared/lahsPointsBridge.js` with the exact ID `animal-champion`. No Car King microphone/speech host branch is copied or generalized in this phase.

## State flow

The controller has explicit `menu-locked`, `menu-ready`, `countdown`, `loading-round`, `answering`, `feedback`, and `game-over` states.

Every asynchronous callback captures a run token and round token. A callback exits when its token is stale. This prevents old timers, image loads, countdown frames, or feedback delays from changing a reset or newer round.

1. Boot into `menu-locked`.
2. User activation reveals `menu-ready`.
3. Start creates a new run token, resets persistent run state, and enters `countdown`.
4. Countdown completion enters `loading-round`.
5. Image load success enters `answering` and starts the 15-second deadline.
6. Answer or deadline locks the round and enters `feedback`.
7. Feedback either advances through `loading-round` or enters `game-over` according to mode and outcome.
8. New Game or Main Menu invalidates tokens and returns to the appropriate menu state.

## Scoring, persistence, and platform rewards

- Correct answer: +10 in-game score and +1 streak.
- Wrong answer or timeout: streak resets to zero.
- Platform reward: one `correct-answer` event worth 10 points, carrying the animal name and mode as metadata.
- Event IDs are unique per accepted correct answer. The processing lock ensures one event per round.
- Platform rejection or unavailable host integration does not block local feedback or the next round.
- The top-three nonzero leaderboard is stored locally under `animalChampionLeaderboard`.
- No score, streak, or game-mode state is shared with Car King.
- No network, account, or backend call is required to play.

## Error handling and recovery

- If a selected image fails, try the animal's other curated image once.
- If both images fail, remove that animal from the current deck and load the next animal without charging the learner time.
- If every remaining image fails, show a recoverable content-error surface with **Try Again** and **Main Menu** instead of looping or showing a blank card.
- A failed platform points request remains non-blocking and cannot duplicate through retries inside the game.
- Corrupt leaderboard data is ignored and replaced with an empty valid leaderboard.
- Storage denial leaves the current run playable while disabling leaderboard persistence.
- An exception during a state transition clears active timers and presents a recoverable error, rather than leaving controls locked.

## Accessibility and device behavior

- Use real `<button>` controls; the initial reveal surface is keyboard reachable and supports Enter/Space.
- Preserve browser zoom; do not use `user-scalable=no`.
- Touch targets are at least 48 CSS pixels with visible pressed, hover, and keyboard-focus states.
- Question, timer, score, streak, and feedback have appropriate semantic labels; feedback uses a polite `aria-live` region.
- Correctness is communicated by text/icon and not by color alone.
- `prefers-reduced-motion: reduce` disables continuous wallpaper drift, particle movement, title impacts, shakes, and large transitions while retaining state clarity.
- Apply `env(safe-area-inset-*)` to menu, game, game-over, and fixed controls.
- Support mouse, touch, and keyboard in standalone and iframe launches.
- Support desktop, Android phone, iPhone-sized Safari layouts, tablet portrait/landscape, and phone landscape without clipped controls or horizontal scrolling.
- Pause the answer deadline when the document becomes hidden and resume from the remaining duration when visible, preventing background-tab time loss.

## Catalog and delivery integration

- Stable game/catalog ID: `animal-champion`.
- Stable legacy runtime path: `/Games/Animal Champion/index.html`.
- Add a science-category game entry to `src/data/content/science.ts` with subjects for animals, wildlife, and visual recognition; grade level is `All`.
- Add `animal-champion` to the existing single-player home classification and points allowlist.
- Keep this implementation on the production legacy-public path and add a launch probe for it. The separate game-package migration remains deferred; when that workstream migrates Animal Champion, its required `games/animal-champion/game.manifest.json` must point to a manifest-local source entry and preserve `/Games/Animal Champion/index.html` as the generated compatibility path.
- Apply a narrow `GamePlayer` host policy for `animal-champion`: do not apply the shell's zoom lock to this route or its iframe, do not require native fullscreen fallback, omit fullscreen/camera/microphone/geolocation/autoplay permissions from the iframe `allow` policy, and do not set `allowFullScreen`. Other registered games retain their current host behavior.
- Run `npm run sync:content-catalog`; do not edit `src/generated/contentCatalog.ts` manually.
- Update catalog parity expectations from the verified current baseline by exactly one content entry. This legacy-compatible slice does not add an experience manifest.
- Browser/GitHub Pages continues serving the public path.
- Android continues staging the game through the repository's current game-assets flow. Bundle inspection must prove the runtime and all 100 selected images are present.
- Do not claim full browser-offline support. The current service worker caches `/Games/` requests after access rather than pre-caching the entire image set.

## Validation

This is Tier 3 because it adds a responsive interactive game, iframe behavior, touch/keyboard input, motion, persistent storage, platform rewards, routing/catalog integration, and Android-packaged assets.

### Automated contracts

- Asset contract: exactly 50 animals, exactly two distinct runtime images each, exactly 100 unique paths, all paths case-correct, WebP signatures valid, files decodable, dimensions within policy, and no zero-byte or duplicate-content selections.
- Data contract: unique names, deterministic aliases/slugs, valid alt text, and four-choice generation always returns one correct plus three distinct wrong answers.
- Engine contract: full-deck no-repeat behavior, reshuffle after 50, fresh deck on reset, 15-second deadline semantics, correct/wrong/timeout transitions, Challenger/Continuous branching, streak resets, and leaderboard top-three rules.
- Input contract: repeated clicks/keys award at most once, stale callbacks cannot progress newer rounds, and point events are unique.
- Launch probe: standalone game route and catalog `/play/animal-champion` path load the correct runtime without missing literal assets.
- Integration contracts: catalog generation, 82-entry content parity from the current 81-entry baseline, single-player classification, points allowlist, least-privilege iframe policy, and Animal Champion's zoom/fullscreen host exceptions.

### Repository checks

- Run focused Animal Champion Node tests first.
- Run `npm run audit:games`, `npm run audit:content`, and `npm run audit:assets`.
- Run `npm run typecheck`, `npm run lint`, and the production `npm run build` without stacking unnecessary redundant supersets when a full gate already covers them.
- Inspect the final generated catalog and production asset paths.
- Review the complete final diff and working tree, preserving unrelated user changes.

### Browser and device matrix

- Desktop 1440 x 900: mouse, keyboard, focus order, full loop, leaderboard, standalone, and iframe.
- Android phone 393 x 852: touch targets, safe areas, portrait flow, and iframe launch.
- iPhone-sized 390 x 844: Safari-sensitive viewport behavior, zoom, safe areas, and portrait flow.
- Tablet 1024 x 1366 and 1366 x 1024: portrait/landscape composition and readable choices.
- Phone landscape: compact game layout without clipping.
- Reduced-motion mode, visibility pause/resume, slow image load, broken-image fallback, storage denial, and points-host unavailability.
- Check console and network logs for errors and 404s throughout the real menu-to-game-over path.

Final reporting separates physical-device testing, browser emulation/automation, build inspection, and code review. Physical iPhone/iPad proof cannot be claimed from the current Windows environment without a real remote-device path.

## Acceptance criteria

- Animal Champion is discoverable as a single-player science game and launches through `/play/animal-champion` and `/Games/Animal Champion/index.html`.
- The cinematic wildlife menu, mode toggle, countdown, gameplay card, timer, feedback, game over, and leaderboard form one complete playable flow.
- The runtime roster contains exactly 50 animals and references exactly 100 unique QA-approved WebP images, two per animal.
- Every new generated asset satisfies the art-direction contract after full-resolution visual review.
- All 50 animals appear before a deck repeat.
- Every round contains four distinct choices and accepts only one result.
- Correct answers award exactly 10 local points and at most one 10-point platform event.
- Wrong answers and timeouts visibly reveal the answer, reset the streak, and follow the selected mode.
- Progression never depends on audio or microphone availability.
- The game requests no audio, speech, microphone, fullscreen, camera, geolocation, autoplay, or network capability, and the host does not delegate those iframe capabilities to Animal Champion.
- UI remains usable at the required desktop, phone, tablet, portrait, landscape, standalone, iframe, safe-area, keyboard, touch, zoom, and reduced-motion surfaces.
- Catalog, asset, game, host-policy, type, lint, build, and targeted browser checks have recorded passing evidence or an explicitly named external physical-device limitation.
- Car King behavior and files remain unchanged.

## Rollback and safety

- Runtime work is isolated to the new Animal Champion game, its catalog/points registration, generated thumbnail, narrow host policy, and focused tests.
- Existing Animal source images are not deleted or renamed.
- New generated replacements use new filenames, so removing them and reverting runtime references is straightforward.
- Catalog output is regenerated deterministically from source and is never hand-edited.
- No production deployment, store upload, backend mutation, asset deletion, or audio implementation is implied by this design.

## Out of scope

- Voice recognition, microphone selection, spoken prompts, sound effects, music, and audio settings.
- Typed-answer mode.
- Multiplayer, lives, levels, streak bonuses, daily challenges, achievements, or a fixed win condition.
- Refactoring or fixing Car King.
- Deleting the 91 source-library images not selected by gameplay.
- Full browser pre-cache/offline installation of all Animal Champion media.
- Migrating Animal Champion into the future `games/` package/SDK architecture or creating its package manifest.
- Production publication or app-store upload.
