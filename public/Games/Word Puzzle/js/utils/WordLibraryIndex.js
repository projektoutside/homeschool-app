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
            'ant', 'bee', 'cat', 'dog', 'fox', 'frog', 'goat', 'hen', 'lamb', 'pig'
        ]
    },
    {
        category: 'Ocean Life',
        words: [
            'clam', 'crab', 'fish', 'seal', 'shark', 'shell', 'whale'
        ]
    },
    {
        category: 'Birds',
        words: [
            'bird', 'crow', 'dove', 'owl', 'robin', 'swan'
        ]
    },
    {
        category: 'Food',
        words: [
            'bean', 'bread', 'cake', 'corn', 'egg', 'juice', 'milk', 'pizza', 'rice', 'soup', 'toast'
        ]
    },
    {
        category: 'Fruits and Vegetables',
        words: [
            'apple', 'berry', 'grape', 'lemon', 'melon', 'peach', 'pear', 'plum'
        ]
    },
    {
        category: 'Nature',
        words: [
            'grass', 'leaf', 'light', 'moon', 'sky', 'sun', 'tree', 'water'
        ]
    },
    {
        category: 'Weather',
        words: [
            'fog', 'snow'
        ]
    },
    {
        category: 'School',
        words: [
            'book', 'chalk', 'class', 'desk', 'paper', 'pen', 'ruler'
        ]
    },
    {
        category: 'Language Arts',
        words: [
            'read', 'story', 'word'
        ]
    },
    {
        category: 'Math',
        words: [
            'add', 'count', 'shape'
        ]
    },
    {
        category: 'Home Objects',
        words: [
            'bed', 'bowl', 'chair', 'clock', 'cup', 'door', 'floor', 'hat', 'house', 'lamp', 'plate', 'spoon', 'table'
        ]
    },
    {
        category: 'Plants and Garden',
        words: [
            'daisy', 'green', 'moss', 'rose', 'seed', 'tulip', 'vine'
        ]
    },
    {
        category: 'Transportation',
        words: [
            'bike', 'boat', 'bus', 'car', 'plane', 'van', 'wagon'
        ]
    },
    {
        category: 'Sports',
        words: [
            'ball', 'game', 'kick', 'race', 'swing'
        ]
    },
    {
        category: 'Human Body',
        words: [
            'arm', 'chin', 'ear', 'face', 'foot', 'hand', 'knee', 'leg', 'mouth', 'nose', 'tooth'
        ]
    },
    {
        category: 'Health',
        words: [
            'brush', 'clean', 'rest', 'sleep', 'smile', 'soap'
        ]
    },
    {
        category: 'Arts and Music',
        words: [
            'dance', 'drum', 'music', 'paint', 'piano', 'song'
        ]
    }
];

const WORD_LIBRARY_MIDDLE_READER_SECTIONS = [
    {
        category: 'Animals',
        words: [
            'animal', 'beaver', 'camel', 'eagle', 'koala', 'llama', 'monkey', 'otter', 'panda', 'rabbit', 'zebra'
        ]
    },
    {
        category: 'Ocean Life',
        words: [
            'coral', 'salmon', 'shrimp', 'squid', 'trout', 'walrus'
        ]
    },
    {
        category: 'Birds',
        words: [
            'crane', 'falcon', 'heron', 'stork', 'toucan'
        ]
    },
    {
        category: 'Food',
        words: [
            'cereal', 'cheese', 'cookie', 'muffin', 'omelet', 'pickle', 'yogurt'
        ]
    },
    {
        category: 'Fruits and Vegetables',
        words: [
            'banana', 'carrot', 'celery', 'cherry', 'grapes', 'orange', 'pepper'
        ]
    },
    {
        category: 'Nature',
        words: [
            'cloud', 'flower', 'forest', 'meadow', 'rain', 'river', 'rock', 'stone', 'stream', 'valley'
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
        category: 'School',
        words: [
            'eraser', 'lesson', 'marker', 'pencil', 'recess', 'report', 'school'
        ]
    },
    {
        category: 'Language Arts',
        words: [
            'author', 'poetry', 'prefix', 'reader', 'stanza', 'vowel'
        ]
    },
    {
        category: 'Math',
        words: [
            'angle', 'graph', 'minus', 'number', 'shape'
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
            'ferry', 'ship', 'subway', 'taxi', 'train', 'truck'
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
            'ballet', 'canvas', 'chorus', 'guitar', 'melody', 'piano', 'rhythm', 'violin'
        ]
    },
    {
        category: 'Sports',
        words: [
            'helmet', 'hiking', 'hockey', 'soccer', 'trophy'
        ]
    },
    {
        category: 'Home Objects',
        words: [
            'basket', 'carpet', 'mirror', 'pillow', 'window'
        ]
    },
    {
        category: 'Plants and Garden',
        words: [
            'branch', 'cedar', 'clover', 'garden', 'maple', 'petal', 'plant', 'willow'
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
        && normalizedWord.length >= 3
        && normalizedWord.length <= 5;
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
