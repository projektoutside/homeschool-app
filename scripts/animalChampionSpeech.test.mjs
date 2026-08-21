import assert from 'node:assert/strict';
import test from 'node:test';

import { ANIMAL_DATABASE } from '../public/Games/Animal Champion/js/animal-data.js';
import {
  buildSpeechCandidatesFromEvent,
  matchAnimalSpeech,
  normalizeAnimalSpeech,
} from '../public/Games/Animal Champion/js/animal-speech.js';
import {
  ANIMAL_CHAMPION_GAME_ID,
  ANIMAL_CHAMPION_SPEECH_CONTROL,
  ANIMAL_CHAMPION_SPEECH_EVENT,
  createAnimalChampionSpeechEvent,
  isAnimalChampionSpeechControlMessage,
} from '../src/features/speech/speechBridge.ts';

const animalById = new Map(ANIMAL_DATABASE.map((animal) => [animal.id, animal]));

test('animal speech normalization removes conversational filler without merging distinct short names', () => {
  assert.deepEqual(normalizeAnimalSpeech('Um, I think that is a CAT!'), {
    text: 'cat',
    compact: 'cat',
    tokens: ['cat'],
  });
  assert.equal(matchAnimalSpeech(['bat'], animalById.get('cat')).matched, false);
  assert.equal(matchAnimalSpeech(['cat'], animalById.get('bat')).matched, false);
});

test('animal speech matching accepts names, safe aliases, common recognition variants, and alternatives', () => {
  const cases = [
    ['hippopotamus', ['it looks like a hippo']],
    ['rhinoceros', ['I see a rhino']],
    ['chimpanzee', ['that animal is a chimp']],
    ['crocodile', ['maybe a croc']],
    ['polar-bear', ['polar beer']],
    ['cheetah', ['cheater']],
    ['giraffe', ['unrelated words', 'a giraffe']],
  ];

  for (const [animalId, candidates] of cases) {
    const result = matchAnimalSpeech(candidates, animalById.get(animalId));
    assert.equal(result.matched, true, `${animalId}: ${candidates.join(' | ')}`);
  }
});

test('animal speech matching rejects partial multiword and unrelated answers', () => {
  for (const candidates of [['polar'], ['bear'], ['brown bear'], ['penguin']]) {
    assert.equal(
      matchAnimalSpeech(candidates, animalById.get('polar-bear')).matched,
      false,
      candidates.join(' | '),
    );
  }
});

test('all 50 official animal names match themselves and never another roster animal', () => {
  assert.equal(ANIMAL_DATABASE.length, 50);
  for (const target of ANIMAL_DATABASE) {
    assert.equal(matchAnimalSpeech([target.name], target).matched, true, target.name);
    for (const spokenAnimal of ANIMAL_DATABASE) {
      if (spokenAnimal.id === target.id) continue;
      assert.equal(
        matchAnimalSpeech([spokenAnimal.name], target).matched,
        false,
        `${spokenAnimal.name} must not be accepted as ${target.name}`,
      );
    }
  }
});

test('speech event parsing keeps the top display phrase and up to three recognition alternatives', () => {
  const event = {
    resultIndex: 0,
    results: [
      Object.assign([
        { transcript: 'polar beer' },
        { transcript: 'polar bear' },
        { transcript: 'polar pair' },
        { transcript: 'ignored fourth result' },
      ], { isFinal: true }),
    ],
  };

  assert.deepEqual(buildSpeechCandidatesFromEvent(event), {
    displayText: 'polar beer',
    candidates: ['polar beer', 'polar bear', 'polar pair'],
    isFinal: true,
  });
});

test('Animal Champion speech bridge accepts only its exact message type and game id', () => {
  const valid = {
    type: ANIMAL_CHAMPION_SPEECH_CONTROL,
    gameId: ANIMAL_CHAMPION_GAME_ID,
    command: 'start',
    options: { roundId: 'round-1', contextualPhrases: ['Polar Bear'] },
  };

  assert.equal(isAnimalChampionSpeechControlMessage(valid), true);
  assert.equal(isAnimalChampionSpeechControlMessage({ ...valid, gameId: 'math-car-king' }), false);
  assert.equal(isAnimalChampionSpeechControlMessage({ ...valid, type: 'LAHS_CAR_KING_SPEECH_CONTROL' }), false);
  assert.deepEqual(createAnimalChampionSpeechEvent({ event: 'final', text: 'Lion' }), {
    type: ANIMAL_CHAMPION_SPEECH_EVENT,
    gameId: ANIMAL_CHAMPION_GAME_ID,
    event: 'final',
    text: 'Lion',
  });
});
