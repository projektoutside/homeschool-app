import { DIFFICULTIES } from './difficulty.js';

const animal = (id, name, images, difficulty, speechAliases = []) => Object.freeze({
  id,
  name,
  alt: `${/^[aeiou]/i.test(name) ? 'An' : 'A'} ${name.toLowerCase()} in its natural habitat`,
  images: Object.freeze(images),
  difficulty,
  speechAliases: Object.freeze(speechAliases),
});

export const ANIMAL_DATABASE = Object.freeze([
  animal('aardvark', 'Aardvark', [
    'Animals/Aardvark/animal-champion-cartoon.webp',
    'Animals/Aardvark/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('armadillo', 'Armadillo', [
    'Animals/Armadillo/animal-champion-cartoon.webp',
    'Animals/Armadillo/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('axolotl', 'Axolotl', [
    'Animals/Axolotl/animal-champion-cartoon.webp',
    'Animals/Axolotl/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('badger', 'Badger', [
    'Animals/Badger/animal-champion-cartoon.webp',
    'Animals/Badger/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('bison', 'Bison', [
    'Animals/Bison/animal-champion-cartoon.webp',
    'Animals/Bison/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD, ['buffalo']),
  animal('capybara', 'Capybara', [
    'Animals/Capybara/animal-champion-cartoon.webp',
    'Animals/Capybara/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('caracal', 'Caracal', [
    'Animals/Caracal/animal-champion-cartoon.webp',
    'Animals/Caracal/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('cassowary', 'Cassowary', [
    'Animals/Cassowary/animal-champion-cartoon.webp',
    'Animals/Cassowary/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('chameleon', 'Chameleon', [
    'Animals/Chameleon/animal-champion-cartoon.webp',
    'Animals/Chameleon/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('emu', 'Emu', [
    'Animals/Emu/animal-champion-cartoon.webp',
    'Animals/Emu/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('ibex', 'Ibex', [
    'Animals/Ibex/animal-champion-cartoon.webp',
    'Animals/Ibex/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('komodo-dragon', 'Komodo Dragon', [
    'Animals/Komodo Dragon/animal-champion-cartoon.webp',
    'Animals/Komodo Dragon/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT, ['komodo']),
  animal('lemur', 'Lemur', [
    'Animals/Lemur/animal-champion-cartoon.webp',
    'Animals/Lemur/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD, ['ring tailed lemur']),
  animal('lynx', 'Lynx', [
    'Animals/Lynx/animal-champion-cartoon.webp',
    'Animals/Lynx/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT, ['links']),
  animal('manatee', 'Manatee', [
    'Animals/Manatee/animal-champion-cartoon.webp',
    'Animals/Manatee/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD, ['sea cow']),
  animal('meerkat', 'Meerkat', [
    'Animals/Meerkat/animal-champion-cartoon.webp',
    'Animals/Meerkat/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('narwhal', 'Narwhal', [
    'Animals/Narwhal/animal-champion-cartoon.webp',
    'Animals/Narwhal/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('okapi', 'Okapi', [
    'Animals/Okapi/animal-champion-cartoon.webp',
    'Animals/Okapi/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('orangutan', 'Orangutan', [
    'Animals/Orangutan/animal-champion-cartoon.webp',
    'Animals/Orangutan/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT, ['orangutang']),
  animal('pangolin', 'Pangolin', [
    'Animals/Pangolin/animal-champion-cartoon.webp',
    'Animals/Pangolin/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('platypus', 'Platypus', [
    'Animals/Platypus/animal-champion-cartoon.webp',
    'Animals/Platypus/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('porcupine', 'Porcupine', [
    'Animals/Porcupine/animal-champion-cartoon.webp',
    'Animals/Porcupine/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('red-panda', 'Red Panda', [
    'Animals/Red Panda/animal-champion-cartoon.webp',
    'Animals/Red Panda/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('tapir', 'Tapir', [
    'Animals/Tapir/animal-champion-cartoon.webp',
    'Animals/Tapir/animal-champion-realistic.webp',
  ], DIFFICULTIES.EXPERT),
  animal('wombat', 'Wombat', [
    'Animals/Wombat/animal-champion-cartoon.webp',
    'Animals/Wombat/animal-champion-realistic.webp',
  ], DIFFICULTIES.HARD),
  animal('bat', 'Bat', [
    'Animals/Bat/chatgpt-generated.webp',
    'Animals/Bat/animal-champion-secondary.webp',
    'Animals/Bat/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('bear', 'Bear', [
    'Animals/Bear/chatgpt-generated.webp',
    'Animals/Bear/chatgpt-anime.webp',
    'Animals/Bear/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('camel', 'Camel', [
    'Animals/Camel/chatgpt-generated.webp',
    'Animals/Camel/chatgpt-anime.webp',
    'Animals/Camel/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('cat', 'Cat', [
    'Animals/Cat/chatgpt-generated.webp',
    'Animals/Cat/chatgpt-anime.webp',
    'Animals/Cat/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY, ['kitten']),
  animal('cheetah', 'Cheetah', [
    'Animals/Cheetah/93ff7ae1-90a0-428d-8db7-fd4b3a9f54b0.webp',
    'Animals/Cheetah/animal-champion-secondary.webp',
    'Animals/Cheetah/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT, ['cheater']),
  animal('chicken', 'Chicken', [
    'Animals/Chicken/chatgpt-generated.webp',
    'Animals/Chicken/chatgpt-anime.webp',
    'Animals/Chicken/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY, ['hen', 'rooster', 'chick']),
  animal('chimpanzee', 'Chimpanzee', [
    'Animals/Chimpanzee/chatgpt-generated.webp',
    'Animals/Chimpanzee/chatgpt-anime.webp',
    'Animals/Chimpanzee/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT, ['chimp']),
  animal('cow', 'Cow', [
    'Animals/Cow/chatgpt-generated.webp',
    'Animals/Cow/chatgpt-anime.webp',
    'Animals/Cow/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('crocodile', 'Crocodile', [
    'Animals/Crocodile/animal-champion-primary.webp',
    'Animals/Crocodile/animal-champion-secondary.webp',
    'Animals/Crocodile/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT, ['croc']),
  animal('deer', 'Deer', [
    'Animals/Deer/chatgpt-generated.webp',
    'Animals/Deer/chatgpt-anime.webp',
    'Animals/Deer/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('dog', 'Dog', [
    'Animals/Dog/chatgpt-generated.webp',
    'Animals/Dog/chatgpt-anime.webp',
    'Animals/Dog/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY, ['puppy']),
  animal('dolphin', 'Dolphin', [
    'Animals/Dolphin/chatgpt-generated.webp',
    'Animals/Dolphin/chatgpt-anime.webp',
    'Animals/Dolphin/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('donkey', 'Donkey', [
    'Animals/Donkey/chatgpt-generated.webp',
    'Animals/Donkey/chatgpt-anime.webp',
    'Animals/Donkey/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('duck', 'Duck', [
    'Animals/Duck/chatgpt-generated.webp',
    'Animals/Duck/chatgpt-anime.webp',
    'Animals/Duck/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('eagle', 'Eagle', [
    'Animals/Eagle/chatgpt-generated.webp',
    'Animals/Eagle/chatgpt-anime.webp',
    'Animals/Eagle/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('elephant', 'Elephant', [
    'Animals/Elephant/d3635c1a-c89c-4039-9af6-ebd44c927d6b.webp',
    'Animals/Elephant/chatgpt-anime.webp',
    'Animals/Elephant/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('flamingo', 'Flamingo', [
    'Animals/Flamingo/chatgpt-generated.webp',
    'Animals/Flamingo/chatgpt-anime.webp',
    'Animals/Flamingo/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('fox', 'Fox', [
    'Animals/Fox/chatgpt-generated.webp',
    'Animals/Fox/chatgpt-anime.webp',
    'Animals/Fox/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('frog', 'Frog', [
    'Animals/Frog/chatgpt-generated.webp',
    'Animals/Frog/chatgpt-anime.webp',
    'Animals/Frog/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('giraffe', 'Giraffe', [
    'Animals/Giraffe/chatgpt-generated.webp',
    'Animals/Giraffe/animal-champion-secondary.webp',
    'Animals/Giraffe/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('goat', 'Goat', [
    'Animals/Goat/chatgpt-generated.webp',
    'Animals/Goat/animal-champion-secondary.webp',
    'Animals/Goat/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('gorilla', 'Gorilla', [
    'Animals/Gorilla/chatgpt-generated.webp',
    'Animals/Gorilla/animal-champion-secondary.webp',
    'Animals/Gorilla/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('hamster', 'Hamster', [
    'Animals/Hamster/chatgpt-generated.webp',
    'Animals/Hamster/chatgpt-anime.webp',
    'Animals/Hamster/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('hippopotamus', 'Hippopotamus', [
    'Animals/Hippopotamus/chatgpt-generated.webp',
    'Animals/Hippopotamus/animal-champion-secondary.webp',
    'Animals/Hippopotamus/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT, ['hippo']),
  animal('horse', 'Horse', [
    'Animals/Horse/chatgpt-generated.webp',
    'Animals/Horse/chatgpt-anime.webp',
    'Animals/Horse/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('kangaroo', 'Kangaroo', [
    'Animals/Kangaroo/chatgpt-generated.webp',
    'Animals/Kangaroo/chatgpt-anime.webp',
    'Animals/Kangaroo/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('koala', 'Koala', [
    'Animals/Koala/chatgpt-generated.webp',
    'Animals/Koala/chatgpt-anime.webp',
    'Animals/Koala/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('lion', 'Lion', [
    'Animals/Lion/chatgpt-generated.webp',
    'Animals/Lion/chatgpt-anime.webp',
    'Animals/Lion/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('monkey', 'Monkey', [
    'Animals/Monkey/chatgpt-generated.webp',
    'Animals/Monkey/chatgpt-anime.webp',
    'Animals/Monkey/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('mouse', 'Mouse', [
    'Animals/Mouse/chatgpt-generated.webp',
    'Animals/Mouse/chatgpt-anime.webp',
    'Animals/Mouse/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY, ['mice']),
  animal('octopus', 'Octopus', [
    'Animals/Octopus/animal-champion-primary.webp',
    'Animals/Octopus/animal-champion-secondary.webp',
    'Animals/Octopus/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('owl', 'Owl', [
    'Animals/Owl/chatgpt-generated.webp',
    'Animals/Owl/chatgpt-anime.webp',
    'Animals/Owl/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('panda', 'Panda', [
    'Animals/Panda/chatgpt-generated.webp',
    'Animals/Panda/chatgpt-anime.webp',
    'Animals/Panda/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('parrot', 'Parrot', [
    'Animals/Parrot/chatgpt-generated.webp',
    'Animals/Parrot/chatgpt-anime.webp',
    'Animals/Parrot/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('peacock', 'Peacock', [
    'Animals/Peacock/chatgpt-generated.webp',
    'Animals/Peacock/chatgpt-anime.webp',
    'Animals/Peacock/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('penguin', 'Penguin', [
    'Animals/Penguin/chatgpt-generated.webp',
    'Animals/Penguin/chatgpt-anime.webp',
    'Animals/Penguin/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('pig', 'Pig', [
    'Animals/Pig/chatgpt-generated.webp',
    'Animals/Pig/animal-champion-secondary.webp',
    'Animals/Pig/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY, ['piggy']),
  animal('polar-bear', 'Polar Bear', [
    'Animals/Polar Bear/chatgpt-generated.webp',
    'Animals/Polar Bear/chatgpt-anime.webp',
    'Animals/Polar Bear/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD, ['polar beer']),
  animal('rabbit', 'Rabbit', [
    'Animals/Rabbit/chatgpt-generated.webp',
    'Animals/Rabbit/animal-champion-secondary.webp',
    'Animals/Rabbit/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY, ['bunny']),
  animal('rhinoceros', 'Rhinoceros', [
    'Animals/Rhinoceros/chatgpt-generated.webp',
    'Animals/Rhinoceros/chatgpt-anime.webp',
    'Animals/Rhinoceros/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT, ['rhino']),
  animal('seal', 'Seal', [
    'Animals/Seal/chatgpt-generated.webp',
    'Animals/Seal/chatgpt-anime.webp',
    'Animals/Seal/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('shark', 'Shark', [
    'Animals/Shark/chatgpt-generated.webp',
    'Animals/Shark/animal-champion-secondary.webp',
    'Animals/Shark/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('sheep', 'Sheep', [
    'Animals/Sheep/chatgpt-generated.webp',
    'Animals/Sheep/chatgpt-anime.webp',
    'Animals/Sheep/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('snake', 'Snake', [
    'Animals/Snake/chatgpt-generated.webp',
    'Animals/Snake/animal-champion-secondary.webp',
    'Animals/Snake/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('squirrel', 'Squirrel', [
    'Animals/Squirrel/chatgpt-generated.webp',
    'Animals/Squirrel/chatgpt-anime.webp',
    'Animals/Squirrel/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('tiger', 'Tiger', [
    'Animals/Tiger/chatgpt-generated.webp',
    'Animals/Tiger/animal-champion-secondary.webp',
    'Animals/Tiger/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('turtle', 'Turtle', [
    'Animals/Turtle/chatgpt-generated.webp',
    'Animals/Turtle/chatgpt-anime.webp',
    'Animals/Turtle/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
  animal('whale', 'Whale', [
    'Animals/Whale/chatgpt-generated.webp',
    'Animals/Whale/chatgpt-anime.webp',
    'Animals/Whale/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EXPERT),
  animal('wolf', 'Wolf', [
    'Animals/Wolf/chatgpt-generated.webp',
    'Animals/Wolf/chatgpt-anime.webp',
    'Animals/Wolf/animal-champion-cartoon.webp',
  ], DIFFICULTIES.HARD),
  animal('zebra', 'Zebra', [
    'Animals/Zebra/chatgpt-generated.webp',
    'Animals/Zebra/animal-champion-secondary.webp',
    'Animals/Zebra/animal-champion-cartoon.webp',
  ], DIFFICULTIES.EASY),
]);
