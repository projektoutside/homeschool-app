import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DIFFICULTIES } from '../public/Games/Animal Champion/js/difficulty.js';

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
const challengingRuntimeRoster = [
  { id: 'aardvark', name: 'Aardvark', images: ['Animals/Aardvark/animal-champion-cartoon.webp', 'Animals/Aardvark/animal-champion-realistic.webp'] },
  { id: 'armadillo', name: 'Armadillo', images: ['Animals/Armadillo/animal-champion-cartoon.webp', 'Animals/Armadillo/animal-champion-realistic.webp'] },
  { id: 'axolotl', name: 'Axolotl', images: ['Animals/Axolotl/animal-champion-cartoon.webp', 'Animals/Axolotl/animal-champion-realistic.webp'] },
  { id: 'badger', name: 'Badger', images: ['Animals/Badger/animal-champion-cartoon.webp', 'Animals/Badger/animal-champion-realistic.webp'] },
  { id: 'bison', name: 'Bison', images: ['Animals/Bison/animal-champion-cartoon.webp', 'Animals/Bison/animal-champion-realistic.webp'] },
  { id: 'capybara', name: 'Capybara', images: ['Animals/Capybara/animal-champion-cartoon.webp', 'Animals/Capybara/animal-champion-realistic.webp'] },
  { id: 'caracal', name: 'Caracal', images: ['Animals/Caracal/animal-champion-cartoon.webp', 'Animals/Caracal/animal-champion-realistic.webp'] },
  { id: 'cassowary', name: 'Cassowary', images: ['Animals/Cassowary/animal-champion-cartoon.webp', 'Animals/Cassowary/animal-champion-realistic.webp'] },
  { id: 'chameleon', name: 'Chameleon', images: ['Animals/Chameleon/animal-champion-cartoon.webp', 'Animals/Chameleon/animal-champion-realistic.webp'] },
  { id: 'emu', name: 'Emu', images: ['Animals/Emu/animal-champion-cartoon.webp', 'Animals/Emu/animal-champion-realistic.webp'] },
  { id: 'ibex', name: 'Ibex', images: ['Animals/Ibex/animal-champion-cartoon.webp', 'Animals/Ibex/animal-champion-realistic.webp'] },
  { id: 'komodo-dragon', name: 'Komodo Dragon', images: ['Animals/Komodo Dragon/animal-champion-cartoon.webp', 'Animals/Komodo Dragon/animal-champion-realistic.webp'] },
  { id: 'lemur', name: 'Lemur', images: ['Animals/Lemur/animal-champion-cartoon.webp', 'Animals/Lemur/animal-champion-realistic.webp'] },
  { id: 'lynx', name: 'Lynx', images: ['Animals/Lynx/animal-champion-cartoon.webp', 'Animals/Lynx/animal-champion-realistic.webp'] },
  { id: 'manatee', name: 'Manatee', images: ['Animals/Manatee/animal-champion-cartoon.webp', 'Animals/Manatee/animal-champion-realistic.webp'] },
  { id: 'meerkat', name: 'Meerkat', images: ['Animals/Meerkat/animal-champion-cartoon.webp', 'Animals/Meerkat/animal-champion-realistic.webp'] },
  { id: 'narwhal', name: 'Narwhal', images: ['Animals/Narwhal/animal-champion-cartoon.webp', 'Animals/Narwhal/animal-champion-realistic.webp'] },
  { id: 'okapi', name: 'Okapi', images: ['Animals/Okapi/animal-champion-cartoon.webp', 'Animals/Okapi/animal-champion-realistic.webp'] },
  { id: 'orangutan', name: 'Orangutan', images: ['Animals/Orangutan/animal-champion-cartoon.webp', 'Animals/Orangutan/animal-champion-realistic.webp'] },
  { id: 'pangolin', name: 'Pangolin', images: ['Animals/Pangolin/animal-champion-cartoon.webp', 'Animals/Pangolin/animal-champion-realistic.webp'] },
  { id: 'platypus', name: 'Platypus', images: ['Animals/Platypus/animal-champion-cartoon.webp', 'Animals/Platypus/animal-champion-realistic.webp'] },
  { id: 'porcupine', name: 'Porcupine', images: ['Animals/Porcupine/animal-champion-cartoon.webp', 'Animals/Porcupine/animal-champion-realistic.webp'] },
  { id: 'red-panda', name: 'Red Panda', images: ['Animals/Red Panda/animal-champion-cartoon.webp', 'Animals/Red Panda/animal-champion-realistic.webp'] },
  { id: 'tapir', name: 'Tapir', images: ['Animals/Tapir/animal-champion-cartoon.webp', 'Animals/Tapir/animal-champion-realistic.webp'] },
  { id: 'wombat', name: 'Wombat', images: ['Animals/Wombat/animal-champion-cartoon.webp', 'Animals/Wombat/animal-champion-realistic.webp'] },
];
const legacyRuntimeRoster = [
  { id: 'bat', name: 'Bat', images: ['Animals/Bat/chatgpt-generated.webp', 'Animals/Bat/animal-champion-secondary.webp'] },
  { id: 'bear', name: 'Bear', images: ['Animals/Bear/chatgpt-generated.webp', 'Animals/Bear/chatgpt-anime.webp'] },
  { id: 'camel', name: 'Camel', images: ['Animals/Camel/chatgpt-generated.webp', 'Animals/Camel/chatgpt-anime.webp'] },
  { id: 'cat', name: 'Cat', images: ['Animals/Cat/chatgpt-generated.webp', 'Animals/Cat/chatgpt-anime.webp'] },
  { id: 'cheetah', name: 'Cheetah', images: ['Animals/Cheetah/93ff7ae1-90a0-428d-8db7-fd4b3a9f54b0.webp', 'Animals/Cheetah/animal-champion-secondary.webp'] },
  { id: 'chicken', name: 'Chicken', images: ['Animals/Chicken/chatgpt-generated.webp', 'Animals/Chicken/chatgpt-anime.webp'] },
  { id: 'chimpanzee', name: 'Chimpanzee', images: ['Animals/Chimpanzee/chatgpt-generated.webp', 'Animals/Chimpanzee/chatgpt-anime.webp'] },
  { id: 'cow', name: 'Cow', images: ['Animals/Cow/chatgpt-generated.webp', 'Animals/Cow/chatgpt-anime.webp'] },
  { id: 'crocodile', name: 'Crocodile', images: ['Animals/Crocodile/animal-champion-primary.webp', 'Animals/Crocodile/animal-champion-secondary.webp'] },
  { id: 'deer', name: 'Deer', images: ['Animals/Deer/chatgpt-generated.webp', 'Animals/Deer/chatgpt-anime.webp'] },
  { id: 'dog', name: 'Dog', images: ['Animals/Dog/chatgpt-generated.webp', 'Animals/Dog/chatgpt-anime.webp'] },
  { id: 'dolphin', name: 'Dolphin', images: ['Animals/Dolphin/chatgpt-generated.webp', 'Animals/Dolphin/chatgpt-anime.webp'] },
  { id: 'donkey', name: 'Donkey', images: ['Animals/Donkey/chatgpt-generated.webp', 'Animals/Donkey/chatgpt-anime.webp'] },
  { id: 'duck', name: 'Duck', images: ['Animals/Duck/chatgpt-generated.webp', 'Animals/Duck/chatgpt-anime.webp'] },
  { id: 'eagle', name: 'Eagle', images: ['Animals/Eagle/chatgpt-generated.webp', 'Animals/Eagle/chatgpt-anime.webp'] },
  { id: 'elephant', name: 'Elephant', images: ['Animals/Elephant/d3635c1a-c89c-4039-9af6-ebd44c927d6b.webp', 'Animals/Elephant/chatgpt-anime.webp'] },
  { id: 'flamingo', name: 'Flamingo', images: ['Animals/Flamingo/chatgpt-generated.webp', 'Animals/Flamingo/chatgpt-anime.webp'] },
  { id: 'fox', name: 'Fox', images: ['Animals/Fox/chatgpt-generated.webp', 'Animals/Fox/chatgpt-anime.webp'] },
  { id: 'frog', name: 'Frog', images: ['Animals/Frog/chatgpt-generated.webp', 'Animals/Frog/chatgpt-anime.webp'] },
  { id: 'giraffe', name: 'Giraffe', images: ['Animals/Giraffe/chatgpt-generated.webp', 'Animals/Giraffe/animal-champion-secondary.webp'] },
  { id: 'goat', name: 'Goat', images: ['Animals/Goat/chatgpt-generated.webp', 'Animals/Goat/animal-champion-secondary.webp'] },
  { id: 'gorilla', name: 'Gorilla', images: ['Animals/Gorilla/chatgpt-generated.webp', 'Animals/Gorilla/animal-champion-secondary.webp'] },
  { id: 'hamster', name: 'Hamster', images: ['Animals/Hamster/chatgpt-generated.webp', 'Animals/Hamster/chatgpt-anime.webp'] },
  { id: 'hippopotamus', name: 'Hippopotamus', images: ['Animals/Hippopotamus/chatgpt-generated.webp', 'Animals/Hippopotamus/animal-champion-secondary.webp'] },
  { id: 'horse', name: 'Horse', images: ['Animals/Horse/chatgpt-generated.webp', 'Animals/Horse/chatgpt-anime.webp'] },
  { id: 'kangaroo', name: 'Kangaroo', images: ['Animals/Kangaroo/chatgpt-generated.webp', 'Animals/Kangaroo/chatgpt-anime.webp'] },
  { id: 'koala', name: 'Koala', images: ['Animals/Koala/chatgpt-generated.webp', 'Animals/Koala/chatgpt-anime.webp'] },
  { id: 'lion', name: 'Lion', images: ['Animals/Lion/chatgpt-generated.webp', 'Animals/Lion/chatgpt-anime.webp'] },
  { id: 'monkey', name: 'Monkey', images: ['Animals/Monkey/chatgpt-generated.webp', 'Animals/Monkey/chatgpt-anime.webp'] },
  { id: 'mouse', name: 'Mouse', images: ['Animals/Mouse/chatgpt-generated.webp', 'Animals/Mouse/chatgpt-anime.webp'] },
  { id: 'octopus', name: 'Octopus', images: ['Animals/Octopus/animal-champion-primary.webp', 'Animals/Octopus/animal-champion-secondary.webp'] },
  { id: 'owl', name: 'Owl', images: ['Animals/Owl/chatgpt-generated.webp', 'Animals/Owl/chatgpt-anime.webp'] },
  { id: 'panda', name: 'Panda', images: ['Animals/Panda/chatgpt-generated.webp', 'Animals/Panda/chatgpt-anime.webp'] },
  { id: 'parrot', name: 'Parrot', images: ['Animals/Parrot/chatgpt-generated.webp', 'Animals/Parrot/chatgpt-anime.webp'] },
  { id: 'peacock', name: 'Peacock', images: ['Animals/Peacock/chatgpt-generated.webp', 'Animals/Peacock/chatgpt-anime.webp'] },
  { id: 'penguin', name: 'Penguin', images: ['Animals/Penguin/chatgpt-generated.webp', 'Animals/Penguin/chatgpt-anime.webp'] },
  { id: 'pig', name: 'Pig', images: ['Animals/Pig/chatgpt-generated.webp', 'Animals/Pig/animal-champion-secondary.webp'] },
  { id: 'polar-bear', name: 'Polar Bear', images: ['Animals/Polar Bear/chatgpt-generated.webp', 'Animals/Polar Bear/chatgpt-anime.webp'] },
  { id: 'rabbit', name: 'Rabbit', images: ['Animals/Rabbit/chatgpt-generated.webp', 'Animals/Rabbit/animal-champion-secondary.webp'] },
  { id: 'rhinoceros', name: 'Rhinoceros', images: ['Animals/Rhinoceros/chatgpt-generated.webp', 'Animals/Rhinoceros/chatgpt-anime.webp'] },
  { id: 'seal', name: 'Seal', images: ['Animals/Seal/chatgpt-generated.webp', 'Animals/Seal/chatgpt-anime.webp'] },
  { id: 'shark', name: 'Shark', images: ['Animals/Shark/chatgpt-generated.webp', 'Animals/Shark/animal-champion-secondary.webp'] },
  { id: 'sheep', name: 'Sheep', images: ['Animals/Sheep/chatgpt-generated.webp', 'Animals/Sheep/chatgpt-anime.webp'] },
  { id: 'snake', name: 'Snake', images: ['Animals/Snake/chatgpt-generated.webp', 'Animals/Snake/animal-champion-secondary.webp'] },
  { id: 'squirrel', name: 'Squirrel', images: ['Animals/Squirrel/chatgpt-generated.webp', 'Animals/Squirrel/chatgpt-anime.webp'] },
  { id: 'tiger', name: 'Tiger', images: ['Animals/Tiger/chatgpt-generated.webp', 'Animals/Tiger/animal-champion-secondary.webp'] },
  { id: 'turtle', name: 'Turtle', images: ['Animals/Turtle/chatgpt-generated.webp', 'Animals/Turtle/chatgpt-anime.webp'] },
  { id: 'whale', name: 'Whale', images: ['Animals/Whale/chatgpt-generated.webp', 'Animals/Whale/chatgpt-anime.webp'] },
  { id: 'wolf', name: 'Wolf', images: ['Animals/Wolf/chatgpt-generated.webp', 'Animals/Wolf/chatgpt-anime.webp'] },
  { id: 'zebra', name: 'Zebra', images: ['Animals/Zebra/chatgpt-generated.webp', 'Animals/Zebra/animal-champion-secondary.webp'] },
];
const expectedRuntimeRoster = [...challengingRuntimeRoster, ...legacyRuntimeRoster];
const challengingGameplay = challengingRuntimeRoster.flatMap(({ images }) => images);
const challengingIds = new Set(challengingRuntimeRoster.map(({ id }) => id));
const cartoonGameplay = legacyRuntimeRoster.map(
  ({ name }) => `Animals/${name}/animal-champion-cartoon.webp`,
);
const expectedDifficultyAnimals = {
  [DIFFICULTIES.EASY]: [
    'Cat', 'Chicken', 'Cow', 'Dog', 'Duck', 'Elephant', 'Horse', 'Lion', 'Monkey',
    'Mouse', 'Penguin', 'Pig', 'Rabbit', 'Sheep', 'Tiger', 'Turtle', 'Zebra',
  ],
  [DIFFICULTIES.HARD]: [
    'Armadillo', 'Badger', 'Bison', 'Capybara', 'Chameleon', 'Emu', 'Lemur',
    'Manatee', 'Meerkat', 'Platypus', 'Porcupine', 'Wombat',
    'Bear', 'Camel', 'Deer', 'Dolphin', 'Donkey', 'Eagle', 'Fox', 'Frog', 'Giraffe',
    'Goat', 'Hamster', 'Kangaroo', 'Panda', 'Parrot', 'Polar Bear', 'Squirrel', 'Wolf',
  ],
  [DIFFICULTIES.EXPERT]: [
    'Aardvark', 'Axolotl', 'Caracal', 'Cassowary', 'Ibex', 'Komodo Dragon', 'Lynx',
    'Narwhal', 'Okapi', 'Orangutan', 'Pangolin', 'Red Panda', 'Tapir',
    'Bat', 'Cheetah', 'Chimpanzee', 'Crocodile', 'Flamingo', 'Gorilla', 'Hippopotamus',
    'Koala', 'Octopus', 'Owl', 'Peacock', 'Rhinoceros', 'Seal', 'Shark', 'Snake', 'Whale',
  ],
};
const generatedUi = [
  'assets/images/ui/menu-wallpaper.webp',
  'assets/images/ui/thumb.webp',
];
const derivedCatalogThumbnail = path.join(
  repoRoot,
  'public',
  'assets',
  'thumbnails',
  'optimized',
  'animal-champion-128.webp',
);
const dataUrl = new URL('../public/Games/Animal Champion/js/animal-data.js', import.meta.url);
const generatedUiDimensions = new Map([
  ['assets/images/ui/menu-wallpaper.webp', { width: 1536, height: 1024 }],
  ['assets/images/ui/thumb.webp', { width: 1024, height: 1024 }],
]);
let runtimeImportNonce = 0;

const loadRuntimeData = () => import(`${dataUrl.href}?test=${++runtimeImportNonce}`);

const readWebpDimensions = (buffer) => {
  if (buffer.length < 12) throw new Error('WebP RIFF header is truncated');
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(buffer.readUInt32LE(4), buffer.length - 8, 'WebP RIFF size does not match buffer length');
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP');
  let offset = 12;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) throw new Error(`WebP chunk header is truncated at offset ${offset}`);
    const type = buffer.subarray(offset, offset + 4).toString('ascii');
    const size = buffer.readUInt32LE(offset + 4);
    const data = offset + 8;
    const payloadEnd = data + size;
    const paddedEnd = payloadEnd + (size % 2);
    if (payloadEnd > buffer.length || paddedEnd > buffer.length) {
      throw new Error(`WebP ${type} chunk payload exceeds buffer bounds`);
    }
    if (type === 'VP8X') {
      if (size < 10) throw new Error('WebP VP8X chunk payload is too short');
      return {
        width: 1 + buffer.readUIntLE(data + 4, 3),
        height: 1 + buffer.readUIntLE(data + 7, 3),
      };
    }
    if (type === 'VP8 ') {
      if (size < 10) throw new Error('WebP VP8 chunk payload is too short');
      assert.deepEqual(
        [...buffer.subarray(data + 3, data + 6)],
        [0x9d, 0x01, 0x2a],
        'WebP VP8 keyframe signature is invalid',
      );
      return {
        width: buffer.readUInt16LE(data + 6) & 0x3fff,
        height: buffer.readUInt16LE(data + 8) & 0x3fff,
      };
    }
    if (type === 'VP8L') {
      if (size < 5) throw new Error('WebP VP8L chunk payload is too short');
      assert.equal(buffer[data], 0x2f, 'WebP VP8L signature is invalid');
      const bits = buffer.readUInt32LE(data + 1);
      return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
    offset = paddedEnd;
  }
  throw new Error('WebP image chunk not found');
};

const assertCaseCorrectPath = async (relativePath) => {
  let current = gameRoot;
  for (const segment of relativePath.split('/')) {
    const entries = await readdir(current);
    assert.ok(entries.includes(segment), `Case-correct path segment missing: ${relativePath}`);
    current = path.join(current, segment);
  }
  return current;
};

test('all approved generated originals and their prompt records exist', async () => {
  const promptPath = path.join(gameRoot, 'assets', 'image-generation-prompts.json');
  const ledger = JSON.parse(await readFile(promptPath, 'utf8'));
  const cartoonLedger = JSON.parse(
    await readFile(path.join(gameRoot, 'assets', 'cartoon-image-generation.json'), 'utf8'),
  );
  const challengingLedger = JSON.parse(
    await readFile(path.join(gameRoot, 'assets', 'challenging-image-generation.json'), 'utf8'),
  );
  assert.equal(ledger.schemaVersion, 1);
  assert.equal(ledger.assets.length, 18);
  assert.equal(new Set(ledger.assets.map(({ finalPath }) => finalPath)).size, 18);

  for (const relativePath of [...generatedGameplay, ...generatedUi]) {
    assert.ok((await stat(path.join(gameRoot, relativePath))).size > 0);
    assert.ok(ledger.assets.some(({ finalPath }) => finalPath === relativePath));
  }

  assert.equal(cartoonLedger.schemaVersion, 1);
  assert.equal(cartoonLedger.generator, 'openai-imagegen');
  assert.equal(cartoonLedger.mode, 'built-in');
  assert.match(cartoonLedger.promptTemplate, /realistic, species-accurate features/);
  assert.deepEqual(cartoonLedger.output, {
    format: 'webp',
    width: 853,
    height: 1280,
    qa: 'approved-full-resolution',
  });
  assert.deepEqual(cartoonLedger.assets.slice().sort(), cartoonGameplay.slice().sort());
  assert.equal(new Set(cartoonLedger.assets).size, 50);

  assert.equal(challengingLedger.schemaVersion, 1);
  assert.equal(challengingLedger.generator, 'openai-imagegen');
  assert.equal(challengingLedger.mode, 'built-in');
  assert.match(challengingLedger.promptTemplates.cartoon, /realistic-cartoon 3D wildlife illustration/);
  assert.match(challengingLedger.promptTemplates.realistic, /high-end wildlife photograph/);
  assert.deepEqual(challengingLedger.output, {
    format: 'webp',
    width: 853,
    height: 1280,
    qa: 'approved-contact-sheet',
  });
  assert.equal(challengingLedger.animals.length, 25);
  assert.deepEqual(
    challengingLedger.animals.flatMap(({ assets }) => assets).slice().sort(),
    challengingGameplay.slice().sort(),
  );
  assert.equal(new Set(challengingGameplay).size, 50);

  assert.ok((await stat(derivedCatalogThumbnail)).size > 0);
  assert.ok(
    !ledger.assets.some(
      ({ finalPath }) =>
        finalPath === 'assets/thumbnails/optimized/animal-champion-128.webp' ||
        finalPath === 'public/assets/thumbnails/optimized/animal-champion-128.webp',
    ),
  );
});

test('runtime data selects exactly 75 animals and 200 unique images across the approved difficulties', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const ids = ANIMAL_DATABASE.map(({ id }) => id);
  const names = ANIMAL_DATABASE.map(({ name }) => name);
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);

  assert.equal(ANIMAL_DATABASE.length, 75);
  assert.equal(new Set(ids).size, 75);
  assert.equal(new Set(names).size, 75);
  assert.ok(ANIMAL_DATABASE.every(({ id, images }) => (
    images.length === (challengingIds.has(id) ? 2 : 3) && new Set(images).size === images.length
  )));
  assert.equal(paths.length, 200);
  assert.equal(new Set(paths).size, 200);
  assert.ok(paths.every((value) => value.endsWith('.webp')));
  assert.ok(paths.every((value) => !value.includes('chatgpt-third') && !value.includes('chatgpt-fourth')));
  assert.deepEqual(
    ANIMAL_DATABASE.map(({ id, name, images }) => ({ id, name, images: images.slice(0, 2) })),
    expectedRuntimeRoster,
  );
  assert.deepEqual(
    ANIMAL_DATABASE.filter(({ id }) => !challengingIds.has(id)).map(({ images }) => images[2]),
    cartoonGameplay,
  );
  for (const [difficulty, expectedNames] of Object.entries(expectedDifficultyAnimals)) {
    assert.deepEqual(
      ANIMAL_DATABASE.filter((animal) => animal.difficulty === difficulty).map(({ name }) => name),
      expectedNames,
    );
  }
});

test('runtime records, images, and export are immutable and have only the approved fields', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();

  assert.ok(Object.isFrozen(ANIMAL_DATABASE));
  for (const record of ANIMAL_DATABASE) {
    assert.ok(Object.isFrozen(record));
    assert.ok(Object.isFrozen(record.images));
    assert.ok(Object.isFrozen(record.speechAliases));
    assert.deepEqual(Object.keys(record).sort(), ['alt', 'difficulty', 'id', 'images', 'name', 'speechAliases']);
    assert.ok(Object.values(DIFFICULTIES).includes(record.difficulty));
    assert.ok(record.speechAliases.every((alias) => typeof alias === 'string' && alias.trim() === alias));
    assert.match(record.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(
      record.alt,
      `${/^[aeiou]/i.test(record.name) ? 'An' : 'A'} ${record.name.toLowerCase()} in its natural habitat`,
    );
  }
});

test('every selected path exists with exact casing and is included in the source manifest', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const manifest = JSON.parse(await readFile(path.join(gameRoot, 'animals-manifest.json'), 'utf8'));
  const manifestPaths = new Set(manifest.flatMap(({ images }) => images));
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);

  for (const relativePath of paths) {
    assert.ok(manifestPaths.has(relativePath), `Manifest does not include ${relativePath}`);
    const exactPath = await assertCaseCorrectPath(relativePath);
    assert.ok((await stat(exactPath)).isFile(), `Selected path is not a file: ${relativePath}`);
  }
});

test('selected images have real WebP signatures, unique SHA-256 content, and the approved source split', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);
  const ledger = JSON.parse(
    await readFile(path.join(gameRoot, 'assets', 'image-generation-prompts.json'), 'utf8'),
  );
  const ledgerGameplayPaths = ledger.assets
    .filter(({ kind }) => kind === 'gameplay')
    .map(({ finalPath }) => finalPath);
  const ledgerGeneratedGameplaySet = new Set(ledgerGameplayPaths);
  assert.deepEqual(ledgerGameplayPaths.slice().sort(), generatedGameplay.slice().sort());

  const generatedPaths = paths.filter((relativePath) => ledgerGeneratedGameplaySet.has(relativePath));
  const cartoonGameplaySet = new Set(cartoonGameplay);
  const newCartoonPaths = paths.filter((relativePath) => cartoonGameplaySet.has(relativePath));
  const challengingGameplaySet = new Set(challengingGameplay);
  const challengingPaths = paths.filter((relativePath) => challengingGameplaySet.has(relativePath));
  const existingPaths = paths.filter(
    (relativePath) => !ledgerGeneratedGameplaySet.has(relativePath)
      && !cartoonGameplaySet.has(relativePath)
      && !challengingGameplaySet.has(relativePath),
  );
  const hashes = [];

  assert.equal(generatedPaths.length, 16);
  assert.equal(new Set(generatedPaths).size, 16);
  assert.equal(newCartoonPaths.length, 50);
  assert.equal(new Set(newCartoonPaths).size, 50);
  assert.equal(challengingPaths.length, 50);
  assert.equal(new Set(challengingPaths).size, 50);
  assert.equal(existingPaths.length, 84);
  assert.deepEqual(generatedPaths.slice().sort(), generatedGameplay.slice().sort());
  for (const relativePath of paths) {
    const buffer = await readFile(path.join(gameRoot, relativePath));
    const dimensions = readWebpDimensions(buffer);
    assert.ok(dimensions.width > 0 && dimensions.height > 0, `Invalid dimensions: ${relativePath}`);
    hashes.push(createHash('sha256').update(buffer).digest('hex'));
    if (
      ledgerGeneratedGameplaySet.has(relativePath)
      || cartoonGameplaySet.has(relativePath)
      || challengingGameplaySet.has(relativePath)
    ) {
      assert.deepEqual(dimensions, { width: 853, height: 1280 }, `Generated dimensions: ${relativePath}`);
    }
  }
  assert.equal(new Set(hashes).size, 200);
});

test('generated gameplay and UI assets have approved dimensions and complete ledger coverage', async () => {
  const { ANIMAL_DATABASE } = await loadRuntimeData();
  const paths = ANIMAL_DATABASE.flatMap(({ images }) => images);
  const ledger = JSON.parse(
    await readFile(path.join(gameRoot, 'assets', 'image-generation-prompts.json'), 'utf8'),
  );
  const ledgerByPath = new Map(ledger.assets.map((asset) => [asset.finalPath, asset]));

  for (const relativePath of generatedGameplay) {
    assert.ok(paths.includes(relativePath), `Generated gameplay path is not selected: ${relativePath}`);
    const record = ledgerByPath.get(relativePath);
    assert.ok(record, `Generated gameplay path is not in ledger: ${relativePath}`);
    assert.deepEqual({ width: record.width, height: record.height }, { width: 853, height: 1280 });
    assert.deepEqual(
      readWebpDimensions(await readFile(path.join(gameRoot, relativePath))),
      { width: 853, height: 1280 },
    );
  }
  for (const relativePath of cartoonGameplay) {
    assert.ok(paths.includes(relativePath), `Cartoon gameplay path is not selected: ${relativePath}`);
    assert.deepEqual(
      readWebpDimensions(await readFile(path.join(gameRoot, relativePath))),
      { width: 853, height: 1280 },
    );
  }
  for (const relativePath of challengingGameplay) {
    assert.ok(paths.includes(relativePath), `Challenging gameplay path is not selected: ${relativePath}`);
    assert.deepEqual(
      readWebpDimensions(await readFile(path.join(gameRoot, relativePath))),
      { width: 853, height: 1280 },
    );
  }
  for (const [relativePath, dimensions] of generatedUiDimensions) {
    const record = ledgerByPath.get(relativePath);
    assert.ok(record, `UI path is not in ledger: ${relativePath}`);
    assert.deepEqual({ width: record.width, height: record.height }, dimensions);
    assert.deepEqual(readWebpDimensions(await readFile(path.join(gameRoot, relativePath))), dimensions);
  }
  assert.equal(ledger.assets.length, 18);
  assert.equal(new Set(ledger.assets.map(({ finalPath }) => finalPath)).size, 18);
});
