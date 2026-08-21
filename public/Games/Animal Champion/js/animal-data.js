const animal = (id, name, images, speechAliases = []) => Object.freeze({
  id,
  name,
  alt: `${/^[aeiou]/i.test(name) ? 'An' : 'A'} ${name.toLowerCase()} in its natural habitat`,
  images: Object.freeze(images),
  speechAliases: Object.freeze(speechAliases),
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
  ], ['kitten']),
  animal('cheetah', 'Cheetah', [
    'Animals/Cheetah/93ff7ae1-90a0-428d-8db7-fd4b3a9f54b0.webp',
    'Animals/Cheetah/animal-champion-secondary.webp',
  ], ['cheater']),
  animal('chicken', 'Chicken', [
    'Animals/Chicken/chatgpt-generated.webp',
    'Animals/Chicken/chatgpt-anime.webp',
  ], ['hen', 'rooster', 'chick']),
  animal('chimpanzee', 'Chimpanzee', [
    'Animals/Chimpanzee/chatgpt-generated.webp',
    'Animals/Chimpanzee/chatgpt-anime.webp',
  ], ['chimp']),
  animal('cow', 'Cow', [
    'Animals/Cow/chatgpt-generated.webp',
    'Animals/Cow/chatgpt-anime.webp',
  ]),
  animal('crocodile', 'Crocodile', [
    'Animals/Crocodile/animal-champion-primary.webp',
    'Animals/Crocodile/animal-champion-secondary.webp',
  ], ['croc']),
  animal('deer', 'Deer', [
    'Animals/Deer/chatgpt-generated.webp',
    'Animals/Deer/chatgpt-anime.webp',
  ]),
  animal('dog', 'Dog', [
    'Animals/Dog/chatgpt-generated.webp',
    'Animals/Dog/chatgpt-anime.webp',
  ], ['puppy']),
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
  ], ['hippo']),
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
  ], ['mice']),
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
  ], ['piggy']),
  animal('polar-bear', 'Polar Bear', [
    'Animals/Polar Bear/chatgpt-generated.webp',
    'Animals/Polar Bear/chatgpt-anime.webp',
  ], ['polar beer']),
  animal('rabbit', 'Rabbit', [
    'Animals/Rabbit/chatgpt-generated.webp',
    'Animals/Rabbit/animal-champion-secondary.webp',
  ], ['bunny']),
  animal('rhinoceros', 'Rhinoceros', [
    'Animals/Rhinoceros/chatgpt-generated.webp',
    'Animals/Rhinoceros/chatgpt-anime.webp',
  ], ['rhino']),
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
