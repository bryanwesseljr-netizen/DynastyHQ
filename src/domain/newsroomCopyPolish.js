// Narrow, deterministic typo correction for generated college-football copy.
// This is deliberately NOT a general spellchecker: only a verified known typo.
export const polishNewsroomCopy = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/\bplayover\b/gi, (word) => {
    if (word === word.toUpperCase()) return 'PLAYOFF';
    if (word[0] === word[0].toUpperCase()) return 'Playoff';
    return 'playoff';
  });
};
