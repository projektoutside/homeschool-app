const EASY_WORD_CLUES = {
    'Ocean Life': {
        EEL: 'I look like a slippery snake, but I am a fish.',
        COD: 'This pale fish lives in chilly seas. You might find it in fish and chips.',
        KOI: 'Look in a garden pond for this fish with bright orange or white spots.',
        RAY: 'I look like a flat kite as I glide through the sea.'
    },
    Birds: {
        OWL: 'Hoo, hoo! Who flies at night with big round eyes?',
        EMU: 'I am a tall bird from Australia. I race on long legs instead of flying.',
        JAY: 'This noisy bird may be blue. It likes to tuck acorns away for later.'
    },
    'Plants and Garden': {
        IVY: 'Look for this leafy vine climbing up a wall.',
        BUD: 'I am a tiny bump on a plant that may open into a flower.',
        ELM: 'This tall shade tree has leaves with little sawlike edges.',
        FIR: 'This tree keeps its needles through winter. You might hang lights on it.',
        OAK: 'Find an acorn on the ground. What kind of tree dropped it?',
        POD: 'Open this plant pouch to find peas or other seeds tucked inside.',
        SAP: 'I am the liquid inside a tree. Some kinds are boiled down for syrup.',
        HAY: 'I am dried grass. Horses and cows can munch on me.'
    },
    Animals: {
        ANT: 'I am a tiny insect. You might see my colony marching in a line.',
        BEE: 'Buzz! I visit flowers. Some of my kind make honey.',
        CAT: 'I have whiskers, purr when happy, and might nap on your lap.',
        COW: 'Moo! I am a big farm animal that can give milk.',
        DOG: 'Woof! I wag my tail and love to play fetch.',
        FOX: 'I have pointy ears and a bushy tail. My coat is often rusty red.',
        HEN: 'Cluck, cluck! I am a grown chicken that can lay eggs.',
        PIG: 'Oink! I have a round snout and may roll in the mud to cool off.',
        RAM: 'I am a male sheep. My horns can curl around my ears.',
        YAK: 'I look like a shaggy cow and can live high in cold mountains.',
        CUB: 'A baby bear or a baby lion can both be called this.',
        PUP: 'This baby dog might chew your shoe and then fall asleep.',
        APE: 'I am a primate with no tail. A gorilla is one kind.',
        DOE: 'A grown female deer has this name.',
        ELK: 'I am a large kind of deer. The males can grow big branching antlers.',
        GNU: 'I am an African animal with curved horns. I am also called a wildebeest.',
        KIT: 'A baby fox goes by this short name.'
    },
    Colors: {
        RED: 'Think of a stop sign, a strawberry, and the top light on a traffic signal.',
        TAN: 'I am the light brown color of dry sand.'
    },
    Food: {
        BUN: 'I am a little bread roll that can hold a burger.',
        EGG: 'Crack my shell to find a yolk inside.',
        HAM: 'This meat comes from a pig. You might put a slice in a sandwich.',
        JAM: 'I am a sweet fruit spread that sticks to your toast.',
        PIE: 'I have a crust around a filling. Apple is a tasty kind.',
        TEA: 'Steep dried leaves in hot water to make this drink.',
        DIP: 'Scoop me up with a chip. Salsa is one kind.',
        NUT: 'Crack a hard shell to find this little food. An almond is one kind.',
        OAT: 'This grain rolls flat and cooks into warm porridge.',
        COB: 'After you eat the little yellow kernels, this hard part of the corn is left.',
        SIP: 'Take just a tiny drink from your cup.'
    },
    'Fruits and Vegetables': {
        FIG: 'This soft fruit hides lots of tiny crunchy seeds under its skin.',
        PEA: 'I am one of the little green balls you can pop out of a pod.',
        YAM: 'I grow underground. You can cook me like a sweet potato.'
    },
    Nature: {
        LOG: 'I am a chunk of a tree trunk. You might sit on me or build a fire with me.',
        MUD: 'Mix dirt with water to get this squishy stuff on your boots.',
        SEA: 'I am a big stretch of salty water where boats can sail.',
        SKY: 'I am the wide space above you where clouds drift.',
        SUN: 'I am the star that lights up your day.',
        BAY: 'I am a curved part of a coast where water reaches into the land.',
        DAM: 'Beavers build one of these to hold back water.',
        ASH: 'After wood burns, this soft gray powder may be left behind.',
        DEN: 'A fox or bear might curl up to rest in this kind of shelter.',
        GEM: 'A bright jewel, like a ruby, that might sparkle in a ring.',
        PIT: 'I am the hard seed in the middle of a peach.',
        GAP: 'I am the open space between two things. You might see me between teeth.'
    },
    Weather: {
        DEW: 'Find me as tiny drops on the grass early in the morning.',
        FOG: 'I am like a low cloud. I make it hard to see down the street.',
        ICE: 'Freeze water to make me. I can make the sidewalk slippery.',
        WET: 'After splashing in a puddle, your socks might feel like this.',
        DRY: 'A towel feels like this once all the water is gone.',
        HOT: 'This is how soup can feel right off the stove. Blow on it first!'
    },
    'Home Objects': {
        BED: 'Climb under my covers when it is time to sleep.',
        BOX: 'Fold my flaps shut to pack things inside me.',
        CUP: 'Hold me in your hand and take a sip.',
        HAT: 'Put me on your head for shade or warmth.',
        JAR: 'I am often made of glass and have a lid that twists on.',
        KEY: 'I am small and made to fit a lock. Turn me to open the door.',
        PAN: 'Set me on the stove to fry an egg.',
        POT: 'I am a deep container for cooking pasta or soup on the stove.',
        RUG: 'Lay me on the floor to keep your toes warm.',
        BAG: 'I hold things you want to carry. You might fill me at the store.',
        CAN: 'I am a metal container. Use an opener to get to the food inside.',
        FAN: 'My blades spin to move air and cool you off.',
        LID: 'Put me on top of a jar or pot to cover it.',
        MAT: 'Leave me by the door and wipe your feet on me.',
        MOP: 'Dip me in a bucket, then swish me across a dirty floor.',
        MUG: 'I have a handle and can hold your warm cocoa.',
        NET: 'My strings make little holes. You can use me to catch a butterfly.',
        PEG: 'Hang your coat on this little stick that pokes out from the wall.',
        TUB: 'Fill me with water and climb in for a bath.',
        WEB: 'A spider spins me out of silk to catch its dinner.',
        WAX: 'I am the stuff that melts when a candle burns.',
        BIB: 'Tie me on before a baby eats. I catch drips and crumbs.',
        BIN: 'Drop things in this large container, like a place for toys or recycling.',
        CAP: 'I am a hat with a bill that shades your eyes.',
        COT: 'I am a small bed that can fold up when you go camping.',
        PIN: 'My sharp end can hold two pieces of cloth together.',
        TIN: 'This silvery metal can coat a food can to protect it from rust.',
        TAG: 'Look for this little label on a shirt to see its size.',
        WIG: 'Wear me on your head to make it look like you have different hair.',
        TIE: 'Knot this long strip of cloth around a shirt collar.',
        PAD: 'This stack of blank paper keeps your drawing pages together at one edge.',
        ZIP: 'Close your jacket by pulling the little handle to join two rows of teeth.',
        RAG: 'Use this old piece of cloth to wipe up a spill.',
        RIM: 'Trace the top edge around a cup. That edge has this name.',
        ROD: 'I am a long thin stick. One kind holds a fishing line.',
        TOY: 'You might play with a doll or a little train. Each one is this.'
    },
    Transportation: {
        BUS: 'I stop to pick up lots of people. A yellow one may take you to school.',
        CAR: 'I have four wheels. Buckle up for a ride down the road.',
        VAN: 'I have more room than most cars. A delivery driver might fill me with boxes.',
        JET: 'I am a fast plane pushed by a strong stream of hot gas.',
        OAR: 'I have a flat end that pushes water to move a boat.',
        ROW: 'Pull a pair of long paddles to move a boat across the water.',
        TOW: 'Pull another vehicle along behind yours, often with a strong cable.'
    },
    Sports: {
        BAT: 'Swing me to hit a pitch in baseball.',
        RUN: 'Move faster than a walk. Both feet can leave the ground for a moment.',
        SKI: 'One of a pair of long, narrow boards that slide across snow.',
        HOP: 'Bounce up and land on one foot.',
        JOG: 'Move at a slow, steady run.',
        WIN: 'Come in first or finish with the most points.',
        TRY: 'Give it a go, even if you are still learning.',
        SIT: 'Bend your knees and lower yourself onto a chair.'
    },
    'Human Body': {
        ARM: 'I bend at the elbow and help you reach for things.',
        EAR: 'I am on the side of your head and help you hear.',
        EYE: 'Blink! I help you see the world.',
        HIP: 'Your leg meets your body at this joint. You can sway it when you dance.',
        JAW: 'My lower part moves up and down when you chew.',
        LEG: 'I bend at the knee and help you stand, walk, and jump.',
        LIP: 'I form the edge of your mouth. Pucker me up to blow a kiss.',
        TOE: 'I am one of the little wigglers at the end of your foot.',
        GUM: 'This pink tissue hugs a tooth where it comes out of your mouth.'
    },
    'Arts and Music': {
        ART: 'Draw a picture, paint a scene, or make a clay pot. All of these can be this.',
        HUM: 'Make a tune with your lips closed, like a quiet buzzing song.',
        TAP: 'Make a light, quick knock with your finger or your foot.',
        INK: 'This colored liquid comes out of a pen when you write.',
        DOT: 'Tap your pen on paper to make this tiny round mark.',
        DYE: 'Soak a plain shirt in this to give it a new color.',
        BOW: 'Draw this long stick with stretched hair across violin strings.'
    },
    School: {
        PEN: 'I write with ink that stays on the page.',
        MAP: 'Look at me to see where roads, rivers, and towns are.',
        ADD: 'Put two groups together to find how many you have in all.',
        SUM: 'Put numbers together using a plus sign to find this answer.',
        ONE: 'This is how many noses most people have.',
        TWO: 'This is how many wheels a bike has.',
        TEN: 'Count all the fingers and thumbs on your hands to get this number.'
    },
    History: {
        ERA: 'A stretch of time remembered for something special, like when dinosaurs lived.'
    }
};
