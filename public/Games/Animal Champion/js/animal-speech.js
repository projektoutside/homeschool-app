const FILLER_WORDS = new Set([
  'a', 'an', 'animal', 'answer', 'are', 'guess', 'i', 'is', 'it', 'its', 'like',
  'looks', 'maybe', 'probably', 'see', 'that', 'the', 'think', 'this', 'uh', 'um',
]);

const PHRASE_REPLACEMENTS = Object.freeze([
  [/\bpolar beer\b/g, 'polar bear'],
  [/\bcheater\b/g, 'cheetah'],
]);

export const normalizeAnimalSpeech = (value, { removeFillers = true } = {}) => {
  let normalized = `${value ?? ''}`.toLowerCase();
  normalized = normalized.replace(/[’']/g, '');
  normalized = normalized.replace(/[-/]/g, ' ');
  normalized = normalized.replace(/[^a-z0-9\s]/g, ' ');
  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  let tokens = normalized.split(/\s+/).filter(Boolean);
  tokens = tokens.filter((token, index) => token !== tokens[index - 1]);
  if (removeFillers) tokens = tokens.filter((token) => !FILLER_WORDS.has(token));
  return {
    text: tokens.join(' '),
    compact: tokens.join(''),
    tokens,
  };
};

const levenshteinDistance = (left, right) => {
  if (left.length === 0) return right.length;
  if (right.length === 0) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = left[leftIndex - 1] === right[rightIndex - 1]
        ? previous[rightIndex - 1]
        : Math.min(previous[rightIndex - 1], previous[rightIndex], current[rightIndex - 1]) + 1;
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
};

const isSafeFuzzyMatch = (value, target) => {
  if (!value || !target) return false;
  if (value === target) return true;
  if (value[0] !== target[0]) return false;
  const maximumLength = Math.max(value.length, target.length);
  const maximumEdits = maximumLength <= 4 ? 0 : maximumLength <= 7 ? 1 : 2;
  return levenshteinDistance(value, target) <= maximumEdits;
};

const phraseMatches = (candidate, target) => {
  if (target.tokens.length === 0 || candidate.tokens.length === 0) return false;
  if (candidate.text === target.text || candidate.compact === target.compact) return true;
  if (target.tokens.length === 1) {
    return candidate.tokens.length === 1 && isSafeFuzzyMatch(candidate.tokens[0], target.tokens[0]);
  }
  return target.tokens.every((targetToken) => (
    candidate.tokens.some((candidateToken) => isSafeFuzzyMatch(candidateToken, targetToken))
  ));
};

export const matchAnimalSpeech = (candidates, animal) => {
  if (!animal) return { matched: false };
  const phrases = [animal.name, ...(animal.speechAliases ?? [])]
    .map((phrase) => normalizeAnimalSpeech(phrase, { removeFillers: false }))
    .filter(({ text }) => text);
  const uniqueCandidates = [...new Set((Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean))];

  for (const value of uniqueCandidates) {
    const candidate = normalizeAnimalSpeech(value);
    if (!candidate.text) continue;
    for (const target of phrases) {
      if (phraseMatches(candidate, target)) {
        return { matched: true, candidate: candidate.text, target: target.text };
      }
    }
  }
  return { matched: false };
};

export const buildSpeechCandidatesFromEvent = (event) => {
  const candidates = new Set();
  const displayParts = [];
  let isFinal = false;
  for (let index = event?.resultIndex ?? 0; index < (event?.results?.length ?? 0); index += 1) {
    const result = event.results[index];
    if (!result?.length) continue;
    const topTranscript = `${result[0]?.transcript ?? ''}`.trim();
    if (topTranscript) {
      displayParts.push(topTranscript);
      candidates.add(topTranscript);
    }
    for (let alternativeIndex = 0; alternativeIndex < Math.min(result.length, 3); alternativeIndex += 1) {
      const transcript = `${result[alternativeIndex]?.transcript ?? ''}`.trim();
      if (transcript) candidates.add(transcript);
    }
    isFinal ||= Boolean(result.isFinal);
  }
  const displayText = displayParts.join(' ').trim();
  if (displayText) candidates.add(displayText);
  return { displayText, candidates: [...candidates], isFinal };
};
