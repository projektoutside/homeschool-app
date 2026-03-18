const ACTIVE_AUDIO_ROOT = 'assets/audio';

class SilentHowl {
    play() { return 0; }
    stop() { return this; }
    pause() { return this; }
    fade() { return this; }
    once() { return this; }
    off() { return this; }
    volume() { return 0; }
    seek() { return 0; }
    state() { return 'loaded'; }
    playing() { return false; }
}

function audioPath(fileName) {
    return `${ACTIVE_AUDIO_ROOT}/${fileName}`;
}

function createHowl(options) {
    if (!options?.src?.length) {
        return new SilentHowl();
    }

    return new Howl(options);
}

export const CUSTOM_SOUND_TYPES = [
    'bgm',
    'animal',
    'thunder',
    'feed',
    'water',
    'play',
    'sing',
    'chainSnap',
    'cageHit',
    'victory',
    'lockOpen',
    'lockPickClick',
    'lockPickSuccess',
    'jolt',
    'errorSound',
    'correctAnswer',
    'fairy',
    'heartbeat',
    'newRandomQuestion',
    'newPetReveal',
    'buyUpgrade',
    'mathWizard',
    'legendaryPet',
];

export function createSoundRegistry(debugLog) {
    return {
        ambient: createHowl({
            src: [audioPath('background.mp3')],
            loop: true,
            volume: 0.5,
            fade: true,
            onloaderror: (id, err) => console.error('Ambient sound load error', id, err),
            onplayerror: (id, err) => console.error('Ambient sound play error', id, err),
        }),
        lava: new SilentHowl(),
        chainSwing: new SilentHowl(),
        feed: createHowl({ src: [audioPath('animalsound.mp3')], volume: 0.4 }),
        water: createHowl({ src: [audioPath('waterdrop.mp3')], volume: 0.4 }),
        play: createHowl({ src: [audioPath('animalsound.mp3')], volume: 0.4 }),
        sing: createHowl({ src: [audioPath('singsound.mp3')], volume: 0.4 }),
        lockClick: createHowl({ src: [audioPath('lockopen.mp3')], volume: 0.3 }),
        lockPickClick: createHowl({
            src: [audioPath('lockopen.mp3')],
            volume: 0.25,
            sprite: { click: [0, 150] },
        }),
        lockPickSuccess: createHowl({ src: [audioPath('lockopen.mp3')], volume: 0.6 }),
        chainSnap: createHowl({ src: [audioPath('chainsnapsound.mp3')], volume: 0.6 }),
        cageHit: createHowl({ src: [audioPath('waterdrop.mp3')], volume: 0.5 }),
        victory: createHowl({ src: [audioPath('victory.mp3')], volume: 0.5 }),
        lockOpen: createHowl({ src: [audioPath('lockopen.mp3')], volume: 0.5 }),
        lose: createHowl({ src: [audioPath('error.mp3')], volume: 0.5 }),
        lightning: createHowl({ src: [audioPath('thundersound.mp3')], volume: 0.4 }),
        legendaryLightning: createHowl({ src: [audioPath('legendarythundersound.mp3')], volume: 0.7 }),
        animal: createHowl({ src: [audioPath('animalsound.mp3')], volume: 0.5 }),
        jolt: createHowl({ src: [audioPath('thundersound.mp3')], volume: 0.6 }),
        errorSound: createHowl({ src: [audioPath('error.mp3')], volume: 0.2 }),
        correctAnswer: createHowl({ src: [audioPath('correct.mp3')], volume: 0.3 }),
        fairy: createHowl({ src: [audioPath('stressfairy.mp3')], volume: 0.5 }),
        heartbeat: createHowl({ src: [audioPath('fastheartbeat.mp3')], volume: 0.3, loop: true }),
        newRandomQuestion: createHowl({ src: [audioPath('glimmer_converted.mp3')], volume: 0.6 }),
        newPetReveal: createHowl({ src: [audioPath('glimmer_converted.mp3')], volume: 0.6 }),
        buyUpgrade: createHowl({ src: [audioPath('correct.mp3')], volume: 0.3 }),
        mathWizard: createHowl({ src: [audioPath('stressfairy.mp3')], volume: 0.6 }),
        legendaryPet: createHowl({ src: [audioPath('legendarypet.mp3')], volume: 0.2, loop: true }),
        introBackground: createHowl({ src: [audioPath('introbackground.mp3')], volume: 0.4, loop: true }),
        startButton: createHowl({ src: [audioPath('startbutton.mp3')], volume: 0.6 }),
        chestOpening: createHowl({ src: [audioPath('chest-opening.mp3')], volume: 0.5 }),
        treasureCorrect: createHowl({ src: [audioPath('correct.mp3')], volume: 0.4 }),
        treasureError: createHowl({ src: [audioPath('error.mp3')], volume: 0.3 }),
    };
}
