export const HIGH_SCHOOL_MOMENT_COUNT = 4;

export const HIGH_SCHOOL_MOMENT_RESULTS = Object.freeze({
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
});

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const numberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

export const createEmptyHighSchoolEvaluation = ({
  gameNumber = 1,
  tapeScoreBefore = 0,
  recruitStarsBefore = 3,
} = {}) => ({
  gameNumber: Math.min(5, Math.max(1, Number(gameNumber) || 1)),
  tapeScoreBefore: numberOrBlank(tapeScoreBefore),
  tapeScoreAfter: '',
  recruitStarsBefore: numberOrBlank(recruitStarsBefore),
  recruitStarsAfter: numberOrBlank(recruitStarsBefore),
  teamImpact: '',
  moments: Array.from({ length: HIGH_SCHOOL_MOMENT_COUNT }, (_, index) => ({
    id: index + 1,
    objective: '',
    result: '',
  })),
});

export const normalizeHighSchoolEvaluation = (value = {}, fallback = {}) => {
  const base = createEmptyHighSchoolEvaluation(fallback);
  const suppliedMoments = Array.isArray(value.moments) ? value.moments : [];
  return {
    ...base,
    ...value,
    gameNumber: Math.min(5, Math.max(1, Number(value.gameNumber || base.gameNumber) || 1)),
    tapeScoreBefore: numberOrBlank(value.tapeScoreBefore ?? base.tapeScoreBefore),
    tapeScoreAfter: numberOrBlank(value.tapeScoreAfter),
    recruitStarsBefore: numberOrBlank(value.recruitStarsBefore ?? base.recruitStarsBefore),
    recruitStarsAfter: numberOrBlank(value.recruitStarsAfter ?? base.recruitStarsAfter),
    teamImpact: clean(value.teamImpact, 500),
    moments: base.moments.map((moment, index) => {
      const supplied = suppliedMoments[index] || {};
      const result = Object.values(HIGH_SCHOOL_MOMENT_RESULTS).includes(supplied.result)
        ? supplied.result
        : '';
      return {
        id: index + 1,
        objective: clean(supplied.objective),
        result,
      };
    }),
  };
};

export const summarizeHighSchoolMoments = (value = {}) => {
  const evaluation = normalizeHighSchoolEvaluation(value);
  const counts = evaluation.moments.reduce((summary, moment) => {
    if (moment.result) summary[moment.result] += 1;
    return summary;
  }, { success: 0, partial: 0, failed: 0 });
  return {
    ...counts,
    completed: counts.success + counts.partial + counts.failed,
    tapeScoreDelta: evaluation.tapeScoreAfter === '' || evaluation.tapeScoreBefore === ''
      ? null
      : Number(evaluation.tapeScoreAfter) - Number(evaluation.tapeScoreBefore),
    starDelta: evaluation.recruitStarsAfter === '' || evaluation.recruitStarsBefore === ''
      ? null
      : Number(evaluation.recruitStarsAfter) - Number(evaluation.recruitStarsBefore),
  };
};

export const validateHighSchoolEvaluation = (value = {}) => {
  const evaluation = normalizeHighSchoolEvaluation(value);
  const errors = [];
  if (evaluation.moments.some((moment) => !moment.result)) errors.push('Choose a result for all four playable moments.');
  if (evaluation.tapeScoreAfter === '' || evaluation.tapeScoreAfter < 0) errors.push('Enter the non-negative Tape Score shown after the game.');
  if (evaluation.recruitStarsAfter === '' || evaluation.recruitStarsAfter < 1 || evaluation.recruitStarsAfter > 5) {
    errors.push('Choose the verified 1–5 star rating shown after the game.');
  }
  return errors;
};

export const highSchoolEvaluationFacts = (value, publicationId) => {
  const evaluation = normalizeHighSchoolEvaluation(value);
  const facts = [
    ['highSchool.gameNumber', 'High-school game', evaluation.gameNumber],
    ['highSchool.tapeScoreBefore', 'Tape Score before game', evaluation.tapeScoreBefore],
    ['recruiting.profile.tapeScore', 'Tape Score after game', evaluation.tapeScoreAfter],
    ['highSchool.recruitStarsBefore', 'Star rating before game', evaluation.recruitStarsBefore],
    ['recruiting.profile.recruitStars', 'Star rating after game', evaluation.recruitStarsAfter],
  ];
  evaluation.moments.forEach((moment) => {
    facts.push([`highSchool.moment.${moment.id}.result`, `Moment ${moment.id} result`, moment.result]);
    if (moment.objective) facts.push([`highSchool.moment.${moment.id}.objective`, `Moment ${moment.id} objective`, moment.objective]);
  });
  if (evaluation.teamImpact) facts.push(['highSchool.teamImpact', 'Verified Team Impact note', evaluation.teamImpact]);
  return facts.filter(([, , factValue]) => factValue !== '').map(([key, label, factValue]) => ({
    id: `${publicationId}:${key}`,
    key,
    label,
    value: factValue,
    confidence: 1,
    sourceId: publicationId,
    verified: true,
    publicationId,
  }));
};
