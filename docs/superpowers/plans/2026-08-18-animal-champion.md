# Animal Champion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate a complete Animal Champion identification game with 50 animals, exactly 100 curated runtime images, Car King-equivalent multiple-choice mechanics, new wildlife visuals, platform points, and Tier 3 cross-device proof.

**Architecture:** Keep Car King unchanged and implement Animal Champion as a standalone DOM/CSS/ES-module game under its existing legacy public path. Separate immutable animal data, pure rules/timer logic, and the DOM controller; integrate the game through the generated content catalog and a narrowly scoped host policy that removes unnecessary iframe capabilities only for Animal Champion.

**Tech Stack:** Vanilla HTML/CSS/JavaScript ES modules, Node 24 built-in test runner, React 19/TypeScript host shell, Vite, the existing LAHS points bridge, built-in image generation, Pillow through the bundled workspace Python, Playwright CLI/browser tools, Capacitor Android, and PowerShell AAB inspection.

**Spec:** `docs/superpowers/specs/2026-08-18-animal-champion-design.md`

## Global Constraints

- Stable catalog/game ID: `animal-champion`.
- Stable runtime path: `/Games/Animal Champion/index.html`.
- Keep all Car King files and behavior unchanged.
- Keep all 191 existing Animal Champion WebPs unchanged; add exactly 16 new gameplay WebPs with new filenames.
- Runtime data must contain exactly 50 animals, exactly two distinct images each, and exactly 100 unique WebP paths: 84 approved existing files plus 16 generated replacements.
- Generate 18 original images: 16 gameplay replacements, one menu wallpaper, and one square thumbnail. Derive the 128 x 128 catalog thumbnail from the square thumbnail rather than generating it independently.
- No audio, speech, microphone, camera, fullscreen, geolocation, autoplay, or network capability is requested or delegated to Animal Champion in this phase.
- No Google Fonts, CDN runtime, new npm dependency, game engine, canvas, SVG gameplay, or service worker is introduced.
- Browser zoom remains available in standalone and `/play/animal-champion` launches.
- Correct answers award exactly 10 local score points, add one streak, and emit at most one 10-point platform event. Wrong answers and timeouts reset streak to zero.
- Challenger ends after the first wrong answer or timeout; Continuous advances indefinitely.
- All timers, image callbacks, and delayed transitions use run/round tokens so reset cannot be mutated by stale work.
- All generated asset import operations are source-preserving, explicit, non-overwriting, decode-checked, and atomic.
- Do not manually edit `src/generated/contentCatalog.ts`; run `npm run sync:content-catalog`.
- Preserve the existing dirty worktree. Before every commit, stage only the task-owned paths, inspect `git diff --cached --name-status` and `git diff --cached`, and leave unrelated user changes untouched.
- Recheck ownership immediately before Tasks 7-9. At plan time, `src/App.tsx` and `scripts/androidAssetPack.test.mjs` already contain unrelated tracked edits, while `scripts/content-parity.test.mjs` and `src/generated/contentCatalog.ts` are pre-existing untracked foundation files. Stage Animal Champion hunks interactively in dirty tracked files; never absorb a pre-existing untracked file into a commit unless its complete contents have been reviewed and deliberately accepted as part of this task.
- This is Tier 3. Final evidence must distinguish physical desktop, browser emulation/automation, Android artifact inspection, code review, and unavailable physical iPhone/iPad/Android checks.

---

### Task 1: Make the Animal Champion image pipeline non-destructive

**Files:**
- Modify: `scripts/optimize-animal-champion-images.py`
- Create: `scripts/animalChampionImagePipeline.test.mjs`

**Interfaces:**
- Consumes: Existing Animal Champion `Animals/` tree and `animals-manifest.json`.
- Produces: CLI actions `--import-source PATH --output PATH --preset PRESET`, `--refresh-manifest`, and `--check`; presets `animal`, `wallpaper`, `thumb`, and `catalog-thumb`.
- Guarantees: Sources are never removed or modified; existing destinations are refused; output is written to a sibling temporary file, decoded, then atomically renamed.

- [ ] **Step 1: Write a failing source-contract test**

Create `scripts/animalChampionImagePipeline.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pipelineUrl = new URL('./optimize-animal-champion-images.py', import.meta.url);

test('Animal Champion imports are explicit, atomic, and source preserving', async () => {
  const source = await readFile(pipelineUrl, 'utf8');

  assert.match(source, /--import-source/);
  assert.match(source, /--output/);
  assert.match(source, /--preset/);
  assert.match(source, /--refresh-manifest/);
  assert.match(source, /--check/);
  assert.match(source, /destination\.exists\(\)/);
  assert.match(source, /temp_path\.replace\(destination\)/);
  assert.doesNotMatch(source, /source_path\.unlink\(\)/);
});

test('Animal Champion pipeline defines every approved output size', async () => {
  const source = await readFile(pipelineUrl, 'utf8');

  assert.match(source, /["']animal["']\s*:\s*\(853,\s*1280\)/);
  assert.match(source, /["']wallpaper["']\s*:\s*\(1536,\s*1024\)/);
  assert.match(source, /["']thumb["']\s*:\s*\(1024,\s*1024\)/);
  assert.match(source, /["']catalog-thumb["']\s*:\s*\(128,\s*128\)/);
});
```

- [ ] **Step 2: Run the test and confirm the destructive pipeline fails the contract**

Run:

```powershell
node --test scripts/animalChampionImagePipeline.test.mjs
```

Expected: FAIL because the current script has no explicit CLI actions and still calls `source_path.unlink()`.

- [ ] **Step 3: Replace implicit recursive conversion with explicit CLI actions**

Use `argparse` and these exact preset dimensions:

```python
import argparse

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

PRESET_SIZES = {
    "animal": (853, 1280),
    "wallpaper": (1536, 1024),
    "thumb": (1024, 1024),
    "catalog-thumb": (128, 128),
}

parser = argparse.ArgumentParser()
actions = parser.add_mutually_exclusive_group(required=True)
actions.add_argument("--import-source", type=Path)
actions.add_argument("--refresh-manifest", action="store_true")
actions.add_argument("--check", action="store_true")
parser.add_argument("--output", type=Path)
parser.add_argument("--preset", choices=sorted(PRESET_SIZES))
```

For imports, require both `--output` and `--preset`. Accept any raster format Pillow can fully decode, including PNG, JPEG, and WebP; this is required because the catalog thumbnail is derived from the approved local `thumb.webp`. Resolve the destination and refuse any path outside either `public/Games/Animal Champion/` or `public/assets/thumbnails/optimized/`. Refuse an existing destination.

Normalize the approved source without cropping its defining anatomy:

```python
def prepare_canvas(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    normalized = ImageOps.exif_transpose(image).convert("RGB")
    if normalized.size[0] * size[1] == normalized.size[1] * size[0]:
        return normalized.resize(size, Image.Resampling.LANCZOS)

    backdrop = ImageOps.fit(normalized, size, Image.Resampling.LANCZOS)
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(radius=max(size) / 40))
    backdrop = ImageEnhance.Brightness(backdrop).enhance(0.55)
    foreground = ImageOps.contain(normalized, size, Image.Resampling.LANCZOS)
    left = (size[0] - foreground.width) // 2
    top = (size[1] - foreground.height) // 2
    backdrop.paste(foreground, (left, top))
    return backdrop
```

Save WebP with the existing quality fallback, verify by full Pillow load, and atomically replace only the temporary destination:

```python
if destination.exists():
    raise FileExistsError(f"Refusing to overwrite existing asset: {destination}")
temp_path = destination.with_name(f".{destination.name}.tmp")
try:
    save_webp(prepared, temp_path, PRIMARY_QUALITY)
    verify_image(temp_path)
    temp_path.replace(destination)
finally:
    if temp_path.exists():
        temp_path.unlink()
```

`--refresh-manifest` must enumerate all on-disk animal WebPs alphabetically and retain the existing JSON schema. `--check` must be read-only and fail on manifest/disk differences, decode failures, an animal without at least two images, or an image over 1.5 MiB.

- [ ] **Step 4: Run the pipeline tests and the real read-only audit**

Run:

```powershell
node --test scripts/animalChampionImagePipeline.test.mjs
$assetPython = 'C:\Users\Xator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $assetPython scripts\optimize-animal-champion-images.py --check
```

Expected: PASS; the read-only audit reports 50 animals and 191 WebPs without modifying the tree.

- [ ] **Step 5: Prove the audit was non-mutating**

Run:

```powershell
git status --short -- 'public/Games/Animal Champion' 'scripts/optimize-animal-champion-images.py' 'scripts/animalChampionImagePipeline.test.mjs'
```

Expected: only the pipeline and its test are modified/new; no existing Animal WebP or manifest is changed.

- [ ] **Step 6: Commit the safe pipeline**

```powershell
git add -- scripts/optimize-animal-champion-images.py scripts/animalChampionImagePipeline.test.mjs
git diff --cached --check
git commit -m "fix: make Animal Champion asset imports non-destructive"
```

---

### Task 2: Generate, import, and visually approve the 18 original assets

**Files:**
- Create: `public/Games/Animal Champion/Animals/Bat/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Cheetah/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Crocodile/animal-champion-primary.webp`
- Create: `public/Games/Animal Champion/Animals/Crocodile/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Giraffe/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Goat/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Gorilla/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Hippopotamus/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Octopus/animal-champion-primary.webp`
- Create: `public/Games/Animal Champion/Animals/Octopus/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Pig/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Rabbit/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Shark/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Snake/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Tiger/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/Animals/Zebra/animal-champion-secondary.webp`
- Create: `public/Games/Animal Champion/assets/images/ui/menu-wallpaper.webp`
- Create: `public/Games/Animal Champion/assets/images/ui/thumb.webp`
- Create: `public/assets/thumbnails/optimized/animal-champion-128.webp`
- Create: `public/Games/Animal Champion/assets/image-generation-prompts.json`
- Create: `scripts/animalChampionAssets.test.mjs`
- Modify: `public/Games/Animal Champion/animals-manifest.json`

**Interfaces:**
- Consumes: Safe import CLI from Task 1 and the approved curated paths in the spec.
- Produces: 16 gameplay WebPs at 853 x 1280, wallpaper at 1536 x 1024, local thumbnail at 1024 x 1024, derived catalog thumbnail at 128 x 128, and a machine-readable record of 18 image-generation calls.
- Prompt record shape: `{ schemaVersion: 1, assets: [{ id, kind, animal, prompt, generator, finalPath, width, height, qa }] }` where `generator` is `openai-imagegen` and `qa` is `approved-full-resolution`.

- [ ] **Step 1: Write the failing generated-asset contract**

Create `scripts/animalChampionAssets.test.mjs` with the complete required generated list:

```js
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = path.join(repoRoot, 'public', 'Games', 'Animal Champion');
const generatedGameplay = [
  'Animals/Bat/animal-champion-secondary.webp',
  'Animals/Cheetah/animal-champion-secondary.webp',
  'Animals/Crocodile/animal-champion-primary.webp',
  'Animals/Crocodile/animal-champion-secondary.webp',
  'Animals/Giraffe/animal-champion-secondary.webp',
  'Animals/Goat/animal-champion-secondary.webp',
  'Animals/Gorilla/animal-champion-secondary.webp',
  'Animals/Hippopotamus/animal-champion-secondary.webp',
  'Animals/Octopus/animal-champion-primary.webp',
  'Animals/Octopus/animal-champion-secondary.webp',
  'Animals/Pig/animal-champion-secondary.webp',
  'Animals/Rabbit/animal-champion-secondary.webp',
  'Animals/Shark/animal-champion-secondary.webp',
  'Animals/Snake/animal-champion-secondary.webp',
  'Animals/Tiger/animal-champion-secondary.webp',
  'Animals/Zebra/animal-champion-secondary.webp',
];

test('all approved generated originals and their prompt records exist', async () => {
  const promptPath = path.join(gameRoot, 'assets', 'image-generation-prompts.json');
  const ledger = JSON.parse(await readFile(promptPath, 'utf8'));
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.assets.length, 18);
  assert.equal(new Set(ledger.assets.map(({ finalPath }) => finalPath)).size, 18);

  for (const relativePath of generatedGameplay) {
    assert.ok((await stat(path.join(gameRoot, relativePath))).size > 0);
    assert.ok(ledger.assets.some(({ finalPath }) => finalPath === relativePath));
  }
});
```

Extend the test with the two UI originals and derived thumbnail. Assert the ledger contains the UI originals but does not list the derived 128 x 128 thumbnail as a generation call.

- [ ] **Step 2: Run the asset test and confirm it fails on the absent outputs**

Run:

```powershell
node --test scripts/animalChampionAssets.test.mjs
```

Expected: FAIL because none of the 18 original outputs or prompt ledger exists.

- [ ] **Step 3: Generate each gameplay image with one built-in image-generation call**

Before calls, read the `imagegen` skill. Use the built-in generator once per distinct asset. For every gameplay call, use this exact shared prompt followed by the corresponding exact subject directive from the table:

```text
Create a premium scientific-educational wildlife game illustration in 2:3 portrait composition. Show exactly one unmistakable animal species in a clean natural habitat, with the full animal and every defining feature visible inside a 12 percent safe margin. Child-safe confident posture, believable anatomy, clear eyes, clean silhouette, cinematic natural light, rich but realistic color, no humans, handlers, cages, prey, attack, gore, text, letters, numbers, labels, logos, signatures, or watermarks. The finished image must remain readable as a mobile multiple-choice game card.
```

| Final path | Exact subject directive appended to the shared prompt |
| --- | --- |
| `Animals/Bat/animal-champion-secondary.webp` | `A calm fruit bat gliding with two complete wings, both ears, both eyes, feet, and wing membranes fully visible; friendly rather than fanged or threatening.` |
| `Animals/Cheetah/animal-champion-secondary.webp` | `A cheetah in a natural side three-quarter run, slender build, solid black spots, black tear lines, long tail, and four coherent legs; unmistakably not a leopard.` |
| `Animals/Crocodile/animal-champion-primary.webp` | `Photoreal natural-history view of one crocodile resting beside water, one coherent head, narrow V-shaped snout, visible fourth lower tooth, long armored body and tail, mouth mostly closed.` |
| `Animals/Crocodile/animal-champion-secondary.webp` | `Bright premium wildlife illustration of one crocodile swimming calmly, one coherent head, narrow V-shaped snout, long armored body and tail, mouth closed.` |
| `Animals/Giraffe/animal-champion-secondary.webp` | `One full-body giraffe standing calmly on savanna, ossicones, ears, long neck, complete torso, four coherent legs, hooves, and tail all inside frame.` |
| `Animals/Goat/animal-champion-secondary.webp` | `One friendly domestic farm goat with modest curved horns, beard, cloven hooves, and full body; not an ibex, markhor, or mountain goat.` |
| `Animals/Gorilla/animal-champion-secondary.webp` | `One calm western lowland gorilla knuckle-walking in forest, natural proportions, complete hands and feet, closed mouth, no chest beating or King Kong pose.` |
| `Animals/Hippopotamus/animal-champion-secondary.webp` | `One calm full-body hippopotamus at a river edge, rounded barrel body, short legs, small ears, broad muzzle, closed mouth, no charge.` |
| `Animals/Octopus/animal-champion-primary.webp` | `Photoreal natural-history view of one common octopus underwater with exactly two visible eyes and exactly eight individually traceable anatomically plausible arms, no knots or extra arms.` |
| `Animals/Octopus/animal-champion-secondary.webp` | `Bright premium underwater wildlife illustration of one octopus with exactly two eyes and exactly eight individually traceable anatomically plausible arms, friendly natural posture, no monster styling.` |
| `Animals/Pig/animal-champion-secondary.webp` | `One friendly domestic farm pig in a meadow, exactly two ears, four coherent legs and cloven hooves, curly tail, natural snout, no duplicated anatomy.` |
| `Animals/Rabbit/animal-champion-secondary.webp` | `One alert cottontail rabbit in grass, exactly two natural eyes, two ears, four coherent paws, complete body and small tail, no smeared or humanlike features.` |
| `Animals/Shark/animal-champion-secondary.webp` | `One calm great white shark swimming in side three-quarter profile, complete dorsal and pectoral fins and tail, closed mouth, no exposed teeth, attack, diver, or prey.` |
| `Animals/Snake/animal-champion-secondary.webp` | `One calm nonvenomous green tree python coiled naturally on a branch, one coherent head and continuous body fully traceable inside frame, closed mouth, no strike pose.` |
| `Animals/Tiger/animal-champion-secondary.webp` | `One calm Bengal tiger walking in grass, complete full body, four coherent paws, long tail, clear orange-and-black stripes, closed mouth, no charge or attack.` |
| `Animals/Zebra/animal-champion-secondary.webp` | `One full-body plains zebra standing on savanna, two ears, mane, four coherent legs and hooves, complete striped torso and tail inside frame.` |

Inspect every generated result with `view_image` at full resolution. Reject and regenerate when the species, countable anatomy, safe margin, text-free requirement, or child-safe tone fails. Use the exact final prompt—not an earlier rejected prompt—in the ledger.

- [ ] **Step 4: Generate the two UI originals**

Use one distinct built-in image-generation call for each prompt:

`menu-wallpaper.webp` prompt:

```text
Create a text-free premium cinematic wildlife championship menu background in 3:2 landscape composition. Deep emerald jungle and midnight navy atmosphere, warm amber rim light, soft mist, subtle firefly-like particles, and elegant leaf-shaped light streaks. Arrange a realistic lion, elephant, giraffe, zebra, panda, eagle, dolphin, and tiger as one balanced wildlife ensemble with believable anatomy and scale; keep the central upper-middle area calm and dark enough for a large DOM title, and keep the main lion/elephant focal group safe when the sides are cropped for a phone portrait viewport. No crown text, words, letters, numbers, logos, signatures, watermarks, gore, prey, attack, cages, or humans.
```

`thumb.webp` prompt:

```text
Create a text-free square premium wildlife champion emblem for a family educational game. A calm noble lion portrait at the center, framed by a tasteful gold crown-and-leaf crest, with small accurate silhouettes of an elephant, giraffe, eagle, dolphin, tiger, panda, and zebra around it. Deep emerald and midnight navy background, polished amber-gold rim light, high contrast at thumbnail size, symmetrical readable composition, believable anatomy, no words, letters, numbers, logos, signatures, watermarks, gore, prey, attack, cages, or humans.
```

Inspect both at full resolution and reject any result containing malformed animals or text-like glyphs.

- [ ] **Step 5: Import only approved outputs through the safe pipeline**

For each built-in tool result, pass the exact returned local file path as `--import-source`; do not invent, glob, or reuse another call's path.

```powershell
$assetPython = 'C:\Users\Xator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'

& $assetPython scripts\optimize-animal-champion-images.py `
  --import-source $exactGeneratedSourcePath `
  --output 'public/Games/Animal Champion/Animals/Bat/animal-champion-secondary.webp' `
  --preset animal
```

Repeat with the explicit output from the 16-row table. Import the UI results with `--preset wallpaper` and `--preset thumb`, then derive the catalog thumbnail:

```powershell
& $assetPython scripts\optimize-animal-champion-images.py `
  --import-source $approvedWallpaperSourcePath `
  --output 'public/Games/Animal Champion/assets/images/ui/menu-wallpaper.webp' `
  --preset wallpaper

& $assetPython scripts\optimize-animal-champion-images.py `
  --import-source $approvedThumbSourcePath `
  --output 'public/Games/Animal Champion/assets/images/ui/thumb.webp' `
  --preset thumb

& $assetPython scripts\optimize-animal-champion-images.py `
  --import-source 'public/Games/Animal Champion/assets/images/ui/thumb.webp' `
  --output 'public/assets/thumbnails/optimized/animal-champion-128.webp' `
  --preset catalog-thumb
```

- [ ] **Step 6: Record prompts and refresh the source inventory**

Write `assets/image-generation-prompts.json` with exactly 18 entries. Use `kind: "gameplay"` for the 16 animal outputs, `kind: "ui"` for the wallpaper/thumb, `animal: null` for UI, exact final prompt text, exact final path, expected dimensions, `generator: "openai-imagegen"`, and `qa: "approved-full-resolution"`.

Then run:

```powershell
& $assetPython scripts\optimize-animal-champion-images.py --refresh-manifest
& $assetPython scripts\optimize-animal-champion-images.py --check
node --test scripts/animalChampionAssets.test.mjs
```

Expected: manifest has 50 entries and 207 WebP paths; generated-asset test passes.

- [ ] **Step 7: Prove no source asset was modified, renamed, or deleted**

Run:

```powershell
git diff --name-status 5fb2a45 -- 'public/Games/Animal Champion/Animals'
```

Expected: exactly 16 `A` records matching the specified paths and no `M`, `D`, or `R` record.

- [ ] **Step 8: Commit the approved asset set**

```powershell
git add -- 'public/Games/Animal Champion/Animals' 'public/Games/Animal Champion/assets' 'public/Games/Animal Champion/animals-manifest.json' 'public/assets/thumbnails/optimized/animal-champion-128.webp' scripts/animalChampionAssets.test.mjs
git diff --cached --check
git commit -m "feat: add curated Animal Champion artwork"
```

---

### Task 3: Lock the exact 50-animal, 100-image runtime contract

**Files:**
- Create: `public/Games/Animal Champion/js/animal-data.js`
- Modify: `scripts/animalChampionAssets.test.mjs`

**Interfaces:**
- Produces: `ANIMAL_DATABASE`, an immutable array of `{ id, name, alt, images }`; exactly 50 unique lowercase kebab IDs and two relative WebP paths per entry.
- Consumes: The exact runtime-selection table in the approved spec and all assets from Task 2.
- Later tasks import: `ANIMAL_DATABASE` from `./animal-data.js`.

- [ ] **Step 1: Extend the asset test so runtime data is required**

Append tests that import the future ES module and verify its entire contract:

```js
const dataUrl = new URL('../public/Games/Animal Champion/js/animal-data.js', import.meta.url);

test('runtime data selects exactly 50 animals and 100 unique images', async () => {
  const { ANIMAL_DATABASE } = await import(`${dataUrl.href}?test=${Date.now()}`);
  const ids = ANIMAL_DATABASE.map(({ id }) => id);
  const names = ANIMAL_DATABASE.map(({ name }) => name);
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);

  assert.equal(ANIMAL_DATABASE.length, 50);
  assert.equal(new Set(ids).size, 50);
  assert.equal(new Set(names).size, 50);
  assert.ok(ANIMAL_DATABASE.every(({ images }) => images.length === 2 && images[0] !== images[1]));
  assert.equal(paths.length, 100);
  assert.equal(new Set(paths).size, 100);
  assert.ok(paths.every((value) => value.endsWith('.webp')));
  assert.ok(paths.every((value) => !value.includes('chatgpt-third') && !value.includes('chatgpt-fourth')));
});
```

Add case-correct file existence, SHA-256 uniqueness, RIFF/WEBP signatures, manifest inclusion, 84 existing + 16 generated classification, new-file 853 x 1280 dimensions, UI dimensions, and ledger coverage.

Use a real WebP chunk parser rather than trusting extensions:

```js
const readWebpDimensions = (buffer) => {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP');
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const type = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    if (type === 'VP8X') {
      return {
        width: 1 + buffer.readUIntLE(data + 4, 3),
        height: 1 + buffer.readUIntLE(data + 7, 3),
      };
    }
    if (type === 'VP8 ') {
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    if (type === 'VP8L') {
      const bits = buffer.readUInt32LE(data + 1);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    offset = data + size + (size % 2);
  }
  throw new Error('WebP image chunk not found');
};
```

- [ ] **Step 2: Run the contract and confirm the data module is missing**

```powershell
node --test scripts/animalChampionAssets.test.mjs
```

Expected: FAIL with module-not-found for `js/animal-data.js`.

- [ ] **Step 3: Implement the immutable database**

Use this exact shape:

```js
const animal = (id, name, images) => Object.freeze({
  id,
  name,
  alt: `${/^[aeiou]/i.test(name) ? 'An' : 'A'} ${name.toLowerCase()} in its natural habitat`,
  images: Object.freeze(images),
});

export const ANIMAL_DATABASE = Object.freeze([
  animal('bat', 'Bat', [
    'Animals/Bat/chatgpt-generated.webp',
    'Animals/Bat/animal-champion-secondary.webp',
  ]),
  animal('bear', 'Bear', [
    'Animals/Bear/chatgpt-generated.webp',
    'Animals/Bear/chatgpt-anime.webp',
  ]),
  animal('camel', 'Camel', [
    'Animals/Camel/chatgpt-generated.webp',
    'Animals/Camel/chatgpt-anime.webp',
  ]),
  animal('cat', 'Cat', [
    'Animals/Cat/chatgpt-generated.webp',
    'Animals/Cat/chatgpt-anime.webp',
  ]),
  animal('cheetah', 'Cheetah', [
    'Animals/Cheetah/93ff7ae1-90a0-428d-8db7-fd4b3a9f54b0.webp',
    'Animals/Cheetah/animal-champion-secondary.webp',
  ]),
  animal('chicken', 'Chicken', [
    'Animals/Chicken/chatgpt-generated.webp',
    'Animals/Chicken/chatgpt-anime.webp',
  ]),
  animal('chimpanzee', 'Chimpanzee', [
    'Animals/Chimpanzee/chatgpt-generated.webp',
    'Animals/Chimpanzee/chatgpt-anime.webp',
  ]),
  animal('cow', 'Cow', [
    'Animals/Cow/chatgpt-generated.webp',
    'Animals/Cow/chatgpt-anime.webp',
  ]),
  animal('crocodile', 'Crocodile', [
    'Animals/Crocodile/animal-champion-primary.webp',
    'Animals/Crocodile/animal-champion-secondary.webp',
  ]),
  animal('deer', 'Deer', [
    'Animals/Deer/chatgpt-generated.webp',
    'Animals/Deer/chatgpt-anime.webp',
  ]),
  animal('dog', 'Dog', [
    'Animals/Dog/chatgpt-generated.webp',
    'Animals/Dog/chatgpt-anime.webp',
  ]),
  animal('dolphin', 'Dolphin', [
    'Animals/Dolphin/chatgpt-generated.webp',
    'Animals/Dolphin/chatgpt-anime.webp',
  ]),
  animal('donkey', 'Donkey', [
    'Animals/Donkey/chatgpt-generated.webp',
    'Animals/Donkey/chatgpt-anime.webp',
  ]),
  animal('duck', 'Duck', [
    'Animals/Duck/chatgpt-generated.webp',
    'Animals/Duck/chatgpt-anime.webp',
  ]),
  animal('eagle', 'Eagle', [
    'Animals/Eagle/chatgpt-generated.webp',
    'Animals/Eagle/chatgpt-anime.webp',
  ]),
  animal('elephant', 'Elephant', [
    'Animals/Elephant/d3635c1a-c89c-4039-9af6-ebd44c927d6b.webp',
    'Animals/Elephant/chatgpt-anime.webp',
  ]),
  animal('flamingo', 'Flamingo', [
    'Animals/Flamingo/chatgpt-generated.webp',
    'Animals/Flamingo/chatgpt-anime.webp',
  ]),
  animal('fox', 'Fox', [
    'Animals/Fox/chatgpt-generated.webp',
    'Animals/Fox/chatgpt-anime.webp',
  ]),
  animal('frog', 'Frog', [
    'Animals/Frog/chatgpt-generated.webp',
    'Animals/Frog/chatgpt-anime.webp',
  ]),
  animal('giraffe', 'Giraffe', [
    'Animals/Giraffe/chatgpt-generated.webp',
    'Animals/Giraffe/animal-champion-secondary.webp',
  ]),
  animal('goat', 'Goat', [
    'Animals/Goat/chatgpt-generated.webp',
    'Animals/Goat/animal-champion-secondary.webp',
  ]),
  animal('gorilla', 'Gorilla', [
    'Animals/Gorilla/chatgpt-generated.webp',
    'Animals/Gorilla/animal-champion-secondary.webp',
  ]),
  animal('hamster', 'Hamster', [
    'Animals/Hamster/chatgpt-generated.webp',
    'Animals/Hamster/chatgpt-anime.webp',
  ]),
  animal('hippopotamus', 'Hippopotamus', [
    'Animals/Hippopotamus/chatgpt-generated.webp',
    'Animals/Hippopotamus/animal-champion-secondary.webp',
  ]),
  animal('horse', 'Horse', [
    'Animals/Horse/chatgpt-generated.webp',
    'Animals/Horse/chatgpt-anime.webp',
  ]),
  animal('kangaroo', 'Kangaroo', [
    'Animals/Kangaroo/chatgpt-generated.webp',
    'Animals/Kangaroo/chatgpt-anime.webp',
  ]),
  animal('koala', 'Koala', [
    'Animals/Koala/chatgpt-generated.webp',
    'Animals/Koala/chatgpt-anime.webp',
  ]),
  animal('lion', 'Lion', [
    'Animals/Lion/chatgpt-generated.webp',
    'Animals/Lion/chatgpt-anime.webp',
  ]),
  animal('monkey', 'Monkey', [
    'Animals/Monkey/chatgpt-generated.webp',
    'Animals/Monkey/chatgpt-anime.webp',
  ]),
  animal('mouse', 'Mouse', [
    'Animals/Mouse/chatgpt-generated.webp',
    'Animals/Mouse/chatgpt-anime.webp',
  ]),
  animal('octopus', 'Octopus', [
    'Animals/Octopus/animal-champion-primary.webp',
    'Animals/Octopus/animal-champion-secondary.webp',
  ]),
  animal('owl', 'Owl', [
    'Animals/Owl/chatgpt-generated.webp',
    'Animals/Owl/chatgpt-anime.webp',
  ]),
  animal('panda', 'Panda', [
    'Animals/Panda/chatgpt-generated.webp',
    'Animals/Panda/chatgpt-anime.webp',
  ]),
  animal('parrot', 'Parrot', [
    'Animals/Parrot/chatgpt-generated.webp',
    'Animals/Parrot/chatgpt-anime.webp',
  ]),
  animal('peacock', 'Peacock', [
    'Animals/Peacock/chatgpt-generated.webp',
    'Animals/Peacock/chatgpt-anime.webp',
  ]),
  animal('penguin', 'Penguin', [
    'Animals/Penguin/chatgpt-generated.webp',
    'Animals/Penguin/chatgpt-anime.webp',
  ]),
  animal('pig', 'Pig', [
    'Animals/Pig/chatgpt-generated.webp',
    'Animals/Pig/animal-champion-secondary.webp',
  ]),
  animal('polar-bear', 'Polar Bear', [
    'Animals/Polar Bear/chatgpt-generated.webp',
    'Animals/Polar Bear/chatgpt-anime.webp',
  ]),
  animal('rabbit', 'Rabbit', [
    'Animals/Rabbit/chatgpt-generated.webp',
    'Animals/Rabbit/animal-champion-secondary.webp',
  ]),
  animal('rhinoceros', 'Rhinoceros', [
    'Animals/Rhinoceros/chatgpt-generated.webp',
    'Animals/Rhinoceros/chatgpt-anime.webp',
  ]),
  animal('seal', 'Seal', [
    'Animals/Seal/chatgpt-generated.webp',
    'Animals/Seal/chatgpt-anime.webp',
  ]),
  animal('shark', 'Shark', [
    'Animals/Shark/chatgpt-generated.webp',
    'Animals/Shark/animal-champion-secondary.webp',
  ]),
  animal('sheep', 'Sheep', [
    'Animals/Sheep/chatgpt-generated.webp',
    'Animals/Sheep/chatgpt-anime.webp',
  ]),
  animal('snake', 'Snake', [
    'Animals/Snake/chatgpt-generated.webp',
    'Animals/Snake/animal-champion-secondary.webp',
  ]),
  animal('squirrel', 'Squirrel', [
    'Animals/Squirrel/chatgpt-generated.webp',
    'Animals/Squirrel/chatgpt-anime.webp',
  ]),
  animal('tiger', 'Tiger', [
    'Animals/Tiger/chatgpt-generated.webp',
    'Animals/Tiger/animal-champion-secondary.webp',
  ]),
  animal('turtle', 'Turtle', [
    'Animals/Turtle/chatgpt-generated.webp',
    'Animals/Turtle/chatgpt-anime.webp',
  ]),
  animal('whale', 'Whale', [
    'Animals/Whale/chatgpt-generated.webp',
    'Animals/Whale/chatgpt-anime.webp',
  ]),
  animal('wolf', 'Wolf', [
    'Animals/Wolf/chatgpt-generated.webp',
    'Animals/Wolf/chatgpt-anime.webp',
  ]),
  animal('zebra', 'Zebra', [
    'Animals/Zebra/chatgpt-generated.webp',
    'Animals/Zebra/animal-champion-secondary.webp',
  ]),
]);
```

Do not add aliases, facts, audio paths, unused answer text, or a third image.

- [ ] **Step 4: Run the complete asset contract**

```powershell
node --test scripts/animalChampionAssets.test.mjs
$assetPython = 'C:\Users\Xator\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
& $assetPython scripts\optimize-animal-champion-images.py --check
```

Expected: PASS with 50 animals, 100 unique selected paths, 207 source-library WebPs, and 18 prompt records.

- [ ] **Step 5: Commit runtime content data**

```powershell
git add -- 'public/Games/Animal Champion/js/animal-data.js' scripts/animalChampionAssets.test.mjs
git diff --cached --check
git commit -m "feat: define Animal Champion runtime roster"
```

---

### Task 4: Implement the pure game engine and pausable deadline

**Files:**
- Create: `public/Games/Animal Champion/js/game-engine.js`
- Create: `scripts/animalChampionEngine.test.mjs`

**Interfaces:**
- Consumes: `ANIMAL_DATABASE` and an injectable `random` function.
- Produces: `MODES`, `OUTCOMES`, `ANSWER_WINDOW_MS`, `FEEDBACK_DELAY_MS`, `AnimalChampionEngine`, `createPausableDeadline`, `normalizeLeaderboard`, and `recordLeaderboardScore`.
- Engine methods: `startRun(mode)`, `beginRound()`, `activateRound(roundId, imagePath)`, `submitChoice(roundId, animalId)`, `timeout(roundId)`, `discardBrokenRound(roundId)`, `finishFeedback()`, `reset()`, and `getState()`.

- [ ] **Step 1: Write failing tests for the complete rules contract**

Create `scripts/animalChampionEngine.test.mjs` and directly import both browser modules under Node 24:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';
import {
  AnimalChampionEngine,
  MODES,
  createPausableDeadline,
  normalizeLeaderboard,
  recordLeaderboardScore,
} from '../public/Games/Animal Champion/js/game-engine.js';

const buildEngine = () => new AnimalChampionEngine({
  animals: ANIMAL_DATABASE,
  random: () => 0.25,
});

test('one shuffled deck shows all 50 animals before any repeat', () => {
  const engine = buildEngine();
  engine.startRun(MODES.CONTINUOUS);
  const seen = [];
  for (let index = 0; index < 50; index += 1) {
    const round = engine.beginRound();
    seen.push(round.correctAnimalId);
    engine.activateRound(round.roundId, round.imageOrder[0]);
    engine.submitChoice(round.roundId, round.correctAnimalId);
    engine.finishFeedback();
  }
  assert.equal(new Set(seen).size, 50);
  assert.notEqual(engine.beginRound().correctAnimalId, seen.at(-1));
});

test('a round has four distinct choices and accepts only one result', () => {
  const engine = buildEngine();
  engine.startRun(MODES.CONTINUOUS);
  const round = engine.beginRound();
  assert.equal(round.choiceIds.length, 4);
  assert.equal(new Set(round.choiceIds).size, 4);
  assert.ok(round.choiceIds.includes(round.correctAnimalId));
  engine.activateRound(round.roundId, round.imageOrder[0]);
  const first = engine.submitChoice(round.roundId, round.correctAnimalId);
  const second = engine.submitChoice(round.roundId, round.correctAnimalId);
  assert.deepEqual(
    { accepted: first.accepted, score: first.score, streak: first.streak, platformPoints: first.platformPoints },
    { accepted: true, score: 10, streak: 1, platformPoints: 10 },
  );
  assert.equal(second.accepted, false);
});

test('wrong and timeout reset streak and branch by mode', () => {
  for (const mode of [MODES.CHALLENGER, MODES.CONTINUOUS]) {
    const engine = buildEngine();
    engine.startRun(mode);
    let round = engine.beginRound();
    engine.activateRound(round.roundId, round.imageOrder[0]);
    engine.submitChoice(round.roundId, round.correctAnimalId);
    engine.finishFeedback();
    round = engine.beginRound();
    engine.activateRound(round.roundId, round.imageOrder[0]);
    const wrongId = round.choiceIds.find((id) => id !== round.correctAnimalId);
    const result = engine.submitChoice(round.roundId, wrongId);
    assert.equal(result.streak, 0);
    assert.equal(result.endsRun, mode === MODES.CHALLENGER);
  }
});
```

Add tests for timeout, reset/fresh deck, stale round IDs, two-image alternating preference, one-image fallback ordering, all-broken recoverable exhaustion, leaderboard corruption/top-three behavior, and a pausable deadline that does not consume hidden time.

- [ ] **Step 2: Run tests and confirm the engine module is absent**

```powershell
node --test scripts/animalChampionEngine.test.mjs
```

Expected: FAIL with module-not-found for `game-engine.js`.

- [ ] **Step 3: Implement constants and engine state**

Use exact constants and immutable public snapshots:

```js
export const MODES = Object.freeze({ CHALLENGER: 'challenger', CONTINUOUS: 'continuous' });
export const OUTCOMES = Object.freeze({ CORRECT: 'correct', WRONG: 'wrong', TIMEOUT: 'timeout' });
export const ANSWER_WINDOW_MS = 15_000;
export const FEEDBACK_DELAY_MS = 2_000;
export const POINTS_PER_CORRECT = 10;

export class AnimalChampionEngine {
  constructor({ animals, random = Math.random }) {
    if (!Array.isArray(animals) || animals.length < 4) throw new TypeError('At least four animals are required');
    this.animals = animals;
    this.random = random;
    this.runSequence = 0;
    this.imagePreference = new Map();
    this.reset();
  }

  getState() {
    return structuredClone(this.state);
  }
}
```

Implement Fisher-Yates with the injected random source. When refilling, prevent the first new draw from equaling the previous draw. `startRun()` clears score, streak, broken IDs, current round, pending outcome, and deck, then creates a new run ID. Image preference survives within the page session and alternates the first attempted image for each animal.

- [ ] **Step 4: Implement one locked outcome path**

Both choice and timeout resolution must call one internal method after checking `phase === 'answering'` and the exact round ID:

```js
resolveOutcome(outcome, selectedAnimalId = null) {
  if (this.state.phase !== 'answering') return { accepted: false };
  const round = this.state.currentRound;
  this.state.phase = 'feedback';
  const correct = outcome === OUTCOMES.CORRECT;
  this.state.score += correct ? POINTS_PER_CORRECT : 0;
  this.state.streak = correct ? this.state.streak + 1 : 0;
  const endsRun = !correct && this.state.mode === MODES.CHALLENGER;
  this.state.pendingEnd = endsRun;
  return {
    accepted: true,
    outcome,
    selectedAnimalId,
    correctAnimalId: round.correctAnimalId,
    score: this.state.score,
    streak: this.state.streak,
    platformPoints: correct ? POINTS_PER_CORRECT : 0,
    eventId: correct ? `${this.state.runId}:${round.roundId}:correct` : null,
    endsRun,
  };
}
```

`finishFeedback()` changes to `game-over` when `pendingEnd` is true; otherwise it changes to `ready`. `discardBrokenRound()` is valid only during image loading, marks the animal broken for the current run, and returns to `ready` without changing score/streak.

- [ ] **Step 5: Implement leaderboard and pausable deadline helpers**

`normalizeLeaderboard(raw)` accepts unknown input, keeps positive finite integer scores, preserves valid ISO dates, sorts descending, and returns at most three. `recordLeaderboardScore(raw, score, date)` ignores score zero and returns the normalized top three.

`createPausableDeadline()` accepts injected `now`, `requestFrame`, and `cancelFrame`; expose `start()`, `pause()`, `resume()`, `stop()`, and `getRemainingMs()`. Subtract elapsed time only while running, call `onTick(remainingMs, remainingMs / durationMs)` each frame, and call `onExpire()` exactly once at zero.

- [ ] **Step 6: Run engine and asset contracts**

```powershell
node --test scripts/animalChampionEngine.test.mjs scripts/animalChampionAssets.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Commit the pure engine**

```powershell
git add -- 'public/Games/Animal Champion/js/game-engine.js' scripts/animalChampionEngine.test.mjs
git diff --cached --check
git commit -m "feat: add Animal Champion game engine"
```

---

### Task 5: Build the semantic wildlife UI shell and responsive theme

**Files:**
- Create: `public/Games/Animal Champion/index.html`
- Create: `public/Games/Animal Champion/css/style.css`
- Create: `scripts/animalChampionRuntime.test.mjs`

**Interfaces:**
- Produces: Stable DOM IDs consumed by `game.js`: `menuReveal`, `menuPanel`, `modeChallenger`, `modeContinuous`, `startButton`, `countdownScreen`, `countdownValue`, `gameScreen`, `scoreValue`, `streakValue`, `newGameButton`, `animalBackdrop`, `animalImage`, `timerBar`, `timerRegion`, `choiceGrid`, `feedback`, `gameOverScreen`, `finalScore`, `leaderboard`, `playAgainButton`, `mainMenuButton`, `errorScreen`, `errorMessage`, `retryButton`, and `errorMenuButton`.
- Consumes: UI artwork from Task 2.
- No controller script is referenced until Task 6; this task's independently reviewable deliverable is the semantic/responsive shell.

- [ ] **Step 1: Write failing static accessibility/theme tests**

Create `scripts/animalChampionRuntime.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Animal Champion shell uses semantic controls and preserves zoom', async () => {
  const html = await read('public/Games/Animal Champion/index.html');
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/);
  assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/i);
  assert.match(html, /<button[^>]+id="menuReveal"/);
  assert.match(html, /id="feedback"[^>]+aria-live="polite"/);
  assert.match(html, /id="timerRegion"[^>]+role="progressbar"/);
  assert.match(html, /\.\.\/shared\/lahsPointsBridge\.js/);
  assert.doesNotMatch(html, /<audio|googleapis|gstatic|microphone|speech/i);
});

test('Animal Champion CSS covers safe areas, reduced motion, and touch sizing', async () => {
  const css = await read('public/Games/Animal Champion/css/style.css');
  assert.match(css, /env\(safe-area-inset-top\)/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /min-height:\s*48px/);
  assert.match(css, /aspect-ratio:\s*4\s*\/\s*3/);
  assert.match(css, /object-fit:\s*contain/);
  assert.match(css, /filter:\s*blur/);
});
```

- [ ] **Step 2: Run tests and confirm HTML/CSS are missing**

```powershell
node --test scripts/animalChampionRuntime.test.mjs
```

Expected: FAIL with missing `index.html` or `css/style.css`.

- [ ] **Step 3: Create the complete semantic screen hierarchy**

Use a native button for menu reveal, native mode/start/choice/action buttons, headings in document order, and `hidden` for inactive screens. The structural core must be:

```html
<main id="animalChampionApp" class="app-shell">
  <section id="menuScreen" class="screen screen--menu" aria-labelledby="gameTitle">
    <div class="menu-hero">
      <span class="eyebrow">The wild challenge begins</span>
      <h1 id="gameTitle"><span>Animal</span> <span>Champion</span></h1>
    </div>
    <button id="menuReveal" class="menu-reveal" type="button" aria-expanded="false" aria-controls="menuPanel">
      <span class="menu-reveal__prompt">Click anywhere to begin</span>
    </button>
    <div id="menuPanel" class="menu-panel" hidden>
      <div class="mode-toggle" role="group" aria-label="Game mode">
        <button id="modeChallenger" type="button" aria-pressed="true">Challenger</button>
        <button id="modeContinuous" type="button" aria-pressed="false">Continuous</button>
      </div>
      <button id="startButton" type="button">Start Game</button>
    </div>
  </section>
  <section id="countdownScreen" class="screen" aria-live="assertive" hidden>
    <p id="countdownValue">3</p>
  </section>
  <section id="gameScreen" class="screen" aria-labelledby="questionText" hidden>
    <header class="game-hud">
      <p>Score <strong id="scoreValue">0</strong></p>
      <p>Streak <strong id="streakValue">0</strong></p>
      <button id="newGameButton" type="button">New Game</button>
    </header>
    <figure class="animal-stage">
      <img id="animalBackdrop" alt="" aria-hidden="true" />
      <img id="animalImage" alt="" decoding="async" />
    </figure>
    <h2 id="questionText">Which animal is this?</h2>
    <div id="timerRegion" role="progressbar" aria-label="Time remaining" aria-valuemin="0" aria-valuemax="15" aria-valuenow="15"><span id="timerBar"></span></div>
    <div id="choiceGrid" class="choice-grid" aria-label="Animal choices"></div>
    <p id="feedback" class="feedback" aria-live="polite"></p>
  </section>
  <section id="gameOverScreen" class="screen" aria-labelledby="gameOverTitle" hidden>
    <div class="game-over-card">
      <p class="eyebrow">Wildlife results</p>
      <h2 id="gameOverTitle">Challenge Complete</h2>
      <p>Final score <strong id="finalScore">0</strong></p>
      <section aria-labelledby="leaderboardTitle">
        <h3 id="leaderboardTitle">Top Scores</h3>
        <ol id="leaderboard"></ol>
      </section>
      <div class="action-row">
        <button id="playAgainButton" type="button">Play Again</button>
        <button id="mainMenuButton" type="button">Main Menu</button>
      </div>
    </div>
  </section>
  <section id="errorScreen" class="screen" aria-labelledby="errorTitle" hidden>
    <div class="error-card">
      <h2 id="errorTitle">We lost the animal trail</h2>
      <p id="errorMessage">The animal images could not be loaded. Try again or return to the menu.</p>
      <div class="action-row">
        <button id="retryButton" type="button">Try Again</button>
        <button id="errorMenuButton" type="button">Main Menu</button>
      </div>
    </div>
  </section>
</main>
<script src="../shared/lahsPointsBridge.js"></script>
```

Do not add settings, audio, microphone, fullscreen, or typed-answer controls.

- [ ] **Step 4: Implement the full visual token and responsive system**

Define local/system font stacks and these theme tokens:

```css
:root {
  --ink-950: #06110f;
  --jungle-900: #0a211a;
  --jungle-700: #145c43;
  --emerald-400: #31d79b;
  --gold-300: #f6cf72;
  --gold-500: #d79a2b;
  --coral-400: #fb7185;
  --ivory-100: #fff9e8;
  --glass: rgb(6 25 21 / 78%);
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-right: env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
```

Use the menu wallpaper as a cover layer, DOM text for the title, CSS mist/leaf/light particles, glass cards, visible `:focus-visible`, text/icon plus color for result states, and a 4:3 animal stage with one blurred `cover` backdrop plus one uncropped `contain` foreground. Make `menuReveal` a visually integrated full-width hero action so pointer users can activate the opening surface without placing the heading inside the button.

At <= 640px use a single-column game card; in phone landscape place the image and answer column side-by-side when height allows. At tablet/desktop cap the content width while keeping all four choices visible. Apply top/right/bottom/left safe-area padding to every screen.

In `prefers-reduced-motion: reduce`, set continuous animation to `none`, remove shakes/large transforms, and reduce transition duration to near-zero without hiding state changes.

- [ ] **Step 5: Run static/runtime and literal-path audits**

```powershell
node --test scripts/animalChampionRuntime.test.mjs
npm run audit:games
```

Expected: PASS; `audit:games` finds every literal stylesheet, image, and shared bridge reference.

- [ ] **Step 6: Open the static shell at required reference sizes**

Start `npm run dev:live`, then inspect the standalone URL at 1440 x 900, 390 x 844, 393 x 852, 1024 x 1366, 1366 x 1024, and 852 x 393. Verify no title, panel, HUD, choice container, or action is clipped before adding runtime behavior.

- [ ] **Step 7: Commit the semantic UI shell**

```powershell
git add -- 'public/Games/Animal Champion/index.html' 'public/Games/Animal Champion/css/style.css' scripts/animalChampionRuntime.test.mjs
git diff --cached --check
git commit -m "feat: add Animal Champion wildlife interface"
```

---

### Task 6: Implement the DOM controller, image fallback, persistence, and points bridge

**Files:**
- Create: `public/Games/Animal Champion/js/game.js`
- Modify: `public/Games/Animal Champion/index.html`
- Modify: `scripts/animalChampionRuntime.test.mjs`

**Interfaces:**
- Consumes: `ANIMAL_DATABASE`, `AnimalChampionEngine`, `createPausableDeadline`, stable DOM IDs, and `window.LAHSPointsBridge`.
- Produces: Fully playable menu/countdown/round/feedback/game-over/error flow; one platform event per accepted correct answer; safe local leaderboard under `animalChampionLeaderboard`.
- Timing: countdown displays 3, 2, 1, GO over 4,000 ms plus a 500 ms GO hold; answer window is 15,000 ms; feedback delay is 2,000 ms.

- [ ] **Step 1: Extend static tests with the controller contract**

Add:

```js
test('Animal Champion controller is module-based, audio-free, and points-aware', async () => {
  const [html, game] = await Promise.all([
    read('public/Games/Animal Champion/index.html'),
    read('public/Games/Animal Champion/js/game.js'),
  ]);
  assert.match(html, /<script type="module" src="\.\/js\/game\.js"><\/script>/);
  assert.match(game, /LAHSPointsBridge\?\.init\(\{\s*gameId:\s*['"]animal-champion['"]/);
  assert.match(game, /awardPoints\(10,/);
  assert.match(game, /animalChampionLeaderboard/);
  assert.match(game, /visibilitychange/);
  assert.match(game, /runToken/);
  assert.match(game, /roundToken/);
  assert.doesNotMatch(game, /AudioContext|new Audio|microphone|SpeechRecognition|getUserMedia/i);
});
```

- [ ] **Step 2: Run the test and confirm the controller is missing**

```powershell
node --test scripts/animalChampionRuntime.test.mjs
```

Expected: FAIL with missing `js/game.js`.

- [ ] **Step 3: Implement centralized DOM/state setup and cleanup**

Create an `AnimalChampionController` with one engine instance, one current deadline, one countdown frame, a set of pending timeout IDs, `runToken`, and `roundToken`. Query every required element through a helper that throws a descriptive startup error.

Use these cleanup primitives:

```js
invalidateRun() {
  this.runToken += 1;
  this.roundToken += 1;
  this.deadline?.stop();
  this.deadline = null;
  cancelAnimationFrame(this.countdownFrame);
  this.pendingTimeouts.forEach((id) => clearTimeout(id));
  this.pendingTimeouts.clear();
}

delay(callback, delayMs, runToken = this.runToken, roundToken = this.roundToken) {
  const id = setTimeout(() => {
    this.pendingTimeouts.delete(id);
    if (runToken === this.runToken && roundToken === this.roundToken) callback();
  }, delayMs);
  this.pendingTimeouts.add(id);
}
```

All New Game, Main Menu, Play Again, fatal error, and teardown paths call `invalidateRun()` before changing screens.

- [ ] **Step 4: Implement menu, modes, and drift-safe countdown**

Menu reveal sets `aria-expanded="true"`, unhides the panel, and focuses Challenger. Mode buttons update engine mode plus both `aria-pressed` values. Start resets the run, generates a new token, and drives countdown labels from `performance.now()` rather than decrementing intervals.

Use the exact timeline: 0-999 ms `3`, 1000-1999 `2`, 2000-2999 `1`, 3000-3999 `GO`, then hold GO for 500 ms and begin the first image load.

- [ ] **Step 5: Implement bounded image loading before the timer**

For each `beginRound()` result, try `imageOrder[0]`, then `imageOrder[1]`. Use a new `Image()` and await `decode()` when available. Verify run/round tokens after every asynchronous boundary. On success, set both backdrop and foreground sources, set one meaningful foreground alt, call `activateRound()`, render choices, then start the deadline at exactly 15 seconds.

If both images fail, call `discardBrokenRound()` and begin another round. If `beginRound()` returns `null` because all usable animals are exhausted, show the recoverable error screen. Never start or decrement the timer while an image is loading.

- [ ] **Step 6: Implement answer locking, feedback, and nonblocking platform points**

Render four native buttons from `choiceIds`. Every activation calls `submitChoice(roundId, choiceId)` once. When `accepted` is false, return without UI/score/reward work. When accepted, immediately stop the deadline and disable every choice.

For correct answers:

```js
window.LAHSPointsBridge?.awardPoints(10, {
  eventId: result.eventId,
  label: 'Correct animal identification',
  meta: { animalName: correctAnimal.name, gameMode: this.engine.getState().mode },
});
```

Do not await an ACK or branch progression on the bridge return value. Correct feedback includes the animal name; wrong/timeout mark and name the correct choice, reset the streak display, and use text/icon plus color. After 2,000 ms call `finishFeedback()` and either load the next round or show game over.

- [ ] **Step 7: Implement visibility pause, leaderboard safety, and actions**

On `document.visibilitychange`, pause the deadline while hidden and resume when visible. Wrap all localStorage reads/writes in `try/catch`; corrupt JSON becomes an empty leaderboard and storage denial never blocks game over. Render only three positive scores. Play Again creates a fresh engine run and countdown; Main Menu and Error Main Menu invalidate the run, reset, and return to the revealed panel; New Game resets and returns to menu. Try Again invalidates the failed run, clears the per-run broken-animal set through `startRun()`, and restarts the countdown in the currently selected mode.

Initialize points after the shared script loads:

```js
window.LAHSPointsBridge?.init({ gameId: 'animal-champion' });
new AnimalChampionController({ document, window }).start();
```

Add `<script type="module" src="./js/game.js"></script>` after the shared bridge script.

- [ ] **Step 8: Run focused contracts and content audit**

```powershell
node --test scripts/animalChampionAssets.test.mjs scripts/animalChampionEngine.test.mjs scripts/animalChampionRuntime.test.mjs
npm run audit:games
```

Expected: PASS.

- [ ] **Step 9: Manually smoke both modes before host integration**

At the standalone URL, verify reveal -> mode -> countdown -> image -> four choices -> correct feedback -> next round; wrong/timeout ends Challenger; wrong/timeout continues Continuous; rapid double activation changes score only once; points-host absence does not stall.

- [ ] **Step 10: Commit the playable standalone runtime**

```powershell
git add -- 'public/Games/Animal Champion/index.html' 'public/Games/Animal Champion/js/game.js' scripts/animalChampionRuntime.test.mjs
git diff --cached --check
git commit -m "feat: make Animal Champion fully playable"
```

---

### Task 7: Add the least-privilege Animal Champion host policy

**Files:**
- Create: `src/utils/gameHostPolicy.ts`
- Create: `scripts/gameHostPolicy.test.mjs`
- Modify: `src/App.tsx:137-250`
- Modify: `src/layouts/MainLayout.tsx:35-69`
- Modify: `src/pages/GamePlayer.tsx:39-52,136-276,832-857`

**Interfaces:**
- Produces: `ANIMAL_CHAMPION_GAME_ID`, `getGameHostPolicy(gameId)`, `getGameIdFromHostRoute(pathname)`, and `getGameHostPolicyForRoute(pathname)`.
- Animal policy: `{ lockZoom: false, requiresNativeFullscreen: false, iframeAllow: undefined, allowFullScreen: false }`.
- Default policy preserves the current `{ lockZoom: true, requiresNativeFullscreen: true, iframeAllow: 'autoplay; fullscreen; camera; microphone; geolocation', allowFullScreen: true }` behavior for every other game.

- [ ] **Step 1: Write failing policy tests**

Create `scripts/gameHostPolicy.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getGameHostPolicy,
  getGameIdFromHostRoute,
} from '../src/utils/gameHostPolicy.ts';

test('Animal Champion receives the least-privilege host policy', () => {
  assert.deepEqual(getGameHostPolicy('animal-champion'), {
    lockZoom: false,
    requiresNativeFullscreen: false,
    iframeAllow: undefined,
    allowFullScreen: false,
  });
});

test('other and near-match games retain legacy host behavior', () => {
  for (const id of ['math-car-king', 'animal-champion-2', null]) {
    const policy = getGameHostPolicy(id);
    assert.equal(policy.lockZoom, true);
    assert.equal(policy.requiresNativeFullscreen, true);
    assert.equal(policy.allowFullScreen, true);
    assert.equal(policy.iframeAllow, 'autoplay; fullscreen; camera; microphone; geolocation');
  }
});

test('only exact play/open routes resolve to Animal Champion', () => {
  assert.equal(getGameIdFromHostRoute('/play/animal-champion'), 'animal-champion');
  assert.equal(getGameIdFromHostRoute('/open/animal-champion'), 'animal-champion');
  assert.equal(getGameIdFromHostRoute('/play/animal-champion-2'), 'animal-champion-2');
  assert.equal(getGameIdFromHostRoute('/apps'), null);
});
```

- [ ] **Step 2: Run tests and confirm the policy module is missing**

```powershell
node --test scripts/gameHostPolicy.test.mjs
```

Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement the pure policy module**

```ts
export const ANIMAL_CHAMPION_GAME_ID = 'animal-champion';

export type GameHostPolicy = Readonly<{
  lockZoom: boolean;
  requiresNativeFullscreen: boolean;
  iframeAllow: string | undefined;
  allowFullScreen: boolean;
}>;

const DEFAULT_POLICY: GameHostPolicy = Object.freeze({
  lockZoom: true,
  requiresNativeFullscreen: true,
  iframeAllow: 'autoplay; fullscreen; camera; microphone; geolocation',
  allowFullScreen: true,
});

const ANIMAL_CHAMPION_POLICY: GameHostPolicy = Object.freeze({
  lockZoom: false,
  requiresNativeFullscreen: false,
  iframeAllow: undefined,
  allowFullScreen: false,
});

export const getGameHostPolicy = (gameId: string | null | undefined): GameHostPolicy =>
  gameId === ANIMAL_CHAMPION_GAME_ID ? ANIMAL_CHAMPION_POLICY : DEFAULT_POLICY;

export const getGameIdFromHostRoute = (pathname: string): string | null => {
  const match = pathname.match(/^\/(?:play|open)\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const getGameHostPolicyForRoute = (pathname: string): GameHostPolicy =>
  getGameHostPolicy(getGameIdFromHostRoute(pathname));
```

- [ ] **Step 4: Wire all three independent host enforcement layers**

In `App.tsx`, make exact Animal Champion play/open routes fullscreen-exempt in the global PWA wrapper by combining `FULLSCREEN_EXEMPT_ROUTES` with `getGameHostPolicyForRoute(location.pathname).requiresNativeFullscreen`.

In `MainLayout.tsx`, retain the existing zoom decision for all routes except when `getGameHostPolicyForRoute(location.pathname).lockZoom` is false.

In `GamePlayer.tsx`, compute `gameHostPolicy = getGameHostPolicy(currentGameId ?? id)` before using it. Pass `enabled: gameHostPolicy.lockZoom` to the iframe-aware zoom hook, include `gameHostPolicy.requiresNativeFullscreen` in `requiresRouteFullscreen`, render `allow={gameHostPolicy.iframeAllow}`, and render `allowFullScreen={gameHostPolicy.allowFullScreen}`. Do not alter Car King speech handling.

- [ ] **Step 5: Extend tests to prove source wiring and default preservation**

Read `App.tsx`, `MainLayout.tsx`, and `GamePlayer.tsx` in the policy test. Assert each imports/uses the policy, and assert the previous permission string exists only in `gameHostPolicy.ts`, not as a hard-coded iframe prop.

- [ ] **Step 6: Run policy tests and typecheck**

```powershell
node --test scripts/gameHostPolicy.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit the narrow host policy**

```powershell
git add -- src/utils/gameHostPolicy.ts scripts/gameHostPolicy.test.mjs src/layouts/MainLayout.tsx src/pages/GamePlayer.tsx
git add -p -- src/App.tsx
git diff --cached --check
git diff --cached --name-status
git diff --cached
git commit -m "feat: apply least-privilege Animal Champion host policy"
```

---

### Task 8: Register Animal Champion in catalog, home, and platform points

**Files:**
- Modify: `src/data/content/science.ts`
- Modify: `src/pages/Home.tsx:29-40`
- Modify: `src/utils/gamePoints.ts:6-17`
- Modify: `scripts/content-parity.test.mjs`
- Create: `scripts/animalChampionIntegration.test.mjs`
- Regenerate: `src/generated/contentCatalog.ts`

**Interfaces:**
- Produces: one science game entry with ID `animal-champion`, one `/play/animal-champion` launch target through existing generic routing, single-player home membership, and points allowlist membership.
- No game-specific React route and no experience manifest are added.

- [ ] **Step 1: Write failing catalog/classification/points tests**

Create `scripts/animalChampionIntegration.test.mjs`:

```js
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { readLegacyContentEntries } from './content/source-reader.mjs';
import { isSinglePlayerPointsGameId } from '../src/utils/gamePoints.ts';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

test('Animal Champion is one science catalog game with the exact legacy path', () => {
  const entries = readLegacyContentEntries({ repoRoot });
  const matches = entries.filter(({ id }) => id === 'animal-champion');
  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], {
    id: 'animal-champion',
    title: 'Animal Champion',
    description: 'Identify 50 animals in fast visual challenge rounds.',
    type: 'game',
    category: 'science',
    subjects: ['Animals', 'Wildlife', 'Visual Recognition'],
    gradeLevels: ['All'],
    customHtmlPath: '/Games/Animal Champion/index.html',
    thumbnail: '/assets/thumbnails/optimized/animal-champion-128.webp',
    dateAdded: '2026-08-18',
  });
});

test('Animal Champion is allowlisted for single-player points', () => {
  assert.equal(isSinglePlayerPointsGameId('animal-champion'), true);
});
```

Add source assertions that Home contains the ID exactly once in the single-player set and not in the multiplayer set.

In `scripts/content-parity.test.mjs`, change the expected count from 81 to 82 and add explicit generated-entry and legacy-path assertions.

- [ ] **Step 2: Run tests and confirm registration is absent**

```powershell
node --test scripts/animalChampionIntegration.test.mjs scripts/content-parity.test.mjs
```

Expected: FAIL at 81 entries, missing catalog record, missing Home classification, and missing points allowlist.

- [ ] **Step 3: Add the exact science content entry**

Append to `scienceContent`:

```ts
{
  id: 'animal-champion',
  title: 'Animal Champion',
  description: 'Identify 50 animals in fast visual challenge rounds.',
  type: 'game',
  category: 'science',
  subjects: ['Animals', 'Wildlife', 'Visual Recognition'],
  gradeLevels: ['All'],
  customHtmlPath: '/Games/Animal Champion/index.html',
  thumbnail: '/assets/thumbnails/optimized/animal-champion-128.webp',
  dateAdded: '2026-08-18',
}
```

Add `'animal-champion'` once to `Home.tsx`'s `SINGLE_PLAYER_GAME_IDS` and once to `gamePoints.ts`'s `SINGLE_PLAYER_POINTS_GAME_IDS`.

- [ ] **Step 4: Regenerate the catalog from source**

```powershell
npm run sync:content-catalog
```

Inspect the generated entry and ensure `GENERATED_LEGACY_PATHS['/Games/Animal Champion/index.html']` is `animal-champion`. Do not hand-edit generated output.

- [ ] **Step 5: Run focused integration and audit checks**

```powershell
node --test scripts/animalChampionIntegration.test.mjs scripts/content-parity.test.mjs scripts/gameHostPolicy.test.mjs
npm run audit:content
npm run typecheck
```

Expected: PASS with 82 content entries.

- [ ] **Step 6: Commit only reviewed registration paths**

Some catalog-foundation paths were already untracked before this feature. Inspect every staged file in full and do not stage unrelated user work.

```powershell
git add -- src/data/content/science.ts src/pages/Home.tsx src/utils/gamePoints.ts scripts/animalChampionIntegration.test.mjs
if (git ls-files --error-unmatch scripts/content-parity.test.mjs 2>$null) {
  git add -p -- scripts/content-parity.test.mjs
}
if (git ls-files --error-unmatch src/generated/contentCatalog.ts 2>$null) {
  git add -p -- src/generated/contentCatalog.ts
}
git diff --cached --check
git diff --cached --name-status
git diff --cached
git commit -m "feat: register Animal Champion"
```

If Git cannot isolate a required hunk because a foundation file is wholly untracked, leave that file uncommitted, record it in the execution handoff, and keep the validated working-tree version intact rather than committing unrelated ownership.

---

### Task 9: Add launch and Android artifact contracts

**Files:**
- Create: `scripts/animalChampionLaunchProbe.test.mjs`
- Modify: `scripts/androidAssetPack.test.mjs:117-125`
- Modify: `scripts/Inspect-AndroidBundle.ps1:10-43`

**Interfaces:**
- Produces: A launch probe for catalog ID/legacy path/literal runtime dependencies and an AAB inspector that requires the complete Animal Champion runtime, all 100 selected images, both UI assets, and the base-module catalog thumbnail.
- Consumes: `animal-data.js`, current Android fast-follow `game_assets` pack, and existing generic routes.

- [ ] **Step 1: Add the launch regression probe**

Create `scripts/animalChampionLaunchProbe.test.mjs` that:

```js
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const gameRoot = path.join(repoRoot, 'public', 'Games', 'Animal Champion');

test('Animal Champion legacy document and every selected asset are launchable', async () => {
  const html = await readFile(path.join(gameRoot, 'index.html'), 'utf8');
  for (const ref of [
    './css/style.css', '../shared/lahsPointsBridge.js', './js/game.js',
  ]) assert.match(html, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  const gameSource = await readFile(path.join(gameRoot, 'js', 'game.js'), 'utf8');
  for (const ref of ['./animal-data.js', './game-engine.js']) {
    assert.match(gameSource, new RegExp(ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  for (const relativePath of [
    'css/style.css', 'js/game.js', 'js/animal-data.js', 'js/game-engine.js',
    'assets/images/ui/menu-wallpaper.webp', 'assets/images/ui/thumb.webp',
  ]) await access(path.join(gameRoot, relativePath));
  for (const { images } of ANIMAL_DATABASE) {
    for (const relativePath of images) await access(path.join(gameRoot, relativePath));
  }
});
```

Also assert the generated catalog contains the exact content record/legacy alias and generic `resolveModuleLaunchTarget` source still maps all games to `/play/${item.id}` without a special Animal route.

- [ ] **Step 2: Extend the Android inspector source test first**

In `scripts/androidAssetPack.test.mjs`, require `Inspect-AndroidBundle.ps1` to mention:

```js
assert.match(inspector, /Animal Champion/);
assert.match(inspector, /animal-data\.js/);
assert.match(inspector, /animal-champion-128\.webp/);
assert.match(inspector, /expectedAnimalImageCount\s*=\s*100/);
assert.match(inspector, /StringComparer.*Ordinal/);
```

- [ ] **Step 3: Run the launch regression and confirm AAB content enforcement is absent**

```powershell
node --test scripts/animalChampionLaunchProbe.test.mjs scripts/androidAssetPack.test.mjs
```

Expected: launch probe passes once registration/runtime exist; Android test FAILS because the inspector currently checks module names/sizes only.

- [ ] **Step 4: Enforce exact Animal Champion entries in AAB inspection**

In `Inspect-AndroidBundle.ps1`, collect archive entry names in a case-sensitive set using `[StringComparer]::Ordinal`. Read `public/Games/Animal Champion/js/animal-data.js`, extract every quoted runtime image string that begins with `Animals/` and ends with `.webp`, require exactly 100 unique matches, and prefix each value with `game_assets/assets/Games/Animal Champion/` for archive lookup.

Require these fixed entries too:

```powershell
$requiredAnimalEntries = @(
    'game_assets/assets/Games/Animal Champion/index.html',
    'game_assets/assets/Games/Animal Champion/css/style.css',
    'game_assets/assets/Games/Animal Champion/js/animal-data.js',
    'game_assets/assets/Games/Animal Champion/js/game-engine.js',
    'game_assets/assets/Games/Animal Champion/js/game.js',
    'game_assets/assets/Games/Animal Champion/assets/images/ui/menu-wallpaper.webp',
    'game_assets/assets/Games/Animal Champion/assets/images/ui/thumb.webp',
    'base/assets/public/assets/thumbnails/optimized/animal-champion-128.webp'
)
$expectedAnimalImageCount = 100
```

Throw one error containing every exact missing entry. Retain current `base`/`game_assets` module and base-size checks.

- [ ] **Step 5: Run launch, Android, content, and production build checks**

```powershell
node --test scripts/animalChampionLaunchProbe.test.mjs scripts/androidAssetPack.test.mjs
npm run audit:games
npm run audit:content
npm run build
```

After build, verify these production files exist:

```powershell
$required = @(
  'dist/Games/Animal Champion/index.html',
  'dist/Games/Animal Champion/js/animal-data.js',
  'dist/Games/Animal Champion/js/game-engine.js',
  'dist/Games/Animal Champion/js/game.js',
  'dist/assets/thumbnails/optimized/animal-champion-128.webp'
)
$required | ForEach-Object { if (-not (Test-Path -LiteralPath $_)) { throw "Missing production asset: $_" } }
```

- [ ] **Step 6: Commit launch and artifact checks**

```powershell
git add -- scripts/animalChampionLaunchProbe.test.mjs scripts/Inspect-AndroidBundle.ps1
git add -p -- scripts/androidAssetPack.test.mjs
git diff --cached --check
git diff --cached --name-status
git diff --cached
git commit -m "test: verify Animal Champion launch artifacts"
```

---

### Task 10: Run Tier 3 browser, fault, responsive, and accessibility verification

Before this task, read and follow `.codex/skills/cross-device-quality-gate/SKILL.md`. Keep its evidence categories separate; browser profiles and WebKit automation are not physical-device proof.

**Files:**
- Verify: `public/Games/Animal Champion/index.html`
- Verify: `public/Games/Animal Champion/css/style.css`
- Verify: `public/Games/Animal Champion/js/game.js`
- Verify: `src/utils/gameHostPolicy.ts`
- Verify: `src/pages/GamePlayer.tsx`
- Optional fixes only in the owning files above, with a regression assertion added to the corresponding focused test.

**Interfaces:**
- Consumes: Complete standalone game, `/play/animal-champion` integration, and production Vite build.
- Produces: Recorded Tier 3 evidence separated into physical desktop, emulated browsers/viewports, build inspection, code review, and unavailable physical devices.

- [ ] **Step 1: Run all focused tests, then the repository gate**

```powershell
node --test scripts/animalChampionImagePipeline.test.mjs scripts/animalChampionAssets.test.mjs scripts/animalChampionEngine.test.mjs scripts/animalChampionRuntime.test.mjs scripts/gameHostPolicy.test.mjs scripts/animalChampionIntegration.test.mjs scripts/animalChampionLaunchProbe.test.mjs scripts/androidAssetPack.test.mjs
npm run check
git diff --check
```

Expected: all focused tests and the full check pass. If a focused check fails, return to its owning task, add or refine the regression assertion, fix the implementation, and rerun the focused command before returning here.

- [ ] **Step 2: Start the production preview and define both real paths**

```powershell
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Use:

```text
http://127.0.0.1:4173/homeschool-app/Games/Animal%20Champion/index.html
http://127.0.0.1:4173/homeschool-app/play/animal-champion
```

Keep the server alive through all browser checks and stop only the process created for this task afterward.

In a second PowerShell session, define the reusable Playwright CLI sessions and evidence folder:

```powershell
function pw {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Rest)
  & npx --package @playwright/cli playwright-cli @Rest
}
pw list

$Root = 'http://127.0.0.1:4173/homeschool-app'
$Standalone = "$Root/Games/Animal%20Champion/index.html"
$Iframe = "$Root/play/animal-champion"

New-Item -ItemType Directory -Force 'output/playwright/animal-champion' | Out-Null
Push-Location 'output/playwright/animal-champion'
```

- [ ] **Step 3: Verify the full desktop standalone loop in a headed browser**

At 1440 x 900, test keyboard-only and pointer paths: reveal, mode toggle, countdown, correct, rapid repeated correct activation, wrong, timeout, Continuous advance, Challenger game over, New Game cleanup, Play Again fresh deck, Main Menu, leaderboard persistence, corrupt leaderboard recovery, and standalone correct-answer progression with no host bridge ACK.

Capture console errors and network failures; expected normal-run result is none. Confirm all traffic is same-origin and no Google Fonts/audio requests occur.

```powershell
pw -s=ac-desktop open $Standalone --browser msedge --headed
pw -s=ac-desktop resize 1440 900
pw -s=ac-desktop snapshot
pw -s=ac-desktop screenshot --filename desktop-standalone.png --full-page
pw -s=ac-desktop console error
pw -s=ac-desktop requests --static
```

Drive and assert the Continuous correct/double-activation/wrong path in that same session:

```powershell
pw -s=ac-desktop run-code "async (page) => {
  const answerName = async () => {
    const alt = await page.locator('#animalImage').getAttribute('alt');
    const match = /^(?:A|An) (.+) in its natural habitat$/i.exec(alt || '');
    if (!match) throw new Error('Animal alt does not expose the expected testable name');
    return match[1].toLowerCase();
  };
  const choiceIndex = async (name) => {
    const labels = await page.locator('#choiceGrid button').allTextContents();
    return labels.findIndex((label) => label.trim().toLowerCase() === name);
  };

  await page.locator('#menuReveal').focus();
  await page.keyboard.press('Enter');
  await page.locator('#modeContinuous').focus();
  await page.keyboard.press('Enter');
  await page.locator('#startButton').focus();
  await page.keyboard.press('Enter');
  await page.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 10_000 });

  const firstSource = await page.locator('#animalImage').getAttribute('src');
  const correctIndex = await choiceIndex(await answerName());
  if (correctIndex < 0) throw new Error('Correct choice is absent');
  await page.locator('#choiceGrid button').nth(correctIndex).evaluate((button) => {
    button.click();
    button.click();
  });
  if (await page.locator('#scoreValue').textContent() !== '10') throw new Error('Duplicate activation changed score');
  if (!await page.locator('#choiceGrid button').evaluateAll((buttons) => buttons.every((button) => button.disabled))) {
    throw new Error('Choices were not locked after an answer');
  }

  await page.waitForFunction((source) => {
    const image = document.querySelector('#animalImage');
    return image?.getAttribute('src') !== source
      && document.querySelectorAll('#choiceGrid button:not([disabled])').length === 4;
  }, firstSource, { timeout: 6_000 });

  const nextAnswer = await answerName();
  const labels = await page.locator('#choiceGrid button').allTextContents();
  const wrongIndex = labels.findIndex((label) => label.trim().toLowerCase() !== nextAnswer);
  await page.locator('#choiceGrid button').nth(wrongIndex).click();
  if (await page.locator('#streakValue').textContent() !== '0') throw new Error('Wrong answer did not reset streak');
  const feedback = (await page.locator('#feedback').textContent() || '').toLowerCase();
  if (!feedback.includes(nextAnswer)) throw new Error('Wrong feedback did not reveal the answer');
}"
```

Use a separate real-time Challenger run to cover timeout and game-over timing:

```powershell
pw -s=ac-timeout open $Standalone --browser msedge --headed
pw -s=ac-timeout run-code "async (page) => {
  await page.locator('#menuReveal').click();
  await page.locator('#startButton').click();
  await page.locator('#gameOverScreen:not([hidden])').waitFor({ timeout: 24_000 });
  if (await page.locator('#finalScore').textContent() !== '0') throw new Error('Timeout changed score');
}"
```

- [ ] **Step 4: Verify the full iframe loop and host security policy**

At `/play/animal-champion`, repeat the core loop. Inspect the iframe DOM and assert it has no `allow` attribute and no `allowfullscreen` attribute. Confirm there is no fullscreen guard, shell/iframe viewport metadata lacks `user-scalable=no`, and one correct answer emits exactly one accepted 10-point host event without waiting for the ACK to continue.

Navigate away and back to prove iframe teardown/relaunch does not preserve stale timers.

```powershell
pw -s=ac-iframe open $Iframe --browser msedge --headed
pw -s=ac-iframe resize 1440 900
pw -s=ac-iframe snapshot
pw -s=ac-iframe screenshot --filename desktop-iframe.png --full-page
pw -s=ac-iframe console error
```

Assert least privilege and one host event despite duplicate activation:

```powershell
pw -s=ac-iframe run-code "async (page) => {
  const iframe = page.locator('iframe').first();
  await iframe.waitFor({ state: 'attached' });
  const attributes = await iframe.evaluate((element) => ({
    allow: element.getAttribute('allow'),
    allowFullscreen: element.getAttribute('allowfullscreen'),
  }));
  if (attributes.allow !== null || attributes.allowFullscreen !== null) {
    throw new Error('Animal Champion iframe delegated a forbidden capability');
  }

  await page.evaluate(() => {
    window.__animalChampionPointEvents = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'LAHS_POINTS_EARNED') window.__animalChampionPointEvents.push(event.data);
    });
  });

  const frame = page.frames().find((candidate) => candidate !== page.mainFrame() && /Animal%20Champion|Animal Champion/.test(candidate.url()));
  if (!frame) throw new Error('Animal Champion frame was not found');
  await frame.evaluate(() => {
    window.__animalChampionPointAcks = [];
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'LAHS_POINTS_ACK') window.__animalChampionPointAcks.push(event.data);
    });
  });
  await frame.locator('#menuReveal').click();
  await frame.locator('#startButton').click();
  await frame.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 10_000 });
  const alt = await frame.locator('#animalImage').getAttribute('alt');
  const answer = /^(?:A|An) (.+) in its natural habitat$/i.exec(alt || '')?.[1]?.toLowerCase();
  const labels = await frame.locator('#choiceGrid button').allTextContents();
  const correctIndex = labels.findIndex((label) => label.trim().toLowerCase() === answer);
  await frame.locator('#choiceGrid button').nth(correctIndex).evaluate((button) => {
    button.click();
    button.click();
  });
  await page.waitForFunction(() => window.__animalChampionPointEvents.length === 1);
  const events = await page.evaluate(() => window.__animalChampionPointEvents);
  if (events.length !== 1 || events[0].gameId !== 'animal-champion' || events[0].points !== 10) {
    throw new Error('Expected exactly one 10-point Animal Champion event');
  }
  await frame.waitForFunction(() => window.__animalChampionPointAcks.length === 1);
}"
```

- [ ] **Step 5: Run the complete responsive matrix for standalone and iframe**

Verify both paths at:

- 393 x 852 Android phone portrait
- 390 x 844 iPhone-sized portrait
- 1024 x 1366 tablet portrait
- 1366 x 1024 tablet landscape
- 852 x 393 phone landscape

For every viewport verify 48px targets, no horizontal overflow, four choices reachable without overlap, title/menu/game-over readability, animal foreground uncropped, backdrop filling the stage, safe-area padding, focus visibility, and resize/orientation survival.

Run this matrix against `$Standalone`, then repeat it with `$Iframe`:

```powershell
pw -s=ac-android open $Standalone --browser chrome --device "Pixel 7" --headed
pw -s=ac-android resize 393 852
pw -s=ac-android snapshot

pw -s=ac-iphone open $Standalone --browser webkit --device "iPhone 15" --headed
pw -s=ac-iphone resize 390 844
pw -s=ac-iphone snapshot

pw -s=ac-tablet open $Standalone --browser webkit --device "iPad Pro 11" --headed
pw -s=ac-tablet resize 1024 1366
pw -s=ac-tablet snapshot
pw -s=ac-tablet resize 1366 1024
pw -s=ac-tablet snapshot

pw -s=ac-landscape open $Standalone --browser chrome --device "Pixel 7" --headed
pw -s=ac-landscape resize 852 393
pw -s=ac-landscape snapshot
```

Repeat against the iframe route with separately attributable sessions:

```powershell
pw -s=ac-iframe-android open $Iframe --browser chrome --device "Pixel 7" --headed
pw -s=ac-iframe-android resize 393 852
pw -s=ac-iframe-android snapshot

pw -s=ac-iframe-iphone open $Iframe --browser webkit --device "iPhone 15" --headed
pw -s=ac-iframe-iphone resize 390 844
pw -s=ac-iframe-iphone snapshot

pw -s=ac-iframe-tablet open $Iframe --browser webkit --device "iPad Pro 11" --headed
pw -s=ac-iframe-tablet resize 1024 1366
pw -s=ac-iframe-tablet snapshot
pw -s=ac-iframe-tablet resize 1366 1024
pw -s=ac-iframe-tablet snapshot

pw -s=ac-iframe-landscape open $Iframe --browser chrome --device "Pixel 7" --headed
pw -s=ac-iframe-landscape resize 852 393
pw -s=ac-iframe-landscape snapshot
```

Check every responsive session for normal-run errors and failed same-origin assets:

```powershell
@(
  'ac-android', 'ac-iphone', 'ac-tablet', 'ac-landscape',
  'ac-iframe-android', 'ac-iframe-iphone', 'ac-iframe-tablet', 'ac-iframe-landscape'
) | ForEach-Object {
  pw "-s=$_" console error
  pw "-s=$_" requests --static
}
```

Normal sessions must show no application errors or failed same-origin asset requests.

- [ ] **Step 6: Verify reduced motion, visibility, storage, and image faults**

Emulate `prefers-reduced-motion: reduce` and confirm drift, particles, shakes, and large transitions stop while countdown/feedback remain understandable.

```powershell
pw -s=ac-motion open $Standalone --browser chrome --headed
pw -s=ac-motion run-code "async (page) => { await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload(); }"
pw -s=ac-motion snapshot
```

Start an answering round, hide/switch the tab for five seconds, return, and confirm the answer timer did not consume hidden time. Corrupt `animalChampionLeaderboard` with invalid JSON, reload, and confirm play continues. Run with storage methods throwing and confirm only persistence is disabled.

```powershell
pw -s=ac-visibility open $Standalone --browser chrome --headed
pw -s=ac-visibility run-code "async (page) => {
  await page.locator('#menuReveal').click();
  await page.locator('#modeContinuous').click();
  await page.locator('#startButton').click();
  await page.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 10_000 });
  await page.evaluate(() => { window.__animalChampionRemainingBeforeHide = Number(document.querySelector('#timerRegion').getAttribute('aria-valuenow')); });
}"
pw -s=ac-visibility tab-new about:blank
pw -s=ac-visibility run-code "async (page) => { await page.waitForTimeout(5_000); }"
pw -s=ac-visibility tab-select 0
pw -s=ac-visibility run-code "async (page) => {
  const before = await page.evaluate(() => window.__animalChampionRemainingBeforeHide);
  const after = Number(await page.locator('#timerRegion').getAttribute('aria-valuenow'));
  if (after < before - 1) throw new Error('Hidden time consumed the answer deadline');
  await page.waitForTimeout(1_200);
  const resumed = Number(await page.locator('#timerRegion').getAttribute('aria-valuenow'));
  if (resumed >= after) throw new Error('Deadline did not resume after visibility return');
}"

pw -s=ac-storage open $Standalone --browser chrome --headed
pw -s=ac-storage localstorage-set animalChampionLeaderboard "{broken"
pw -s=ac-storage reload
pw -s=ac-storage run-code "async (page) => {
  if (!await page.locator('#menuReveal').isVisible()) throw new Error('Corrupt leaderboard blocked boot');
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem']) {
      Object.defineProperty(Storage.prototype, method, { configurable: true, value() { throw new DOMException('Denied', 'SecurityError'); } });
    }
  });
  await page.reload();
  await page.locator('#menuReveal').click();
  await page.locator('#startButton').click();
  await page.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 10_000 });
}"
```

Delay animal image responses and confirm the timer still begins at 15 only after decode. Fail the first selected path and confirm the second loads. Fail every `Animals/**/*.webp` request and confirm the bounded error screen appears with functional Try Again and Main Menu controls instead of an infinite loop.

```powershell
pw -s=ac-slow open $Standalone --browser chrome --headed
pw -s=ac-slow run-code "async (page) => {
  let releaseRequest;
  const requestStarted = new Promise((resolve) => { releaseRequest = resolve; });
  await page.route('**/Animals/**/*.webp', async (route) => {
    releaseRequest();
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.continue();
  });
  await page.locator('#menuReveal').click();
  await page.locator('#startButton').click();
  await requestStarted;
  if (await page.locator('#timerRegion').getAttribute('aria-valuenow') !== '15') throw new Error('Timer started before image decode');
  await page.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 5_000 });
  await page.waitForTimeout(1_200);
  if (Number(await page.locator('#timerRegion').getAttribute('aria-valuenow')) >= 15) throw new Error('Timer did not start after image decode');
}"

pw -s=ac-fallback open $Standalone --browser chrome --headed
pw -s=ac-fallback run-code "async (page) => {
  let attempts = 0;
  await page.route('**/Animals/**/*.webp', async (route) => {
    attempts += 1;
    if (attempts === 1) await route.fulfill({ status: 404, body: '' });
    else await route.continue();
  });
  await page.locator('#menuReveal').click();
  await page.locator('#startButton').click();
  await page.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 10_000 });
  if (attempts < 2) throw new Error('The alternate image was not attempted');
  if (await page.locator('#animalImage').evaluate((image) => image.naturalWidth) <= 0) throw new Error('Alternate image did not decode');
}"

pw -s=ac-errors open $Standalone --browser chrome --headed
pw -s=ac-errors run-code "async (page) => {
  const pattern = '**/Animals/**/*.webp';
  await page.route(pattern, (route) => route.fulfill({ status: 404, body: '' }));
  await page.locator('#menuReveal').click();
  await page.locator('#startButton').click();
  await page.locator('#errorScreen:not([hidden])').waitFor({ timeout: 30_000 });
  await page.locator('#errorMenuButton').click();
  if (!await page.locator('#menuScreen').isVisible()) throw new Error('Error Main Menu action failed');
  await page.locator('#startButton').click();
  await page.locator('#errorScreen:not([hidden])').waitFor({ timeout: 30_000 });
  await page.unroute(pattern);
  await page.locator('#retryButton').click();
  await page.locator('#choiceGrid button').first().waitFor({ state: 'visible', timeout: 12_000 });
}"
```

After collecting evidence, close only these named sessions, return from the evidence directory, and stop the preview process created in Step 2:

```powershell
@(
  'ac-desktop', 'ac-iframe', 'ac-android', 'ac-iphone', 'ac-tablet', 'ac-landscape',
  'ac-iframe-android', 'ac-iframe-iphone', 'ac-iframe-tablet', 'ac-iframe-landscape',
  'ac-timeout', 'ac-motion', 'ac-visibility', 'ac-storage', 'ac-slow', 'ac-fallback', 'ac-errors'
) | ForEach-Object { pw "-s=$_" close }
Pop-Location
```

- [ ] **Step 7: Inspect or build the Android artifact when local credentials permit**

First check for the upload key and encrypted credential without printing either. If both exist, run the repository's signed local build workflow:

```powershell
$androidCredential = Join-Path $env:USERPROFILE '.android/las-homeschool-upload-key-password.xml'
$androidKeystore = Join-Path $env:USERPROFILE '.android/las-homeschool-upload-key.jks'
$canBuildSignedAndroid = (Test-Path -LiteralPath $androidCredential) -and (Test-Path -LiteralPath $androidKeystore)
if (-not $canBuildSignedAndroid) {
  Write-Output 'Signed Android build credentials are unavailable; artifact runtime proof remains unexecuted.'
}
if ($canBuildSignedAndroid) {
  powershell -ExecutionPolicy Bypass -File scripts/Build-AndroidRelease.ps1
  powershell -ExecutionPolicy Bypass -File scripts/Inspect-AndroidBundle.ps1 -BundlePath 'android/app/build/outputs/bundle/release/app-release.aab'
}
```

Expected: inspector finds separate `base` and `game_assets` modules, complete Animal Champion runtime, both UI assets, all 100 selected WebPs, and the base thumbnail. This proves packaging only, not physical Android runtime.

If credentials are unavailable, do not invent or request secrets; record Android AAB inspection as unexecuted and retain the passing static staging/inspector tests plus production `dist` proof.

- [ ] **Step 8: Review the final diff, ownership, and Car King isolation**

```powershell
git diff --check
git diff --name-status 5fb2a45 -- 'public/Games/CarKingFinal'
git status --short
```

Expected: no Car King changes. Review every Animal Champion, host, catalog, points, test, and inspector diff for secrets, destructive asset changes, stale debug hooks, missing cleanup, accessibility regression, or unrelated edits.

- [ ] **Step 9: Report the Tier 3 evidence truthfully**

Label headed Windows Edge/Chrome as physical desktop. Label Playwright Chromium/WebKit/device profiles as browser emulation, not physical Android/iPhone/iPad. Label AAB inspection as artifact proof. Explicitly list real pinch zoom, notch/safe-area hardware, Safari lifecycle, Android system bars/back/pause-resume, and Play fast-follow delivery as remaining physical-device checks unless actually exercised on those devices.

If QA produces a code fix, add a focused regression assertion, rerun the owning focused test, rerun `npm run check`, and commit only the fix paths:

```powershell
git add -p -- 'public/Games/Animal Champion' src/App.tsx src/layouts/MainLayout.tsx src/pages/GamePlayer.tsx src/utils/gameHostPolicy.ts scripts
git diff --cached --check
git diff --cached --name-status
git diff --cached
git commit -m "fix: polish Animal Champion cross-device behavior"
```

Do not create an empty QA commit when no code changes are needed.
