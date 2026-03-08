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

const WORD_LIBRARY_EARLY_READER_SECTIONS = [
    {
        category: 'Animals',
        words: [
            'ant', 'bee', 'cat', 'cow', 'dog', 'fox', 'hen', 'pig', 'ram', 'yak'
        ]
    },
    {
        category: 'Ocean Life',
        words: [
            'cod', 'eel', 'koi', 'ray'
        ]
    },
    {
        category: 'Birds',
        words: [
            'emu', 'jay', 'owl'
        ]
    },
    {
        category: 'Colors',
        words: [
            'red', 'tan'
        ]
    },
    {
        category: 'Food',
        words: [
            'bun', 'egg', 'ham', 'jam', 'pie', 'tea'
        ]
    },
    {
        category: 'Fruits and Vegetables',
        words: [
            'fig', 'pea', 'yam'
        ]
    },
    {
        category: 'Nature',
        words: [
            'log', 'mud', 'sea', 'sky', 'sun'
        ]
    },
    {
        category: 'Weather',
        words: [
            'dew', 'fog', 'ice'
        ]
    },
    {
        category: 'Home Objects',
        words: [
            'bed', 'box', 'cup', 'hat', 'jar', 'key', 'pan', 'pot', 'rug'
        ]
    },
    {
        category: 'Plants and Garden',
        words: [
            'bud', 'elm', 'fir', 'ivy', 'oak'
        ]
    },
    {
        category: 'Transportation',
        words: [
            'bus', 'car', 'van'
        ]
    },
    {
        category: 'Sports',
        words: [
            'bat', 'run', 'ski'
        ]
    },
    {
        category: 'Human Body',
        words: [
            'arm', 'ear', 'eye', 'hip', 'jaw', 'leg', 'lip', 'toe'
        ]
    },
    {
        category: 'Arts and Music',
        words: [
            'art', 'hum', 'tap'
        ]
    }
];

const WORD_LIBRARY_MIDDLE_READER_SECTIONS = [
    {
        category: 'Animals',
        words: [
            'frog', 'goat', 'lamb', 'animal', 'beaver', 'camel', 'eagle', 'koala', 'llama', 'monkey', 'otter', 'panda', 'rabbit', 'zebra'
        ]
    },
    {
        category: 'Ocean Life',
        words: [
            'clam', 'crab', 'fish', 'seal', 'coral', 'salmon', 'shrimp', 'squid', 'trout', 'walrus'
        ]
    },
    {
        category: 'Birds',
        words: [
            'bird', 'crow', 'dove', 'swan', 'crane', 'falcon', 'heron', 'stork', 'toucan'
        ]
    },
    {
        category: 'Colors',
        words: [
            'blue', 'gold', 'gray', 'green', 'pink', 'white'
        ]
    },
    {
        category: 'Food',
        words: [
            'bread', 'cereal', 'cheese', 'cookie', 'juice', 'milk', 'muffin', 'omelet', 'pickle', 'toast', 'yogurt'
        ]
    },
    {
        category: 'Fruits and Vegetables',
        words: [
            'apple', 'banana', 'berry', 'carrot', 'celery', 'cherry', 'grape', 'grapes', 'lemon', 'melon', 'orange', 'peach', 'pear', 'pepper', 'plum'
        ]
    },
    {
        category: 'Nature',
        words: [
            'cloud', 'flower', 'forest', 'light', 'meadow', 'moon', 'rain', 'river', 'rock', 'stone', 'stream', 'tree', 'valley', 'water'
        ]
    },
    {
        category: 'Weather',
        words: [
            'breeze', 'frost', 'storm', 'sunny', 'wind'
        ]
    },
    {
        category: 'Space',
        words: [
            'comet', 'galaxy', 'meteor', 'orbit', 'planet', 'rocket', 'star'
        ]
    },
    {
        category: 'Science',
        words: [
            'carbon', 'energy', 'magnet', 'matter', 'oxygen'
        ]
    },
    {
        category: 'Human Body',
        words: [
            'ankle', 'brain', 'elbow', 'finger', 'kidney', 'lungs', 'muscle', 'throat', 'tongue', 'wrist'
        ]
    },
    {
        category: 'Health',
        words: [
            'brush', 'clean', 'dental', 'health', 'rest', 'sleep', 'smile', 'soap'
        ]
    },
    {
        category: 'School',
        words: [
            'chalk', 'class', 'desk', 'eraser', 'lesson', 'marker', 'paper', 'pencil', 'recess', 'report', 'ruler', 'school', 'study'
        ]
    },
    {
        category: 'Language Arts',
        words: [
            'author', 'poetry', 'prefix', 'read', 'reader', 'stanza', 'story', 'vowel', 'word'
        ]
    },
    {
        category: 'Math',
        words: [
            'angle', 'count', 'graph', 'minus', 'number', 'shape'
        ]
    },
    {
        category: 'Geography',
        words: [
            'border', 'delta', 'globe', 'harbor', 'island', 'region', 'tundra'
        ]
    },
    {
        category: 'History',
        words: [
            'colony', 'empire', 'museum', 'relic'
        ]
    },
    {
        category: 'Transportation',
        words: [
            'bike', 'boat', 'ferry', 'plane', 'ship', 'subway', 'taxi', 'train', 'truck', 'wagon'
        ]
    },
    {
        category: 'Community Helpers',
        words: [
            'baker', 'chef', 'coach', 'doctor', 'farmer', 'guide', 'judge', 'nurse', 'pilot', 'tailor', 'writer'
        ]
    },
    {
        category: 'Engineering',
        words: [
            'bolt', 'bridge', 'engine', 'hammer', 'motor', 'pulley', 'switch', 'wrench'
        ]
    },
    {
        category: 'Arts and Music',
        words: [
            'dance', 'drum', 'music', 'paint', 'ballet', 'canvas', 'chorus', 'guitar', 'melody', 'piano', 'rhythm', 'violin'
        ]
    },
    {
        category: 'Sports',
        words: [
            'ball', 'game', 'helmet', 'hiking', 'hockey', 'kick', 'race', 'soccer', 'swing', 'trophy'
        ]
    },
    {
        category: 'Home Objects',
        words: [
            'book', 'bowl', 'basket', 'chair', 'carpet', 'clock', 'door', 'house', 'mirror', 'pillow', 'plate', 'spoon', 'table', 'window'
        ]
    },
    {
        category: 'Plants and Garden',
        words: [
            'branch', 'cedar', 'clover', 'daisy', 'garden', 'maple', 'moss', 'petal', 'plant', 'rose', 'seed', 'tulip', 'vine', 'willow'
        ]
    },
    {
        category: 'Farm Life',
        words: [
            'barn', 'farm', 'field', 'goat', 'horse', 'wheat'
        ]
    },
    {
        category: 'Character Traits',
        words: [
            'brave', 'calm', 'caring', 'clever', 'honest', 'loyal'
        ]
    },
    {
        category: 'Technology',
        words: [
            'laptop', 'screen', 'signal', 'tablet'
        ]
    }
];

const WORD_LIBRARY_HARD_READER_SECTIONS = [
    {
        category: 'Math',
        words: [
            'axis', 'proof', 'factor', 'matrix', 'radius', 'vector', 'volume'
        ]
    },
    {
        category: 'Science',
        words: [
            'mass', 'method', 'sample', 'theory', 'enzyme', 'fusion', 'neuron'
        ]
    },
    {
        category: 'Language Arts',
        words: [
            'cause', 'clause', 'genre', 'irony', 'motif', 'prose', 'style', 'thesis', 'tone', 'voice'
        ]
    },
    {
        category: 'Coding and Logic',
        words: [
            'code', 'data', 'logic', 'scope', 'debug', 'input', 'binary', 'branch', 'memory', 'module', 'output', 'script', 'syntax'
        ]
    },
    {
        category: 'Technology',
        words: [
            'driver', 'packet', 'sensor', 'server', 'system', 'upload'
        ]
    },
    {
        category: 'Physics and Motion',
        words: [
            'force', 'impact', 'motion', 'phase', 'strain', 'torque'
        ]
    },
    {
        category: 'Government',
        words: [
            'bias', 'ballot', 'policy', 'public', 'rights', 'senate'
        ]
    },
    {
        category: 'History',
        words: [
            'colony', 'empire', 'period', 'reform', 'relic', 'treaty'
        ]
    },
    {
        category: 'Geography',
        words: [
            'border', 'delta', 'globe', 'harbor', 'region', 'tundra'
        ]
    },
    {
        category: 'Business and Money',
        words: [
            'asset', 'budget', 'income', 'market', 'price', 'profit', 'trend', 'value'
        ]
    },
    {
        category: 'Materials and Chemistry',
        words: [
            'alloy', 'cobalt', 'copper', 'helium', 'iodine', 'nickel'
        ]
    },
    {
        category: 'Engineering',
        words: [
            'bridge', 'design', 'device', 'engine', 'switch', 'wrench'
        ]
    },
    {
        category: 'Music Performance',
        words: [
            'chord', 'octave', 'pitch', 'scale', 'tempo'
        ]
    },
    {
        category: 'Space',
        words: [
            'crater', 'galaxy', 'meteor', 'orbit', 'quasar', 'rocket'
        ]
    },
    {
        category: 'Architecture',
        words: [
            'draft', 'form', 'model', 'sketch'
        ]
    }
];

const WORD_LIBRARY_EXTREME_READER_SECTIONS = [
    {
        category: 'Government',
        words: [
            'ethic', 'moral', 'policy', 'debate', 'equity', 'justice', 'liberty'
        ]
    },
    {
        category: 'Language Arts',
        words: [
            'valid', 'aspect', 'concept', 'analyze', 'complex', 'context', 'abstract', 'language', 'critical', 'rhetoric'
        ]
    },
    {
        category: 'Science',
        words: [
            'phase', 'theory', 'impact', 'science', 'research', 'dynamic', 'process', 'pattern'
        ]
    },
    {
        category: 'Physics and Motion',
        words: [
            'phase', 'impact', 'energy', 'kinetic', 'momentum'
        ]
    },
    {
        category: 'Business and Money',
        words: [
            'trend', 'strategy', 'outcome', 'insight', 'forecast', 'pattern'
        ]
    }
];

const WORD_LIBRARY_CLUE_GUIDES = {
    'Animals': {
        easy: 'It is a living thing.',
        default: 'This word is about a living creature.'
    },
    'Ocean Life': {
        easy: 'It lives in water.',
        default: 'This word is about life in water.'
    },
    'Birds': {
        easy: 'It has feathers and wings.',
        default: 'This word is about a feathered animal.'
    },
    'Colors': {
        easy: 'You may see this in crayons or paint.',
        default: 'This word is used for paint, clothes, or art.'
    },
    'Food': {
        easy: 'You can eat or drink it.',
        default: 'This word names food or a drink.'
    },
    'Fruits and Vegetables': {
        easy: 'It is a fruit or vegetable.',
        default: 'This word names a fruit or vegetable.'
    },
    'Nature': {
        easy: 'You can see it outside.',
        default: 'This word names something in nature.'
    },
    'Weather': {
        easy: 'It is part of the weather.',
        default: 'This word is about the weather.'
    },
    'Space': 'This word is about space.',
    'Science': 'This word fits with experiments or how the world works.',
    'Human Body': {
        easy: 'It is part of your body.',
        default: 'This word names part of the human body.'
    },
    'Health': 'This word is about staying healthy.',
    'School': 'You may see this when people learn.',
    'Language Arts': 'This word fits with books, reading, or writing.',
    'Math': 'This is a math word.',
    'Geography': 'This is a place or map word.',
    'History': 'This word is about the past.',
    'Government': 'This word is about rules or leaders.',
    'Technology': 'This is a computer or device word.',
    'Engineering': 'This is a building or machine word.',
    'Arts and Music': {
        easy: 'This word fits with drawing, songs, or instruments.',
        default: 'This word fits with drawing, songs, or instruments.'
    },
    'Sports': {
        easy: 'This word fits with games, teams, or exercise.',
        default: 'This word fits with games, teams, or exercise.'
    },
    'Home Objects': {
        easy: 'You can find this at home.',
        default: 'This word names something used at home.'
    },
    'Plants and Garden': {
        easy: 'It grows outside or in a garden.',
        default: 'It grows outside or in a garden.'
    },
    'Character Traits': 'This tells how a person acts or feels.',
    'Insects and Bugs': 'It is a bug or insect.',
    'Reptiles and Amphibians': 'It is a reptile or amphibian.',
    'Transportation': {
        easy: 'It helps people go from place to place.',
        default: 'It helps people go from place to place.'
    },
    'Community Helpers': 'This is a job that helps people.',
    'Materials and Chemistry': 'This is a material or science word.',
    'Physics and Motion': 'This word is about movement or energy.',
    'Coding and Logic': 'This word is about coding or logic.',
    'Ancient World': 'This word is about long ago.',
    'Environment': 'This word is about Earth or nature.',
    'Architecture': 'This is a building word.',
    'Business and Money': 'This word fits with buying, selling, or saving.',
    'Kitchen and Cooking': 'You use this in cooking.',
    'Music Performance': 'This word fits with songs or instruments.',
    'Travel and Places': 'This word fits with trips or different places.',
    'Celebrations': 'You may see this at a party or special day.',
    'Farm Life': {
        easy: 'You may find this where animals and crops live.',
        default: 'You may find this where animals and crops live.'
    }
};

const WORD_LIBRARY_PRECISE_CLUE_OVERRIDES = {
    ANT: 'It is a tiny bug that crawls on the ground.',
    ARM: 'It helps you lift and carry things.',
    ART: 'You make it by drawing, painting, or creating.',
    BAT: 'You swing it to hit a ball.',
    BED: 'You sleep on it.',
    BEE: 'It is a buzzing insect that can make honey.',
    BOX: 'You can put things inside it.',
    BUD: 'It is a flower that has not opened yet.',
    BUN: 'It is a small piece of bread.',
    BUS: 'It carries many people on the road.',
    CAR: 'People ride in it on the road.',
    CAT: 'It is a pet that meows.',
    COD: 'It is a fish that lives in the sea.',
    COW: 'It is a farm animal that gives milk.',
    CUP: 'You drink from it.',
    DEW: 'It is water you may see on grass in the morning.',
    DOG: 'It is a pet that barks.',
    EAR: 'It helps you hear.',
    EEL: 'It is a long fish that lives in water.',
    EGG: 'You may eat it for breakfast.',
    ELM: 'It is a kind of tree.',
    EMU: 'It is a large bird that cannot fly well.',
    EYE: 'It helps you see.',
    FIG: 'It is a small fruit.',
    FIR: 'It is a tree with needles.',
    FOG: 'It is a thick cloud close to the ground.',
    FOX: 'It is a wild animal with a bushy tail.',
    HAM: 'It is a kind of meat.',
    HAT: 'You wear it on your head.',
    HEN: 'It is a farm bird that lays eggs.',
    HIP: 'It is where your leg meets your body.',
    HUM: 'You do this when you sing softly with your mouth closed.',
    ICE: 'It is frozen water.',
    IVY: 'It is a plant that can climb walls or trees.',
    JAM: 'It is a sweet fruit spread.',
    JAR: 'You can store food or small things in it.',
    JAW: 'It helps you bite and chew.',
    JAY: 'It is a bird with feathers and wings.',
    KEY: 'You use it to open a lock.',
    KOI: 'It is a fish often seen in a pond.',
    LEG: 'It helps you stand and walk.',
    LIP: 'It is on your mouth.',
    LOG: 'It is a thick piece of a tree trunk.',
    MUD: 'It is wet dirt.',
    OAK: 'It is a strong kind of tree.',
    OWL: 'It is a bird that is often awake at night.',
    PAN: 'You cook food in it.',
    PEA: 'It is a small green vegetable.',
    PIE: 'It is a baked dessert with crust.',
    PIG: 'It is a farm animal that likes mud.',
    POT: 'You can cook food in it.',
    RAM: 'It is a sheep with horns.',
    RAY: 'It is a flat sea animal that swims in water.',
    RED: 'It is a color you may see on a stop sign.',
    RUG: 'You put it on the floor.',
    RUN: 'You do this when you move fast on your feet.',
    SEA: 'It is a large body of salt water.',
    SKY: 'It is high above you outside.',
    SKI: 'You use it to glide on snow.',
    SUN: 'It shines in the sky during the day.',
    TAN: 'It is a light brown color.',
    TAP: 'You do this when you touch lightly or make a quick beat.',
    TEA: 'It is a drink made with leaves in hot water.',
    TOE: 'It is at the end of your foot.',
    VAN: 'It is a road vehicle that can carry people or boxes.',
    YAK: 'It is a large animal with long hair.',
    YAM: 'It is a root vegetable you can cook and eat.',
    ANIMAL: 'It is a living thing that can move and breathe.',
    APPLE: 'It is a fruit that grows on a tree.',
    BALL: 'You throw, catch, or kick it in games.',
    BEDROOM: 'It is a room where people sleep.',
    BIRD: 'It is an animal with feathers and wings.',
    BLUE: 'It is the color of a clear sky.',
    BOOK: 'You read it.',
    BRAIN: 'It helps you think.',
    CAMEL: 'It is a large animal that can travel in the desert.',
    CARROT: 'It is a vegetable that grows in the ground.',
    CLOUD: 'It floats in the sky.',
    DRUM: 'You hit it to make music.',
    EAGLE: 'It is a large bird that can fly high.',
    FISH: 'It lives and swims in water.',
    FLOWER: 'It grows on a plant and can bloom.',
    GIRAFFE: 'It is a very tall animal with a long neck.',
    GOLD: 'It is a shiny yellow color.',
    GREEN: 'It is the color of grass and leaves.',
    GUITAR: 'You play it by strumming the strings.',
    HELMET: 'You wear it to protect your head.',
    JUICE: 'It is a drink made from fruit.',
    KOALA: 'It is an animal that lives in trees.',
    MILK: 'It is a drink that often goes in cereal.',
    MONKEY: 'It is an animal that can climb and swing.',
    MUSIC: 'You hear it in songs and rhythms.',
    ORANGE: 'It is a fruit with a peel you can remove.',
    PANDA: 'It is a black and white bear.',
    PENCIL: 'You write with it.',
    PIANO: 'You play it by pressing keys.',
    PINK: 'It is a light red color.',
    PLANE: 'It flies in the sky.',
    PLANT: 'It grows from the ground or in a pot.',
    RABBIT: 'It is an animal with long ears that can hop.',
    REDWOOD: 'It is a very tall tree.',
    ROCK: 'It is a hard piece of stone.',
    SCHOOL: 'People go there to learn.',
    SHARK: 'It is a large fish with sharp teeth.',
    SHIP: 'It travels on water.',
    TABLE: 'You put things on it.',
    TEACHER: 'This person helps students learn.',
    TRAIN: 'It rides on tracks.',
    TREE: 'It is a tall plant with a trunk.',
    WATER: 'You drink it.',
    WHALE: 'It is a very large animal that lives in the ocean.',
    WHITE: 'It is the color of snow or milk.',
    WORD: 'You can read it, write it, or say it.',
    ZEBRA: 'It is an animal with black and white stripes.'
};

const WORD_LIBRARY_FACE_PARTS = new Set(['EAR', 'EYE', 'JAW', 'LIP', 'CHEEK', 'EYEBROW', 'EYELID']);
const WORD_LIBRARY_ARM_AND_HAND_PARTS = new Set(['ARM', 'ELBOW', 'FINGER', 'FOREARM', 'WRIST', 'KNUCKLE', 'SHOULDER']);
const WORD_LIBRARY_LEG_AND_FOOT_PARTS = new Set(['HIP', 'LEG', 'ANKLE', 'TOE']);
const WORD_LIBRARY_FARM_ANIMALS = new Set(['COW', 'HEN', 'PIG', 'RAM', 'YAK', 'LAMB', 'GOAT', 'HORSE', 'DONKEY', 'CATTLE']);
const WORD_LIBRARY_PET_OR_SMALL_ANIMALS = new Set(['CAT', 'DOG', 'HAMSTER', 'RABBIT', 'FERRET']);
const WORD_LIBRARY_WILD_CATS = new Set(['COUGAR', 'JAGUAR', 'LEOPARD']);
const WORD_LIBRARY_WATER_VEHICLES = new Set(['BOAT', 'CANOE', 'FERRY', 'SHIP', 'YACHT', 'KAYAK', 'GONDOLA']);
const WORD_LIBRARY_AIR_VEHICLES = new Set(['PLANE', 'AIRPLANE', 'GLIDER', 'HELICOPTER', 'ROCKET', 'ZEPPELIN']);
const WORD_LIBRARY_ROAD_VEHICLES = new Set(['BUS', 'CAR', 'VAN', 'TRUCK', 'TAXI', 'BIKE', 'BICYCLE', 'MINIVAN', 'MOTORCYCLE', 'PICKUP', 'SCOOTER']);
const WORD_LIBRARY_RAIL_VEHICLES = new Set(['TRAIN', 'LOCOMOTIVE', 'CABOOSE', 'RAILWAY', 'TRAMWAY', 'SUBWAY']);
const WORD_LIBRARY_TREES = new Set(['ELM', 'FIR', 'OAK', 'MAPLE', 'CEDAR', 'WILLOW', 'BAMBOO', 'SAPLING']);
const WORD_LIBRARY_FLOWERS = new Set(['FLOWER', 'DAISY', 'TULIP', 'ROSE', 'BLOSSOM', 'WILDFLOWER', 'SUNFLOWER', 'LAVENDER']);
const WORD_LIBRARY_PLANT_PARTS = new Set(['BUD', 'SEED', 'PETAL', 'PINECONE', 'ACORN', 'BRANCH', 'MOSS', 'VINE', 'LEAF']);
const WORD_LIBRARY_FRUITS = new Set(['APPLE', 'APRICOT', 'BANANA', 'BERRY', 'CHERRY', 'COCONUT', 'FIG', 'GRAPE', 'GRAPES', 'LEMON', 'MANGO', 'MELON', 'ORANGE', 'PAPAYA', 'PEACH', 'PEAR', 'PLUM']);
const WORD_LIBRARY_VEGETABLES = new Set(['PEA', 'YAM', 'CARROT', 'CELERY', 'CABBAGE', 'LETTUCE', 'ONION', 'PEPPER', 'PUMPKIN', 'SPINACH', 'BROCCOLI', 'CUCUMBER', 'CAULIFLOWER']);
const WORD_LIBRARY_DRINKS = new Set(['TEA', 'MILK', 'JUICE']);
const WORD_LIBRARY_SWEETS = new Set(['PIE', 'COOKIE', 'BROWNIE', 'MUFFIN', 'PUDDING', 'CUPCAKE', 'WAFFLE']);
const WORD_LIBRARY_BREADS = new Set(['BUN', 'BREAD', 'TOAST', 'BAGEL', 'BISCUIT', 'CRACKER', 'PRETZEL', 'PANCAKE']);
const WORD_LIBRARY_WRITING_TOOLS = new Set(['PENCIL', 'MARKER', 'CHALK']);
const WORD_LIBRARY_READING_PARTS = new Set(['CHAPTER', 'PARAGRAPH', 'STANZA', 'HEADLINE', 'SENTENCE', 'STORY', 'REPORT']);
const WORD_LIBRARY_MATH_SHAPES = new Set(['ANGLE', 'SHAPE', 'TRIANGLE', 'POLYGON', 'RADIUS', 'DIAMETER', 'AXIS', 'VECTOR']);
const WORD_LIBRARY_MATH_NUMBER_IDEAS = new Set(['NUMBER', 'COUNT', 'INTEGER', 'DECIMAL', 'FRACTION', 'NUMERATOR', 'QUOTIENT', 'PRODUCT', 'PATTERN', 'SEQUENCE', 'GRAPH']);
const WORD_LIBRARY_SPORTS_ACTIONS = new Set(['RUN', 'KICK', 'RACE', 'DRIBBLE', 'CLIMBING', 'HIKING', 'FISHING', 'SKATING', 'CYCLING']);
const WORD_LIBRARY_SPORTS_ITEMS = new Set(['BALL', 'BAT', 'HELMET', 'TROPHY']);
const WORD_LIBRARY_INSTRUMENTS = new Set(['DRUM', 'GUITAR', 'PIANO', 'VIOLIN', 'BANJO', 'TRUMPET', 'CLARINET', 'SAXOPHONE', 'UKULELE', 'XYLOPHONE', 'HARMONICA']);

function resolveWordLibraryGroupedClue(word, category) {
    switch (category) {
    case 'Animals':
        if (WORD_LIBRARY_FARM_ANIMALS.has(word)) return 'It is a farm animal.';
        if (WORD_LIBRARY_PET_OR_SMALL_ANIMALS.has(word)) return 'It is an animal people may keep at home.';
        if (WORD_LIBRARY_WILD_CATS.has(word)) return 'It is a wild cat.';
        return 'It is an animal.';
    case 'Ocean Life':
        return 'It lives in water.';
    case 'Birds':
        return 'It is a bird.';
    case 'Colors':
        return 'It is a color.';
    case 'Food':
        if (WORD_LIBRARY_DRINKS.has(word)) return 'It is something you can drink.';
        if (WORD_LIBRARY_SWEETS.has(word)) return 'It is a sweet food.';
        if (WORD_LIBRARY_BREADS.has(word)) return 'It is a baked food made with dough or batter.';
        return 'It is something you can eat.';
    case 'Fruits and Vegetables':
        if (WORD_LIBRARY_FRUITS.has(word)) return 'It is a fruit.';
        if (WORD_LIBRARY_VEGETABLES.has(word)) return 'It is a vegetable.';
        return 'It is a fruit or vegetable.';
    case 'Nature':
        if (WORD_LIBRARY_TREES.has(word)) return 'It is part of nature and grows outside.';
        if (word === 'ROCK' || word === 'STONE' || word === 'BOULDER') return 'It is hard and comes from the ground.';
        if (word === 'RAIN' || word === 'CLOUD' || word === 'SUN' || word === 'MOON') return 'You can see it in the sky.';
        if (word === 'RIVER' || word === 'STREAM' || word === 'LAGOON' || word === 'OASIS' || word === 'WATER') return 'It is water you see outdoors.';
        return 'You can see it outside.';
    case 'Weather':
        return 'It is part of the weather.';
    case 'Human Body':
        if (WORD_LIBRARY_FACE_PARTS.has(word)) return 'It is on the face.';
        if (WORD_LIBRARY_ARM_AND_HAND_PARTS.has(word)) return 'It is on the arm or hand.';
        if (WORD_LIBRARY_LEG_AND_FOOT_PARTS.has(word)) return 'It is on the leg or foot.';
        if (word === 'BRAIN') return 'It helps you think.';
        if (word === 'LUNGS') return 'It helps the body breathe.';
        if (word === 'STOMACH') return 'It helps the body digest food.';
        return 'It is part of the body.';
    case 'School':
        if (WORD_LIBRARY_WRITING_TOOLS.has(word)) return 'You use it to write or draw.';
        if (word === 'ERASER') return 'You use it to rub out pencil marks.';
        if (word === 'RULER') return 'You use it to measure or draw a straight line.';
        if (word === 'DESK') return 'You sit or work at it in class.';
        if (word === 'RECESS') return 'It is time to play during the school day.';
        return 'You may see it at school.';
    case 'Language Arts':
        if (WORD_LIBRARY_READING_PARTS.has(word)) return 'It is part of something you read or write.';
        if (word === 'READ') return 'You do this with a book or story.';
        if (word === 'AUTHOR' || word === 'EDITOR' || word === 'READER' || word === 'WRITER') return 'It is a person connected to books or writing.';
        return 'It fits with reading or writing.';
    case 'Math':
        if (WORD_LIBRARY_MATH_SHAPES.has(word)) return 'It is a shape or part of a shape.';
        if (WORD_LIBRARY_MATH_NUMBER_IDEAS.has(word)) return 'It helps show numbers or counting.';
        return 'It is used in math.';
    case 'Arts and Music':
    case 'Music Performance':
        if (WORD_LIBRARY_INSTRUMENTS.has(word)) return 'You play it to make music.';
        if (word === 'DANCE' || word === 'BALLET') return 'It is a kind of movement to music.';
        if (word === 'PAINT' || word === 'CANVAS' || word === 'DRAWING' || word === 'PAINTING') return 'You use it to make art.';
        return 'It fits with art or music.';
    case 'Sports':
        if (WORD_LIBRARY_SPORTS_ITEMS.has(word)) return 'You use it in a game or sport.';
        if (WORD_LIBRARY_SPORTS_ACTIONS.has(word)) return 'It is something you do in sports or play.';
        return 'It fits with sports or play.';
    case 'Home Objects':
        if (word === 'BED' || word === 'PILLOW' || word === 'BLANKET') return 'You use it when you rest or sleep.';
        if (word === 'CLOCK' || word === 'ALARMCLOCK') return 'It helps you know the time.';
        if (word === 'BOOK' || word === 'PICTURE' || word === 'MIRROR') return 'You keep or use it in a room at home.';
        if (word === 'DOOR' || word === 'WINDOW' || word === 'DOORKNOB') return 'It is part of a room or house.';
        if (word === 'CHAIR' || word === 'TABLE' || word === 'CABINET' || word === 'BOOKSHELF' || word === 'WARDROBE') return 'It is furniture you use at home.';
        return 'You can find it at home.';
    case 'Plants and Garden':
        if (WORD_LIBRARY_TREES.has(word)) return 'It is a kind of tree.';
        if (WORD_LIBRARY_FLOWERS.has(word)) return 'It is a flower or blooming plant.';
        if (WORD_LIBRARY_PLANT_PARTS.has(word)) return 'It is part of a plant.';
        if (word === 'GARDEN' || word === 'ORCHARD' || word === 'GREENHOUSE') return 'It is a place where plants grow.';
        return 'It grows outside or in a garden.';
    case 'Transportation':
        if (WORD_LIBRARY_AIR_VEHICLES.has(word)) return 'It helps people travel through the air.';
        if (WORD_LIBRARY_WATER_VEHICLES.has(word)) return 'It helps people travel on water.';
        if (WORD_LIBRARY_RAIL_VEHICLES.has(word)) return 'It helps people travel on tracks.';
        if (WORD_LIBRARY_ROAD_VEHICLES.has(word)) return 'It helps people travel on roads.';
        return 'It helps people travel.';
    case 'Community Helpers':
        return 'It is a job that helps people.';
    case 'Kitchen and Cooking':
        return 'You use it in cooking.';
    default:
        return null;
    }
}

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
            'Colors',
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
const WORD_LIBRARY_DIFFICULTY_GRADE_BANDS = {
    easy: 'Pre-K to 1st grade',
    medium: '2nd to 6th grade',
    hard: '6th to 10th grade',
    extreme: '11th grade and beyond'
};
const WORD_LIBRARY_CATEGORY_GROUPS = {
    earlyConcrete: new Set([
        'Animals',
        'Ocean Life',
        'Birds',
        'Colors',
        'Food',
        'Fruits and Vegetables',
        'Home Objects',
        'Plants and Garden',
        'Farm Life'
    ]),
    foundational: new Set([
        'Nature',
        'Weather',
        'Health',
        'School',
        'Sports',
        'Celebrations',
        'Transportation',
        'Community Helpers',
        'Character Traits',
        'Kitchen and Cooking'
    ]),
    coreAcademic: new Set([
        'Space',
        'Science',
        'Human Body',
        'Language Arts',
        'Math',
        'Geography',
        'History',
        'Arts and Music',
        'Travel and Places',
        'Architecture',
        'Environment',
        'Reptiles and Amphibians'
    ]),
    specializedAdvanced: new Set([
        'Materials and Chemistry',
        'Physics and Motion',
        'Coding and Logic'
    ]),
    appliedHard: new Set([
        'Government',
        'Technology',
        'Engineering',
        'Music Performance',
        'Business and Money',
        'Ancient World'
    ]),
    foundationalEasyCategories: new Set([
        'School',
        'Celebrations',
        'Transportation'
    ])
};

function normalizeWordLibraryWord(rawWord) {
    if (typeof rawWord !== 'string') return '';
    return rawWord.trim().replace(/[^a-z]/gi, '').toUpperCase();
}

const WORD_LIBRARY_EASY_SAFE_WORDS = (() => {
    const safeWords = new Set();

    WORD_LIBRARY_EARLY_READER_SECTIONS.forEach((section) => {
        section.words.forEach((word) => {
            const normalizedWord = normalizeWordLibraryWord(word);
            if (normalizedWord) {
                safeWords.add(normalizedWord);
            }
        });
    });

    return safeWords;
})();

const WORD_LIBRARY_MEDIUM_SAFE_WORDS = (() => {
    const safeWords = new Set();

    WORD_LIBRARY_MIDDLE_READER_SECTIONS.forEach((section) => {
        section.words.forEach((word) => {
            const normalizedWord = normalizeWordLibraryWord(word);
            if (normalizedWord) {
                safeWords.add(normalizedWord);
            }
        });
    });

    return safeWords;
})();

const WORD_LIBRARY_HARD_SAFE_WORDS = (() => {
    const safeWords = new Set();

    WORD_LIBRARY_HARD_READER_SECTIONS.forEach((section) => {
        section.words.forEach((word) => {
            const normalizedWord = normalizeWordLibraryWord(word);
            if (normalizedWord) {
                safeWords.add(normalizedWord);
            }
        });
    });

    return safeWords;
})();

const WORD_LIBRARY_EXTREME_SAFE_WORDS = (() => {
    const safeWords = new Set();

    WORD_LIBRARY_EXTREME_READER_SECTIONS.forEach((section) => {
        section.words.forEach((word) => {
            const normalizedWord = normalizeWordLibraryWord(word);
            if (normalizedWord) {
                safeWords.add(normalizedWord);
            }
        });
    });

    return safeWords;
})();

const WORD_LIBRARY_EASY_SAFE_CATEGORIES = new Set(
    WORD_LIBRARY_EARLY_READER_SECTIONS.map((section) => section.category)
);

const WORD_LIBRARY_MEDIUM_SAFE_CATEGORIES = new Set(
    WORD_LIBRARY_MIDDLE_READER_SECTIONS.map((section) => section.category)
);

const WORD_LIBRARY_HARD_SAFE_CATEGORIES = new Set(
    WORD_LIBRARY_HARD_READER_SECTIONS.map((section) => section.category)
);

const WORD_LIBRARY_EXTREME_SAFE_CATEGORIES = new Set(
    WORD_LIBRARY_EXTREME_READER_SECTIONS.map((section) => section.category)
);

function isWordLibraryEasySafe(word, category) {
    const normalizedWord = normalizeWordLibraryWord(word);
    return WORD_LIBRARY_EASY_SAFE_CATEGORIES.has(category)
        && WORD_LIBRARY_EASY_SAFE_WORDS.has(normalizedWord)
        && normalizedWord.length === 3;
}

function isWordLibraryMediumSafe(word, category) {
    const normalizedWord = normalizeWordLibraryWord(word);
    return !isWordLibraryEasySafe(normalizedWord, category)
        && WORD_LIBRARY_MEDIUM_SAFE_CATEGORIES.has(category)
        && WORD_LIBRARY_MEDIUM_SAFE_WORDS.has(normalizedWord)
        && normalizedWord.length >= 4
        && normalizedWord.length <= 6;
}

function isWordLibraryHardSafe(word, category) {
    const normalizedWord = normalizeWordLibraryWord(word);
    return !isWordLibraryEasySafe(normalizedWord, category)
        && !isWordLibraryMediumSafe(normalizedWord, category)
        && !isWordLibraryExtremeSafe(normalizedWord, category)
        && WORD_LIBRARY_HARD_SAFE_CATEGORIES.has(category)
        && WORD_LIBRARY_HARD_SAFE_WORDS.has(normalizedWord)
        && normalizedWord.length >= 4
        && normalizedWord.length <= 6;
}

function isWordLibraryExtremeSafe(word, category) {
    const normalizedWord = normalizeWordLibraryWord(word);
    return !isWordLibraryEasySafe(normalizedWord, category)
        && !isWordLibraryMediumSafe(normalizedWord, category)
        && WORD_LIBRARY_EXTREME_SAFE_CATEGORIES.has(category)
        && WORD_LIBRARY_EXTREME_SAFE_WORDS.has(normalizedWord)
        && normalizedWord.length >= 5
        && normalizedWord.length <= 8;
}

function countWordLibraryVowelGroups(word) {
    const matches = word.match(/[AEIOUY]+/g);
    return matches ? matches.length : 0;
}

function countWordLibraryAdvancedPatterns(word) {
    const patterns = [
        /TION/,
        /SION/,
        /MENT/,
        /NESS/,
        /TURE/,
        /PH/,
        /ENCE/,
        /ANCE/,
        /LOGY/,
        /GRAPH/,
        /SCOP/,
        /CRYPT/
    ];

    return patterns.reduce((count, pattern) => count + (pattern.test(word) ? 1 : 0), 0);
}

function getWordLibraryDifficultyGroup(category) {
    if (WORD_LIBRARY_CATEGORY_GROUPS.earlyConcrete.has(category)) return 'earlyConcrete';
    if (WORD_LIBRARY_CATEGORY_GROUPS.foundational.has(category)) return 'foundational';
    if (WORD_LIBRARY_CATEGORY_GROUPS.coreAcademic.has(category)) return 'coreAcademic';
    if (WORD_LIBRARY_CATEGORY_GROUPS.specializedAdvanced.has(category)) return 'specializedAdvanced';
    if (WORD_LIBRARY_CATEGORY_GROUPS.appliedHard.has(category)) return 'appliedHard';
    return 'coreAcademic';
}

function calculateWordLibraryComplexityScore(word) {
    const rareLetters = (word.match(/[JKQVXZ]/g) || []).length;
    const vowelGroups = countWordLibraryVowelGroups(word);
    const advancedPatterns = countWordLibraryAdvancedPatterns(word);
    const consonantClusters = (word.match(/[BCDFGHJKLMNPQRSTVWXYZ]{3,}/g) || []).length;

    return word.length
        + (rareLetters * 1.25)
        + (Math.max(0, vowelGroups - 2) * 0.6)
        + (advancedPatterns * 1.4)
        + (consonantClusters * 0.5);
}

function classifyWordLibraryDifficulty(word, category) {
    const complexityScore = calculateWordLibraryComplexityScore(word);
    const difficultyGroup = getWordLibraryDifficultyGroup(category);

    if (isWordLibraryEasySafe(word, category)) {
        return 'easy';
    }

    if (isWordLibraryMediumSafe(word, category)) {
        return 'medium';
    }

    if (isWordLibraryExtremeSafe(word, category)) {
        return 'extreme';
    }

    if (isWordLibraryHardSafe(word, category)) {
        return 'hard';
    }

    if (difficultyGroup === 'earlyConcrete') {
        if (complexityScore <= 7.9) return 'medium';
        return 'hard';
    }

    if (difficultyGroup === 'foundational') {
        if (complexityScore <= 6.8) return 'medium';
        return 'hard';
    }

    if (difficultyGroup === 'coreAcademic') {
        if (complexityScore <= 7.2) return 'medium';
        return 'hard';
    }

    if (difficultyGroup === 'specializedAdvanced') {
        if (complexityScore <= 10.8) return 'hard';
        return 'extreme';
    }

    return 'hard';
}

function buildWordLibraryClue(word, category, templateIndex, difficulty) {
    const normalizedWord = normalizeWordLibraryWord(word);
    const preciseClue = WORD_LIBRARY_PRECISE_CLUE_OVERRIDES[normalizedWord];
    if (preciseClue) {
        return preciseClue;
    }

    const groupedClue = resolveWordLibraryGroupedClue(normalizedWord, category, difficulty);
    if (groupedClue) {
        return groupedClue;
    }

    const clueGuide = WORD_LIBRARY_CLUE_GUIDES[category];
    if (!clueGuide) {
        return `This word fits with ${category.toLowerCase()}.`;
    }

    if (typeof clueGuide === 'string') {
        return clueGuide;
    }

    return clueGuide[difficulty] || clueGuide.default || `This word fits with ${category.toLowerCase()}.`;
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

    [...WORD_LIBRARY_SECTIONS, ...WORD_LIBRARY_EXPANSION_SECTIONS, ...WORD_LIBRARY_EARLY_READER_SECTIONS, ...WORD_LIBRARY_MIDDLE_READER_SECTIONS, ...WORD_LIBRARY_HARD_READER_SECTIONS, ...WORD_LIBRARY_EXTREME_READER_SECTIONS].forEach((section) => {
        section.words.forEach((rawWord, index) => {
            const normalizedWord = normalizeWordLibraryWord(rawWord);
            const minimumWordLength = isWordLibraryEasySafe(normalizedWord, section.category) ? 3 : 4;
            if (!normalizedWord || normalizedWord.length < minimumWordLength) return;
            if (seenWords.has(normalizedWord)) return;

            seenWords.add(normalizedWord);
            const complexityScore = calculateWordLibraryComplexityScore(normalizedWord);
            const difficulty = classifyWordLibraryDifficulty(normalizedWord, section.category);
            const isEarlyReaderSafe = isWordLibraryEasySafe(normalizedWord, section.category);
            const isMediumReaderSafe = isWordLibraryMediumSafe(normalizedWord, section.category);
            const isHardReaderSafe = isWordLibraryHardSafe(normalizedWord, section.category);
            const isExtremeReaderSafe = isWordLibraryExtremeSafe(normalizedWord, section.category);
            records.push({
                id: `word-puzzle-${runningId + 1}`,
                word: normalizedWord,
                category: section.category,
                tracks: resolveTrackIdsForCategory(section.category),
                difficulty,
                isEarlyReaderSafe,
                isMediumReaderSafe,
                isHardReaderSafe,
                isExtremeReaderSafe,
                complexityScore,
                gradeBandLabel: WORD_LIBRARY_DIFFICULTY_GRADE_BANDS[difficulty] || null,
                clue: buildWordLibraryClue(normalizedWord, section.category, index, difficulty),
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
