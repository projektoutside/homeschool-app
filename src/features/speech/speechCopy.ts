export type SpeechAnswerSubject = 'animal' | 'car';

export type SpeechAnswerCopy = Readonly<{
    listening: string;
    noSpeech: string;
}>;

export const getSpeechAnswerCopy = (subject: SpeechAnswerSubject): SpeechAnswerCopy => Object.freeze({
    listening: `Listening... say the ${subject} name.`,
    noSpeech: `No speech was detected yet. Try saying the ${subject} name again.`,
});
