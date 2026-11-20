const MEDIUM_WORD_CLUES = {
    'Ocean Life': {
        CRAB: 'Sideways I go! I have a hard shell and two claws.',
        FISH: 'I breathe under water and swim with fins.',
        SEAL: 'I have whiskers and flippers. Find me resting on a rock by the shore.',
        CLAM: 'I hide my soft body between two shells that snap shut.',
        KELP: 'I am a long kind of seaweed. I can grow in forests under the waves.',
        TUNA: 'This fast ocean fish is often sold in cans for salads and sandwiches.',
        ORCA: 'A black-and-white dolphin that hunts with its family group.',
        BASS: 'This name covers several fish often caught with a rod in lakes or at sea.'
    },
    Birds: {
        CROW: 'Caw, caw! I am a clever bird with shiny black feathers.',
        DUCK: 'I waddle on land, paddle in water, and say quack!',
        DOVE: 'This soft cooing bird is often drawn as a sign of peace.',
        SWAN: 'I glide across the pond with a long, curved neck.',
        GULL: 'Listen for my loud cry at the beach. I have long wings and may swoop for your snack.',
        BIRD: 'A penguin, a robin, and an ostrich all belong to this feathered group.'
    },
    'Plants and Garden': {
        LEAF: 'I grow on a plant and catch sunlight. I may turn red in fall.',
        SEED: 'Plant me in soil. With water, I may grow into a whole new plant.',
        MOSS: 'I make a soft green carpet on damp rocks and logs.',
        ROSE: 'My petals can smell sweet. Watch out for the sharp prickles on my stem.',
        OATS: 'Cook these grains in water or milk to make a warm bowl of porridge.',
        VINE: 'My long green stem can climb a fence. Grapes can grow on me.',
        STEM: 'I hold up a flower and carry water from its roots.',
        FERN: 'This leafy plant grows from spores and often unfurls from a tight curl.'
    },
    Animals: {
        GOAT: 'I can climb steep rocks. Some of us have a little beard under the chin.',
        FROG: 'Ribbit! I start life as a tadpole and grow legs for hopping.',
        MULE: 'I have long ears. One of my parents is a horse and one is a donkey.',
        DEER: 'I have hooves and can leap through the woods. Some of us grow antlers.',
        BEAR: 'I have big paws and thick fur. Some of us sleep in a den all winter.',
        LION: 'I am a big cat with a loud roar. A grown male often has a mane.',
        WOLF: 'I look like a large dog and may howl to call my pack.',
        LAMB: 'Baa! I am a baby sheep.',
        COLT: 'I am a young male horse. I may run beside my mother.',
        WORM: 'I have no legs. Look for me wriggling in the dirt.',
        LYNX: 'A wild cat with black tufts on the tips of its ears.',
        IBEX: 'A wild goat whose long curved horns can arch over its back.',
        MINK: 'A slender animal with thick fur that hunts in and around water.'
    },
    Colors: {
        BLUE: 'Look up on a clear day. What color fills most of the sky?',
        PINK: 'Mix a little red with white to make the color of many flamingos.',
        GOLD: 'A first place medal is usually this shiny yellow color.',
        GRAY: 'Mix black with white for the color of many storm clouds.'
    },
    Food: {
        MILK: 'Pour me over cereal or drink me with a cookie.',
        TACO: 'Fill my folded shell with beans, cheese, or meat.',
        SOUP: 'Ladle me into a bowl and eat me with a spoon.',
        CAKE: 'I am a sweet baked treat. Put candles on me for a birthday.',
        RICE: 'I come in little grains. Cook me until I am soft enough to eat.',
        SALT: 'I look like tiny white grains. Shake a little on fries for flavor.',
        STEW: 'I am a thick meal of meat or vegetables cooked slowly in a pot.',
        FLAN: 'A smooth baked custard with caramel sauce that flows over the top.',
        TOFU: 'This soft food made from soybeans can be fried or added to soup.',
        BRAN: 'This is the fiber-rich outer layer of a grain.'
    },
    'Fruits and Vegetables': {
        LIME: 'Squeeze this small green fruit for a sour splash of juice.',
        PLUM: 'I can have purple skin and sweet flesh, with a hard pit in the middle.',
        PEAR: 'I am a juicy fruit with a skinny top and a round bottom.',
        KIWI: 'My fuzzy brown skin hides green flesh with tiny black seeds.',
        CORN: 'Peel back my green husk to see rows of yellow kernels.'
    },
    Nature: {
        HILL: 'I rise above the ground around me. You might sled down my snowy side.',
        POND: 'I am a small, still body of water where frogs might live.',
        ROCK: 'I am a hard chunk of nature. A pebble is a little one.',
        SAND: 'My tiny grains slip through your fingers. Add water and build a castle.',
        MOON: 'I go around Earth. Some nights I look like a bright, round circle.',
        CAVE: 'My doorway is a hole in a hill or cliff. Bats may sleep inside.',
        REEF: 'I rise from the sea floor. Tiny coral animals can build one of me.',
        LAKE: 'I am a large body of water with land all around me.',
        NEST: 'A bird builds me to hold its eggs and keep its babies safe.',
        TREE: 'This tall plant usually has one woody trunk and branches that reach upward.',
        DUNE: 'The wind piles sand into one of these hills.',
        CRAG: 'A rough, steep face or mass of rock.'
    },
    Weather: {
        RAIN: 'Pitter patter! I fall from clouds and make puddles.',
        SNOW: 'I fall as frozen flakes. Pack me into a ball.',
        WIND: 'You cannot see me, but I can send your kite up in the air.',
        HAIL: 'I fall from a storm cloud in hard balls of ice.',
        MIST: 'Tiny drops hang in the air, but you can usually see farther through it than through fog.'
    },
    'Home Objects': {
        BELL: 'Ring me and listen for a ding!',
        BOOK: 'Open my cover to turn pages and read.',
        LAMP: 'Switch me on when your room gets dark.',
        SOAP: 'Rub me with water to make bubbles and wash your hands.',
        SINK: 'Turn on my tap to wash your hands. The water goes down my drain.',
        DOOR: 'Open me to walk into a room. Close me when you want quiet.',
        LOCK: 'I keep something shut until you use a key or a secret code.',
        FORK: 'I have pointy prongs to pick up a bite of food.',
        BOWL: 'My curved sides hold your cereal and keep the milk from spilling.',
        COAT: 'Zip or button me up before going outside on a chilly day.',
        SOCK: 'Pull me over your foot to keep it warm inside your shoe.',
        SHOE: 'Slip me on to protect your foot. You might tie my laces.',
        VEST: 'My front covers your chest, and I have no sleeves.',
        KITE: 'Hold my string and let the wind lift me into the sky.',
        DOLL: 'I am a toy shaped like a person. You might dress me or rock me to sleep.',
        ROPE: 'I am a thick cord. You can tie a knot in me or jump over me.',
        BATH: 'Soak in warm water to wash up. You can add bubbles!',
        TENT: 'Pitch me at a campsite and zip my flap shut to sleep inside.'
    },
    Transportation: {
        BIKE: 'Push my pedals to ride on two wheels.',
        BOAT: 'I float, so you can ride me across the water.',
        SHIP: 'I am a very large boat that can carry people or cargo across an ocean.',
        TAXI: 'Wave for a ride in this car and pay the driver when you arrive.',
        RAFT: 'I am a flat float. You can paddle me down a river.',
        SLED: 'This ride slides on runners instead of wheels down a snowy hill.'
    },
    Sports: {
        BALL: 'Bounce me, roll me, or toss me to a friend.',
        KICK: 'Use your foot to send the soccer ball flying.',
        JUMP: 'Push off the ground with your feet and go up into the air.',
        DIVE: 'Go headfirst into the water after a leap from the pool deck.',
        RACE: 'Ready, set, go! Try to get to the finish before everyone else.',
        GAME: 'An activity with rules that people play for fun or competition.'
    },
    'Human Body': {
        CHIN: 'Find me just below your mouth, at the bottom of your face.',
        FOOT: 'Put a sock on me before you put on your shoe.',
        HAND: 'I have a thumb and four fingers. Wave me to say hello.',
        KNEE: 'I bend in the middle of your leg, between your thigh and shin.',
        NOSE: 'Sniff! I help you smell dinner from across the room.',
        HAIR: 'I grow from the top of your head. You can comb or braid me.',
        FACE: 'You can see my eyes, nose, and mouth in the mirror.',
        SKIN: 'I am the outer layer that covers and protects your body.',
        BONE: 'I am a hard piece of your skeleton. Your ribs are made of me.'
    },
    'Arts and Music': {
        DRUM: 'Hit my stretched top with your hands or sticks to make a beat.',
        SING: 'Use your voice to make a tune with words or sounds.',
        TUNE: 'I am the part of a song made from notes you can hum.',
        CLAP: 'Bring your hands together to make a quick smacking sound.',
        DUET: 'Two musicians perform this kind of piece together.',
        TRIO: 'A group of exactly three performers.'
    },
    School: {
        DESK: 'Sit at me to write, draw, or do your schoolwork.',
        GLUE: 'Spread me on paper to stick your craft together.',
        QUIZ: 'Answer a few short questions to show what you know.'
    },
    Space: {
        STAR: 'I look like a tiny twinkle at night, but I am really a hot ball far away.'
    },
    Science: {
        ATOM: 'This tiny piece of an element has a central nucleus and surrounding electrons.',
        CELL: 'This basic unit of life can be a whole organism or one part of a larger living thing.',
        ION: 'An atom or group of atoms that has an electric charge.',
        ACID: 'A substance like the material that makes lemon juice sour.',
        LAVA: 'Molten rock gets this name once it pours out at the surface.'
    },
    'Language Arts': {
        READ: 'Look at printed or displayed words and understand what they say.',
        WORD: 'A unit of language that can name something, describe it, or express an action.',
        VERB: 'A word that can name an action or a state of being.',
        NOUN: 'A word that names a person, place, thing, or idea.',
        PLOT: 'The connected events that make up a story.',
        ODE: 'A poem written to praise or celebrate its subject.'
    },
    Math: {
        AREA: 'This tells how much surface is inside a flat shape.',
        ARC: 'A curved portion of a circle.',
        ODD: 'A whole number has this property when dividing it by two leaves one over.',
        EVEN: 'A whole number has this property when it can be split into two equal groups.'
    },
    Engineering: {
        BOLT: 'A threaded metal fastener that often holds two parts together with a nut.',
        GEAR: 'Teeth on this wheel mesh with another wheel to pass along motion.',
        AXLE: 'A shaft that supports a wheel or turns with it.'
    },
    'Community Helpers': {
        CHEF: 'This person plans dishes and may lead a restaurant kitchen.'
    },
    'Farm Life': {
        BARN: 'A farm building that can shelter livestock, hay, or equipment.',
        FARM: 'People use this land to raise animals or grow crops.'
    },
    Health: {
        REST: 'Take a break from activity to get your strength back.'
    },
    'Character Traits': {
        CALM: 'You feel steady and unhurried, like the surface of a lake on a windless day.'
    },
    Geography: {
        GULF: 'A large arm of the sea that reaches into the land.',
        VALE: 'An older word for a wide space between hills.'
    },
    History: {
        CZAR: 'This title was used by rulers of Russia before the end of its monarchy.'
    },
    Technology: {
        CHIP: 'A tiny piece of material that carries an electronic circuit.'
    }
};
