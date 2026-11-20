// Every playable word has an authored clue and an explicit difficulty.
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
const WORD_LIBRARY_LENGTH_LIMITS = {
    easy: [3, 3],
    medium: [3, 4],
    hard: [4, 6],
    extreme: [5, 10]
};
const WORD_LIBRARY_DIFFICULTY_GRADE_BANDS = {
    easy: 'Pre-K to 1st grade',
    medium: '2nd to 6th grade',
    hard: '6th to 10th grade',
    extreme: '11th grade and beyond'
};
const WORD_LIBRARY_BANKS = {
    easy: EASY_WORD_CLUES,
    medium: MEDIUM_WORD_CLUES,
    hard: HARD_WORD_CLUES,
    extreme: EXTREME_WORD_CLUES
};

// V3 stored position-based IDs. Keep this mapping for histories from that release.
const WORD_LIBRARY_LEGACY_WORDS = {
    2:'BEAVER', 5:'CAMEL', 15:'KOALA', 18:'LLAMA', 20:'MONKEY', 21:'OTTER', 22:'PANDA',
    23:'RABBIT', 25:'ZEBRA', 26:'CLAM', 27:'CORAL', 29:'EEL', 38:'SALMON', 40:'SEAL',
    42:'SHRIMP', 44:'SQUID', 47:'TROUT', 49:'WALRUS', 54:'CRANE', 55:'CROW', 56:'EAGLE',
    57:'FALCON', 62:'HERON', 65:'OWL', 73:'STORK', 74:'SWAN', 75:'TOUCAN', 80:'CEREAL',
    81:'CHEESE', 82:'COOKIE', 87:'MUFFIN', 89:'OMELET', 91:'PICKLE', 100:'YOGURT', 101:'APPLE',
    104:'BANANA', 107:'CARROT', 109:'CELERY', 110:'CHERRY', 114:'GRAPES', 118:'ORANGE', 120:'PEACH',
    121:'PEAR', 122:'PEPPER', 132:'FOREST', 137:'ISLAND', 139:'MEADOW', 146:'RIVER', 147:'STREAM',
    148:'VALLEY', 152:'BREEZE', 178:'COMET', 181:'CRATER', 183:'GALAXY', 187:'METEOR', 190:'ORBIT',
    191:'PLANET', 192:'QUASAR', 193:'ROCKET', 203:'CARBON', 212:'ENERGY', 213:'ENZYME', 217:'MAGNET',
    218:'MATTER', 222:'NEURON', 224:'OXYGEN', 226:'ANKLE', 228:'BRAIN', 231:'ELBOW', 234:'FINGER',
    238:'KIDNEY', 240:'LUNGS', 241:'MUSCLE', 248:'THROAT', 249:'TONGUE', 250:'WRIST', 282:'ERASER',
    286:'LESSON', 289:'MARKER', 291:'PENCIL', 294:'RECESS', 295:'REPORT', 296:'RULER', 316:'POETRY',
    317:'PREFIX', 322:'STANZA', 325:'VOWEL', 328:'ANGLE', 337:'GRAPH', 352:'BORDER', 357:'DELTA',
    360:'GLOBE', 361:'HARBOR', 369:'REGION', 373:'TUNDRA', 380:'COLONY', 383:'EMPIRE', 392:'MUSEUM',
    394:'RELIC', 401:'BALLOT', 413:'JUSTICE', 415:'LIBERTY', 418:'POLICY', 420:'PUBLIC', 422:'RIGHTS',
    424:'TREATY', 438:'LAPTOP', 444:'SCREEN', 445:'SIGNAL', 448:'TABLET', 449:'UPLOAD', 452:'BOLT',
    453:'BRIDGE', 456:'ENGINE', 459:'HAMMER', 463:'MOTOR', 466:'PULLEY', 468:'SENSOR', 469:'SWITCH',
    474:'WRENCH', 476:'BALLET', 477:'CANVAS', 478:'CHORUS', 485:'GUITAR', 487:'MELODY', 491:'PIANO',
    493:'RHYTHM', 498:'VIOLIN', 513:'HELMET', 514:'HIKING', 515:'HOCKEY', 521:'SOCCER', 523:'TROPHY',
    528:'CARPET', 538:'PILLOW', 545:'WINDOW', 548:'MIRROR', 553:'CEDAR', 554:'CLOVER', 556:'DAISY',
    558:'GARDEN', 560:'IVY', 562:'MAPLE', 563:'MOSS', 566:'PETAL', 572:'TULIP', 573:'WILLOW',
    646:'FERRY', 659:'SUBWAY', 662:'WAGON', 666:'BAKER', 670:'CHEF', 671:'COACH', 672:'DOCTOR',
    674:'FARMER', 677:'GUIDE', 678:'JUDGE', 680:'NURSE', 684:'PILOT', 688:'TAILOR', 689:'WRITER',
    690:'ALLOY', 694:'COBALT', 695:'COPPER', 698:'HELIUM', 701:'IODINE', 706:'NICKEL', 723:'KINETIC',
    725:'MOMENTUM', 726:'MOTION', 733:'TORQUE', 739:'BINARY', 751:'MODULE', 758:'SERVER', 759:'SYNTAX',
    831:'BUDGET', 839:'INCOME', 843:'PROFIT', 893:'TEMPO', 948:'GOAT', 961:'WHEAT', 963:'ANT',
    964:'BEE', 965:'CAT', 966:'COW', 967:'DOG', 968:'FOX', 969:'HEN', 970:'PIG',
    971:'RAM', 972:'YAK', 973:'COD', 974:'KOI', 975:'RAY', 976:'EMU', 977:'JAY',
    978:'RED', 979:'TAN', 980:'BUN', 981:'EGG', 982:'HAM', 983:'JAM', 984:'PIE',
    985:'TEA', 986:'FIG', 987:'PEA', 988:'YAM', 989:'LOG', 990:'MUD', 991:'SEA',
    992:'SKY', 993:'SUN', 994:'DEW', 995:'FOG', 996:'ICE', 997:'BED', 998:'BOX',
    999:'CUP', 1000:'HAT', 1001:'JAR', 1002:'KEY', 1003:'PAN', 1004:'POT', 1005:'RUG',
    1006:'BUD', 1007:'ELM', 1008:'FIR', 1009:'OAK', 1010:'BUS', 1011:'CAR', 1012:'VAN',
    1013:'BAT', 1014:'RUN', 1015:'SKI', 1016:'ARM', 1017:'EAR', 1018:'EYE', 1019:'HIP',
    1020:'JAW', 1021:'LEG', 1022:'LIP', 1023:'TOE', 1024:'ART', 1025:'HUM', 1026:'TAP',
    1027:'FROG', 1028:'LAMB', 1029:'ANIMAL', 1030:'CRAB', 1031:'FISH', 1032:'BIRD', 1033:'DOVE',
    1034:'BLUE', 1035:'GOLD', 1036:'GRAY', 1037:'GREEN', 1038:'PINK', 1039:'WHITE', 1040:'BREAD',
    1041:'JUICE', 1042:'MILK', 1043:'TOAST', 1044:'BERRY', 1045:'GRAPE', 1046:'LEMON', 1047:'MELON',
    1048:'PLUM', 1049:'CLOUD', 1050:'FLOWER', 1051:'LIGHT', 1052:'MOON', 1053:'RAIN', 1054:'ROCK',
    1055:'STONE', 1056:'TREE', 1057:'WATER', 1058:'FROST', 1059:'STORM', 1060:'SUNNY', 1061:'WIND',
    1062:'STAR', 1063:'BRUSH', 1064:'CLEAN', 1065:'DENTAL', 1066:'HEALTH', 1067:'REST', 1068:'SLEEP',
    1069:'SMILE', 1070:'SOAP', 1071:'CHALK', 1072:'CLASS', 1073:'DESK', 1074:'PAPER', 1075:'SCHOOL',
    1076:'STUDY', 1077:'AUTHOR', 1078:'READ', 1079:'READER', 1080:'STORY', 1081:'WORD', 1082:'COUNT',
    1083:'MINUS', 1084:'NUMBER', 1085:'SHAPE', 1086:'BIKE', 1087:'BOAT', 1088:'PLANE', 1089:'SHIP',
    1090:'TAXI', 1091:'TRAIN', 1092:'TRUCK', 1093:'DANCE', 1094:'DRUM', 1095:'MUSIC', 1096:'PAINT',
    1097:'BALL', 1098:'GAME', 1099:'KICK', 1100:'RACE', 1101:'SWING', 1102:'BOOK', 1103:'BOWL',
    1104:'BASKET', 1105:'CHAIR', 1106:'CLOCK', 1107:'DOOR', 1108:'HOUSE', 1109:'PLATE', 1110:'SPOON',
    1111:'TABLE', 1112:'BRANCH', 1113:'PLANT', 1114:'ROSE', 1115:'SEED', 1116:'VINE', 1117:'BARN',
    1118:'FARM', 1119:'FIELD', 1120:'HORSE', 1121:'BRAVE', 1122:'CALM', 1123:'CARING', 1124:'CLEVER',
    1125:'HONEST', 1126:'LOYAL', 1127:'AXIS', 1128:'PROOF', 1129:'FACTOR', 1130:'MATRIX', 1131:'RADIUS',
    1132:'VECTOR', 1133:'VOLUME', 1134:'MASS', 1135:'METHOD', 1136:'SAMPLE', 1137:'THEORY', 1138:'FUSION',
    1139:'CAUSE', 1140:'CLAUSE', 1141:'GENRE', 1142:'IRONY', 1143:'MOTIF', 1144:'PROSE', 1145:'STYLE',
    1146:'THESIS', 1147:'TONE', 1148:'VOICE', 1149:'CODE', 1150:'DATA', 1151:'LOGIC', 1152:'SCOPE',
    1153:'DEBUG', 1154:'INPUT', 1155:'MEMORY', 1156:'OUTPUT', 1157:'SCRIPT', 1158:'DRIVER', 1159:'PACKET',
    1160:'SYSTEM', 1161:'FORCE', 1162:'IMPACT', 1163:'PHASE', 1164:'STRAIN', 1165:'BIAS', 1166:'PERIOD',
    1167:'REFORM', 1168:'ASSET', 1169:'MARKET', 1170:'PRICE', 1171:'TREND', 1172:'VALUE', 1173:'DESIGN',
    1174:'DEVICE', 1175:'CHORD', 1176:'OCTAVE', 1177:'PITCH', 1178:'SCALE', 1179:'DRAFT', 1180:'FORM',
    1181:'MODEL', 1182:'SKETCH', 1183:'ETHIC', 1184:'MORAL', 1185:'DEBATE', 1186:'EQUITY', 1187:'VALID',
    1188:'ASPECT', 1189:'CONCEPT', 1190:'ANALYZE', 1191:'COMPLEX', 1192:'CONTEXT', 1193:'ABSTRACT', 1194:'LANGUAGE',
    1195:'CRITICAL', 1196:'RHETORIC', 1197:'SCIENCE', 1198:'RESEARCH', 1199:'DYNAMIC', 1200:'PROCESS', 1201:'STRATEGY',
    1202:'OUTCOME', 1203:'INSIGHT'
};

function calculateWordLibraryComplexityScore(word) {
    const rareLetters = (word.match(/[JKQVXZ]/g) || []).length;
    const vowelGroups = (word.match(/[AEIOUY]+/g) || []).length;
    const patterns = [/TION/, /SION/, /MENT/, /NESS/, /TURE/, /PH/, /ENCE/, /ANCE/, /LOGY/, /GRAPH/, /SCOP/, /CRYPT/];
    const advancedPatterns = patterns.filter((pattern) => pattern.test(word)).length;
    const consonantClusters = (word.match(/[BCDFGHJKLMNPQRSTVWXYZ]{3,}/g) || []).length;

    return word.length + rareLetters * 1.25 + Math.max(0, vowelGroups - 2) * 0.6
        + advancedPatterns * 1.4 + consonantClusters * 0.5;
}

const WORD_LIBRARY_INDEX = WORD_LIBRARY_DIFFICULTY_ORDER.flatMap((difficulty) =>
    Object.entries(WORD_LIBRARY_BANKS[difficulty]).flatMap(([category, clues]) => {
        const [min, max] = WORD_LIBRARY_LENGTH_LIMITS[difficulty];
        const tracks = WORD_LIBRARY_TRACKS.filter((track) => track.categories.includes(category)).map((track) => track.id);
        return Object.entries(clues)
            .filter(([word]) => word.length >= min && word.length <= max)
            .map(([word, clue]) => ({
                id: word,
                word,
                category,
                tracks,
                difficulty,
                complexityScore: calculateWordLibraryComplexityScore(word),
                gradeBandLabel: WORD_LIBRARY_DIFFICULTY_GRADE_BANDS[difficulty],
                clue,
                length: word.length
            }));
    })
);

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
