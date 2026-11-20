// Beginning English phonics. Each tile represents one sound.
const PHONICS_LEVEL = 5;

const PHONICS_WORD_GROUPS = {
    'Warm-up': 'AM AN AT IF IN IT ON UP US',
    'Short A': [
        'BAD BAG BAN BAT CAB CAD CAM CAN CAP CAT DAB DAD DAM FAN GAP GAS',
        'HAD HAM HAT JAM LAP MAD MAN MAP MAT NAP PAD PAN PAT RAG RAM',
        'RAN RAP RAT SAD SAG SAP SAT TAB TAD TAG TAN TAP VAN WAG YAM YAP ZAP'
    ].join(' '),
    'Short E': [
        'BED BEG BET DEN FED FEN GET HEM HEN JET LED LEG LET MEN MET NET',
        'PEG PEN PET RED SET TEN VET WEB WED WET YES YET'
    ].join(' '),
    'Short I': [
        'BIB BID BIG BIN BIT DID DIG DIM DIP FIG FIN FIT HID HIM HIP HIT',
        'JIG KID KIT LID LIP LIT NIB NIP PIG PIN PIT RID RIG RIP SIP SIT',
        'TIN TIP WIG WIN WIT ZIG ZIP'
    ].join(' '),
    'Short O': [
        'BOB BOT COB COD COP COT DOT FOG GOT HOP HOT JOG LOB LOT MOB',
        'MOP NOD NOT POD POP POT ROB ROD ROT SOB TOP TOT'
    ].join(' '),
    'Short U': [
        'BUD BUG BUN BUS BUT CUB CUP CUT DUB DUG FUN GUM HUB HUG',
        'HUT JUG LUG MUD MUG NUB NUT PUG PUP RUB RUG RUN',
        'SUB SUM SUN TUB TUG YUM'
    ].join(' ')
};

const PHONICS_SOUND_BY_LETTER = {
    A: 'a', B: 'b', C: 'k', D: 'd', E: 'e', F: 'f', G: 'g', H: 'h',
    I: 'i', J: 'j', K: 'k', L: 'l', M: 'm', N: 'n', O: 'o', P: 'p',
    R: 'r', S: 's', T: 't', U: 'u', V: 'v', W: 'w', Y: 'y', Z: 'z'
};

const PHONICS_WORDS = Object.entries(PHONICS_WORD_GROUPS).flatMap(([category, words]) =>
    words.split(/\s+/).map((word) => ({ word, category }))
);
