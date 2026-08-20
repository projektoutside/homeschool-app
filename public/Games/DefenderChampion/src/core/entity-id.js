const numericEntityId = /^(.*)-(\d+)$/;

const compareText = (first, second) => (first < second ? -1 : first > second ? 1 : 0);

const parseEntityId = (id) => {
  const text = String(id);
  const match = text.match(numericEntityId);
  if (!match) return { text, prefix: null, suffix: null };
  return {
    text,
    prefix: match[1],
    suffix: match[2].replace(/^0+(?=\d)/, ''),
  };
};

export const compareEntityIds = (firstId, secondId) => {
  const first = parseEntityId(firstId);
  const second = parseEntityId(secondId);
  if (first.prefix !== null && first.prefix === second.prefix) {
    const numericComparison = first.suffix.length - second.suffix.length || compareText(first.suffix, second.suffix);
    if (numericComparison !== 0) return numericComparison;
  }
  return compareText(first.text, second.text);
};

export const compareEntitiesById = (first, second) => compareEntityIds(first.id, second.id);
