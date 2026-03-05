/**
 * Word library index
 * Large structured vocabulary catalog for long-form replay variety.
 */
const WORD_LIBRARY_SECTIONS = [
    {
        category: 'Animals',
        words: [
            'badger', 'beaver', 'bison', 'buffalo', 'camel', 'cougar', 'coyote', 'donkey', 'ferret', 'gazelle',
            'giraffe', 'hamster', 'hyena', 'jaguar', 'koala', 'leopard', 'lemur', 'llama', 'meerkat', 'monkey',
            'otter', 'panda', 'rabbit', 'raccoon', 'zebra'
        ]
    },
    {
        category: 'Ocean Life',
        words: [
            'clam', 'coral', 'dolphin', 'eel', 'jellyfish', 'lobster', 'manatee', 'narwhal', 'octopus', 'orca',
            'plankton', 'puffer', 'salmon', 'seahorse', 'seal', 'shark', 'shrimp', 'snapper', 'squid', 'starfish',
            'stingray', 'trout', 'tuna', 'walrus', 'whale'
        ]
    },
    {
        category: 'Birds',
        words: [
            'albatross', 'canary', 'cardinal', 'crane', 'crow', 'eagle', 'falcon', 'finch', 'flamingo', 'goose',
            'hawk', 'heron', 'kingfisher', 'macaw', 'owl', 'parrot', 'peacock', 'pelican', 'penguin', 'pigeon',
            'robin', 'sparrow', 'stork', 'swan', 'toucan'
        ]
    },
    {
        category: 'Food',
        words: [
            'bagel', 'biscuit', 'brownie', 'burger', 'cereal', 'cheese', 'cookie', 'cracker', 'dumpling', 'granola',
            'lasagna', 'muffin', 'noodles', 'omelet', 'pancake', 'pickle', 'popcorn', 'pretzel', 'pudding', 'sandwich',
            'sausage', 'spaghetti', 'taco', 'waffle', 'yogurt'
        ]
    },
    {
        category: 'Fruits and Vegetables',
        words: [
            'apple', 'apricot', 'avocado', 'banana', 'broccoli', 'cabbage', 'carrot', 'cauliflower', 'celery', 'cherry',
            'coconut', 'cucumber', 'grapefruit', 'grapes', 'lettuce', 'mango', 'onion', 'orange', 'papaya', 'peach',
            'pear', 'pepper', 'pineapple', 'pumpkin', 'spinach'
        ]
    },
    {
        category: 'Nature',
        words: [
            'avalanche', 'boulder', 'canyon', 'cliff', 'coastline', 'desert', 'forest', 'geyser', 'glacier', 'grassland',
            'hilltop', 'island', 'lagoon', 'meadow', 'mountain', 'oasis', 'prairie', 'raindrop', 'rainfall', 'rainforest',
            'river', 'stream', 'valley', 'waterfall', 'wildflower'
        ]
    },
    {
        category: 'Weather',
        words: [
            'blizzard', 'breeze', 'cloudburst', 'drizzle', 'forecast', 'hailstorm', 'heatwave', 'hurricane', 'lightning', 'mist',
            'monsoon', 'overcast', 'rainbow', 'snowfall', 'sunbeam', 'sunrise', 'sunset', 'temperature', 'thermometer', 'thunder',
            'tornado', 'vapor', 'whirlwind', 'windstorm', 'rainstorm'
        ]
    },
    {
        category: 'Space',
        words: [
            'asteroid', 'astronaut', 'comet', 'constellation', 'cosmos', 'crater', 'eclipse', 'galaxy', 'gravity', 'horizon',
            'launchpad', 'meteor', 'moonbeam', 'nebula', 'orbit', 'planet', 'quasar', 'rocket', 'satellite', 'solstice',
            'spaceship', 'stardust', 'starlight', 'sunlight', 'telescope'
        ]
    },
    {
        category: 'Science',
        words: [
            'atom', 'bacteria', 'carbon', 'cellular', 'chemical', 'climate', 'crystal', 'current', 'ecosystem', 'electricity',
            'element', 'energy', 'enzyme', 'experiment', 'friction', 'habitat', 'magnet', 'matter', 'microscope', 'mineral',
            'molecule', 'neuron', 'nucleus', 'oxygen', 'spectrum'
        ]
    },
    {
        category: 'Human Body',
        words: [
            'ankle', 'backbone', 'brain', 'cheek', 'earlobe', 'elbow', 'eyebrow', 'eyelid', 'finger', 'forearm',
            'heartbeat', 'jawbone', 'kidney', 'knuckle', 'lungs', 'muscle', 'neck', 'ribcage', 'shoulder', 'skeleton',
            'spinal', 'stomach', 'throat', 'tongue', 'wrist'
        ]
    },
    {
        category: 'Health',
        words: [
            'balance', 'breathing', 'calcium', 'dentist', 'exercise', 'fitness', 'healthy', 'hygiene', 'medicine', 'mindful',
            'nutrition', 'patient', 'pharmacy', 'posture', 'protein', 'recovery', 'restful', 'routine', 'sleeping', 'stretching',
            'vitamin', 'walking', 'wellness', 'workout', 'yoga'
        ]
    },
    {
        category: 'School',
        words: [
            'backpack', 'classroom', 'clipboard', 'college', 'counselor', 'diploma', 'eraser', 'homework', 'journal', 'laboratory',
            'lesson', 'library', 'lunchroom', 'marker', 'notebook', 'pencil', 'principal', 'project', 'recess', 'report',
            'ruler', 'sciencefair', 'student', 'teacher', 'worksheet'
        ]
    },
    {
        category: 'Language Arts',
        words: [
            'adjective', 'alphabet', 'analogy', 'antonym', 'chapter', 'consonant', 'dictionary', 'editor', 'grammar', 'headline',
            'idiom', 'metaphor', 'narrator', 'paragraph', 'phonics', 'poetry', 'prefix', 'pronoun', 'punctuation', 'sentence',
            'spelling', 'stanza', 'suffix', 'synonym', 'vowel'
        ]
    },
    {
        category: 'Math',
        words: [
            'addition', 'algebra', 'angle', 'decimal', 'diameter', 'division', 'equation', 'estimate', 'exponent', 'fraction',
            'geometry', 'graph', 'integer', 'measure', 'multiply', 'numerator', 'parallel', 'pattern', 'perimeter', 'polygon',
            'product', 'quotient', 'sequence', 'symmetry', 'triangle'
        ]
    },
    {
        category: 'Geography',
        words: [
            'archipelago', 'border', 'capital', 'compass', 'continent', 'country', 'delta', 'equator', 'estuary', 'globe',
            'harbor', 'hemisphere', 'isthmus', 'latitude', 'longitude', 'peninsula', 'plateau', 'province', 'region', 'savanna',
            'suburb', 'territory', 'tundra', 'village', 'volcano'
        ]
    },
    {
        category: 'History',
        words: [
            'ancestor', 'artifact', 'calendar', 'century', 'colony', 'culture', 'dynasty', 'empire', 'explorer', 'frontier',
            'heritage', 'history', 'kingdom', 'landmark', 'medieval', 'monument', 'museum', 'pioneer', 'relic', 'revolution',
            'settlement', 'timeline', 'tradition', 'victory', 'warrior'
        ]
    },
    {
        category: 'Government',
        words: [
            'ballot', 'campaign', 'charter', 'citizen', 'community', 'congress', 'constitution', 'council', 'democracy', 'election',
            'freedom', 'government', 'justice', 'lawmaker', 'liberty', 'mayor', 'parliament', 'policy', 'president', 'public',
            'republic', 'rights', 'senator', 'treaty', 'vote'
        ]
    },
    {
        category: 'Technology',
        words: [
            'battery', 'browser', 'charger', 'computer', 'database', 'desktop', 'digital', 'download', 'firewall', 'headset',
            'internet', 'keyboard', 'laptop', 'monitor', 'network', 'password', 'printer', 'processor', 'screen', 'signal',
            'software', 'storage', 'tablet', 'upload', 'website'
        ]
    },
    {
        category: 'Engineering',
        words: [
            'blueprint', 'bolt', 'bridge', 'builder', 'circuit', 'crane', 'engine', 'gearbox', 'generator', 'hammer',
            'machine', 'material', 'mechanic', 'motor', 'pipeline', 'platform', 'pulley', 'robotics', 'sensor', 'switch',
            'toolbox', 'turbine', 'vehicle', 'workshop', 'wrench'
        ]
    },
    {
        category: 'Arts and Music',
        words: [
            'audience', 'ballet', 'canvas', 'chorus', 'collage', 'costume', 'dancer', 'drawing', 'festival', 'gallery',
            'guitar', 'harmony', 'melody', 'museum', 'orchestra', 'palette', 'painting', 'piano', 'portrait', 'rhythm',
            'sculpture', 'sketchbook', 'spotlight', 'theater', 'violin'
        ]
    },
    {
        category: 'Sports',
        words: [
            'archery', 'athlete', 'badminton', 'baseball', 'basketball', 'bowling', 'captain', 'climbing', 'cricket', 'cycling',
            'defense', 'dribble', 'fishing', 'gymnastics', 'helmet', 'hiking', 'hockey', 'offense', 'paddling', 'passing',
            'referee', 'skating', 'soccer', 'stadium', 'trophy'
        ]
    },
    {
        category: 'Home Objects',
        words: [
            'alarmclock', 'blanket', 'bookshelf', 'cabinet', 'carpet', 'cushion', 'curtain', 'doorknob', 'flashlight', 'flowerpot',
            'hallway', 'kitchen', 'lantern', 'microwave', 'pillow', 'picture', 'suitcase', 'toothbrush', 'umbrella', 'vase',
            'wardrobe', 'window', 'wateringcan', 'whistle', 'mirror'
        ]
    },
    {
        category: 'Plants and Garden',
        words: [
            'acorn', 'bamboo', 'blossom', 'cactus', 'cedar', 'clover', 'compost', 'daisy', 'fern', 'garden',
            'greenhouse', 'ivy', 'lavender', 'maple', 'moss', 'orchard', 'parsley', 'petal', 'pinecone', 'rosemary',
            'sapling', 'seedling', 'sunflower', 'tulip', 'willow'
        ]
    },
    {
        category: 'Character Traits',
        words: [
            'adventure', 'bravery', 'cheerful', 'confidence', 'courage', 'creativity', 'curious', 'determination', 'empathy', 'fairness',
            'friendship', 'generosity', 'grateful', 'helpful', 'honesty', 'kindness', 'leadership', 'loyalty', 'optimism', 'patience',
            'peaceful', 'respectful', 'resilience', 'thoughtful', 'wonder'
        ]
    }
];

const WORD_LIBRARY_EXPANSION_SECTIONS = [
    {
        category: 'Insects and Bugs',
        words: [
            'aphid', 'beetle', 'bumblebee', 'caterpillar', 'centipede', 'cicada', 'cockroach', 'damselfly', 'dragonfly', 'firefly',
            'glowworm', 'grasshopper', 'hornet', 'ladybug', 'locust', 'mantis', 'mayfly', 'mosquito', 'termite', 'walkingstick',
            'weevil', 'wasp'
        ]
    },
    {
        category: 'Reptiles and Amphibians',
        words: [
            'alligator', 'anaconda', 'chameleon', 'cobra', 'crocodile', 'froglet', 'gecko', 'iguana', 'lizard', 'monitor',
            'newt', 'python', 'salamander', 'serpent', 'skink', 'tadpole', 'terrapin', 'toad', 'tortoise', 'turtle',
            'viper', 'treefrog'
        ]
    },
    {
        category: 'Transportation',
        words: [
            'airplane', 'bicycle', 'caboose', 'canoe', 'ferry', 'glider', 'gondola', 'helicopter', 'kayak', 'locomotive',
            'minivan', 'motorcycle', 'pickup', 'railway', 'runway', 'scooter', 'sidecar', 'subway', 'trailer', 'tramway',
            'wagon', 'yacht', 'zeppelin'
        ]
    },
    {
        category: 'Community Helpers',
        words: [
            'architect', 'baker', 'barber', 'carpenter', 'cashier', 'chef', 'coach', 'doctor', 'electrician', 'farmer',
            'firefighter', 'florist', 'guide', 'judge', 'librarian', 'nurse', 'officer', 'paramedic', 'pharmacist', 'pilot',
            'plumber', 'reporter', 'scientist', 'tailor', 'writer'
        ]
    },
    {
        category: 'Materials and Chemistry',
        words: [
            'alloy', 'aluminum', 'calcium', 'ceramic', 'chlorine', 'cobalt', 'copper', 'formula', 'graphite', 'helium',
            'hydrogen', 'insulator', 'iodine', 'ironwork', 'lithium', 'mercury', 'mixture', 'nickel', 'plastic', 'polymer',
            'potassium', 'reaction', 'silicon', 'solvent', 'titanium'
        ]
    },
    {
        category: 'Physics and Motion',
        words: [
            'acceleration', 'airflow', 'amplitude', 'collision', 'elastic', 'equilibrium', 'frequency', 'impulse', 'inertia', 'kinetic',
            'leverage', 'momentum', 'motion', 'oscillation', 'pendulum', 'pressure', 'radiation', 'resistance', 'rotation', 'torque',
            'trajectory', 'vibration', 'voltage', 'wavelength', 'waveform'
        ]
    },
    {
        category: 'Coding and Logic',
        words: [
            'binary', 'boolean', 'branching', 'command', 'compiler', 'coding', 'debugger', 'encryption', 'function', 'hardware',
            'iteration', 'looping', 'module', 'operand', 'operator', 'pixel', 'program', 'pseudocode', 'reboot', 'server',
            'syntax', 'variable', 'workflow'
        ]
    },
    {
        category: 'Ancient World',
        words: [
            'amphora', 'aqueduct', 'citadel', 'colosseum', 'emperor', 'forum', 'gladiator', 'hieroglyph', 'legion', 'marble',
            'mythology', 'obelisk', 'oracle', 'papyrus', 'pharaoh', 'pyramid', 'ruins', 'scholar', 'senate', 'statue',
            'temple', 'trireme'
        ]
    },
    {
        category: 'Environment',
        words: [
            'atmosphere', 'biodiversity', 'biome', 'cleanup', 'conservation', 'drought', 'ecology', 'emissions', 'endangered', 'erosion',
            'landfill', 'pollution', 'preserve', 'recycle', 'renewable', 'resource', 'reusable', 'stewardship', 'sustain', 'watershed',
            'wetlands', 'wildlife'
        ]
    },
    {
        category: 'Architecture',
        words: [
            'apartment', 'archway', 'balcony', 'basement', 'brickwork', 'cathedral', 'corridor', 'cottage', 'courtyard', 'doorway',
            'elevator', 'foundation', 'lighthouse', 'mansion', 'pillar', 'porch', 'rooftop', 'staircase', 'structure', 'tower',
            'windmill', 'windowpane'
        ]
    },
    {
        category: 'Business and Money',
        words: [
            'allowance', 'banking', 'barter', 'budget', 'business', 'checkout', 'coinage', 'customer', 'donation', 'earning',
            'finance', 'income', 'invoice', 'marketplace', 'payment', 'profit', 'purchase', 'receipt', 'savings', 'service',
            'shopping', 'storefront', 'wallet', 'wholesale'
        ]
    },
    {
        category: 'Kitchen and Cooking',
        words: [
            'apron', 'blender', 'boiling', 'cookbook', 'cupboard', 'cutlery', 'freezer', 'ingredient', 'kettle', 'ladle',
            'measuring', 'mixing', 'napkin', 'ovenmitt', 'pantry', 'recipe', 'rollingpin', 'saucepan', 'simmering', 'skillet',
            'spatula', 'toaster', 'utensil', 'whisk'
        ]
    },
    {
        category: 'Music Performance',
        words: [
            'accordion', 'banjo', 'clarinet', 'composer', 'drummer', 'ensemble', 'flutist', 'harmonica', 'improvise', 'lyrics',
            'microphone', 'notation', 'percussion', 'rehearsal', 'saxophone', 'soloist', 'songwriter', 'tempo', 'trumpet', 'ukulele',
            'vocalist', 'woodwind', 'xylophone'
        ]
    },
    {
        category: 'Travel and Places',
        words: [
            'boardwalk', 'campground', 'crossing', 'destination', 'expedition', 'guidebook', 'hostel', 'itinerary', 'journey', 'landscape',
            'lodging', 'passport', 'postcard', 'railroad', 'roadtrip', 'sightseeing', 'station', 'tourism', 'trailhead', 'traveler',
            'vacation', 'waypoint'
        ]
    },
    {
        category: 'Celebrations',
        words: [
            'anniversary', 'balloons', 'birthday', 'carnival', 'celebrate', 'ceremony', 'cheering', 'confetti', 'countdown', 'cupcake',
            'feast', 'fireworks', 'gathering', 'giftwrap', 'holiday', 'invitation', 'lanterns', 'parade', 'present', 'reunion',
            'sparkler', 'souvenir'
        ]
    },
    {
        category: 'Farm Life',
        words: [
            'barnyard', 'cattle', 'cornfield', 'countryside', 'fencing', 'goat', 'haystack', 'milking', 'pasture', 'piglet',
            'rooster', 'saddle', 'scarecrow', 'seedbag', 'shepherd', 'silo', 'stable', 'thresher', 'wheat', 'woolly'
        ]
    }
];

const WORD_LIBRARY_CLUE_TEMPLATES = {
    'Animals': [
        'A land animal you might study in wildlife science.',
        'A creature word from the animal kingdom.'
    ],
    'Ocean Life': [
        'A sea creature or ocean life word.',
        'A marine animal you might learn about in science.'
    ],
    'Birds': [
        'A bird name from the natural world.',
        'A feathered animal often seen in nature study.'
    ],
    'Food': [
        'A food word connected to cooking or meals.',
        'Something people might eat at breakfast, lunch, or dinner.'
    ],
    'Fruits and Vegetables': [
        'A fruit or vegetable word connected to healthy eating.',
        'A plant food often found in kitchens or gardens.'
    ],
    'Nature': [
        'A word connected to the natural world outdoors.',
        'A landform or nature word studied in earth science.'
    ],
    'Weather': [
        'A weather word about what happens in the sky or air.',
        'A term connected to storms, seasons, or forecasting.'
    ],
    'Space': [
        'A word connected to space, planets, or stars.',
        'A term you might hear during a lesson about the universe.'
    ],
    'Science': [
        'A science word connected to experiments or the natural world.',
        'A term often used in science class.'
    ],
    'Human Body': [
        'A word for a body part or body system.',
        'A human body term studied in health or science.'
    ],
    'Health': [
        'A health word connected to caring for your body.',
        'A wellness term about healthy habits.'
    ],
    'School': [
        'A school word connected to learning tools or places.',
        'A term you might use during a school day.'
    ],
    'Language Arts': [
        'A reading or writing word from language arts.',
        'A vocabulary term connected to words and sentences.'
    ],
    'Math': [
        'A math word connected to numbers, shapes, or patterns.',
        'A term you might learn in a math lesson.'
    ],
    'Geography': [
        'A geography word connected to maps or places on Earth.',
        'A social studies term about land, water, or regions.'
    ],
    'History': [
        'A history word connected to people, places, or events from the past.',
        'A social studies term from long ago.'
    ],
    'Government': [
        'A civics word about rules, voting, or public leadership.',
        'A government term used in citizenship lessons.'
    ],
    'Technology': [
        'A technology word about computers or digital tools.',
        'A term connected to devices, software, or the internet.'
    ],
    'Engineering': [
        'An engineering word connected to building or machines.',
        'A design and construction term.'
    ],
    'Arts and Music': [
        'An arts or music word connected to performance or creativity.',
        'A creative word used in art, theater, or music.'
    ],
    'Sports': [
        'A sports word connected to games, movement, or teamwork.',
        'An athletics term used in physical activity.'
    ],
    'Home Objects': [
        'A household object you might find at home.',
        'An everyday item used around the house.'
    ],
    'Plants and Garden': [
        'A plant or garden word from the natural world.',
        'A nature term connected to growing things.'
    ],
    'Character Traits': [
        'A word that describes a positive trait or feeling.',
        'A character-building word about how people act or think.'
    ],
    'Insects and Bugs': [
        'A bug or insect word from nature study.',
        'A small creature word connected to insects or bugs.'
    ],
    'Reptiles and Amphibians': [
        'A reptile or amphibian word from animal science.',
        'A cold-blooded animal word from nature learning.'
    ],
    'Transportation': [
        'A transportation word about how people or goods travel.',
        'A vehicle or travel word from everyday life.'
    ],
    'Community Helpers': [
        'A job word for someone who helps a community.',
        'A career or service word about helping people.'
    ],
    'Materials and Chemistry': [
        'A material or chemistry word from science class.',
        'A science term about substances, elements, or mixtures.'
    ],
    'Physics and Motion': [
        'A physics word about movement, force, or energy.',
        'A science term connected to motion or physical change.'
    ],
    'Coding and Logic': [
        'A coding or computer-thinking word from technology.',
        'A digital logic term used in computing.'
    ],
    'Ancient World': [
        'A history word connected to ancient civilizations.',
        'A word from long ago, often studied in world history.'
    ],
    'Environment': [
        'An environment word about caring for Earth.',
        'A science word about nature, ecosystems, or conservation.'
    ],
    'Architecture': [
        'A building or structure word from architecture.',
        'A design word connected to homes, buildings, or places.'
    ],
    'Business and Money': [
        'A business or money word from everyday economics.',
        'A financial word about saving, buying, or earning.'
    ],
    'Kitchen and Cooking': [
        'A kitchen or cooking word from food preparation.',
        'A household word used while cooking or baking.'
    ],
    'Music Performance': [
        'A music performance word about playing or singing.',
        'A performing arts term used in music.'
    ],
    'Travel and Places': [
        'A travel word about journeys, destinations, or places.',
        'A location or travel-planning word from real-world exploration.'
    ],
    'Celebrations': [
        'A celebration word about parties, holidays, or special events.',
        'A festive word connected to joyful gatherings.'
    ],
    'Farm Life': [
        'A farm word about animals, crops, or country life.',
        'A countryside vocabulary word from agriculture.'
    ]
};

const WORD_LIBRARY_TRACKS = [
    {
        id: 'nature-explorer',
        title: 'Nature Explorer',
        categories: [
            'Animals',
            'Ocean Life',
            'Birds',
            'Nature',
            'Weather',
            'Plants and Garden',
            'Insects and Bugs',
            'Reptiles and Amphibians',
            'Environment',
            'Farm Life',
            'Fruits and Vegetables'
        ]
    },
    {
        id: 'stem-lab',
        title: 'STEM Lab',
        categories: [
            'Space',
            'Science',
            'Human Body',
            'Health',
            'Math',
            'Technology',
            'Engineering',
            'Materials and Chemistry',
            'Physics and Motion',
            'Coding and Logic'
        ]
    },
    {
        id: 'world-explorer',
        title: 'World Explorer',
        categories: [
            'Geography',
            'History',
            'Government',
            'Ancient World',
            'Architecture',
            'Transportation',
            'Community Helpers',
            'Travel and Places',
            'Business and Money'
        ]
    },
    {
        id: 'creative-life',
        title: 'Creative Life',
        categories: [
            'School',
            'Language Arts',
            'Arts and Music',
            'Music Performance',
            'Character Traits',
            'Home Objects',
            'Kitchen and Cooking',
            'Food',
            'Sports',
            'Celebrations'
        ]
    }
];

const WORD_LIBRARY_DIFFICULTY_ORDER = ['easy', 'medium', 'hard', 'extreme'];

function normalizeWordLibraryWord(rawWord) {
    if (typeof rawWord !== 'string') return '';
    return rawWord.trim().replace(/[^a-z]/gi, '').toUpperCase();
}

function classifyWordLibraryDifficulty(word) {
    const rareLetters = (word.match(/[JKQVXZ]/g) || []).length;
    const score = word.length + (rareLetters * 1.5);

    if (score <= 5.5) return 'easy';
    if (score <= 7.5) return 'medium';
    if (score <= 9.5) return 'hard';
    return 'extreme';
}

function buildWordLibraryClue(word, category, templateIndex) {
    const templates = WORD_LIBRARY_CLUE_TEMPLATES[category] || [
        `A vocabulary word connected to ${category.toLowerCase()}.`,
        `A learning word from the topic of ${category.toLowerCase()}.`
    ];
    const baseClue = templates[templateIndex % templates.length];
    return `${baseClue} It has ${word.length} letters.`;
}

function resolveTrackIdsForCategory(category) {
    return WORD_LIBRARY_TRACKS
        .filter((track) => track.categories.includes(category))
        .map((track) => track.id);
}

const WORD_LIBRARY_INDEX = (() => {
    const seenWords = new Set();
    const records = [];
    let runningId = 0;

    [...WORD_LIBRARY_SECTIONS, ...WORD_LIBRARY_EXPANSION_SECTIONS].forEach((section) => {
        section.words.forEach((rawWord, index) => {
            const normalizedWord = normalizeWordLibraryWord(rawWord);
            if (!normalizedWord || normalizedWord.length < 4) return;
            if (seenWords.has(normalizedWord)) return;

            seenWords.add(normalizedWord);
            const difficulty = classifyWordLibraryDifficulty(normalizedWord);
            records.push({
                id: `word-puzzle-${runningId + 1}`,
                word: normalizedWord,
                category: section.category,
                tracks: resolveTrackIdsForCategory(section.category),
                difficulty,
                clue: buildWordLibraryClue(normalizedWord, section.category, index),
                length: normalizedWord.length
            });
            runningId += 1;
        });
    });

    return records;
})();

if (typeof window !== 'undefined') {
    window.wordPuzzleLibraryStats = WORD_LIBRARY_INDEX.reduce((stats, entry) => {
        stats.total += 1;
        stats.byDifficulty[entry.difficulty] = (stats.byDifficulty[entry.difficulty] || 0) + 1;
        entry.tracks.forEach((trackId) => {
            stats.byTrack[trackId] = (stats.byTrack[trackId] || 0) + 1;
        });
        return stats;
    }, {
        total: 0,
        byDifficulty: {},
        byTrack: {}
    });
}
