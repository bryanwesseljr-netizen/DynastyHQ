export const HIGH_SCHOOL_MOMENT_COUNT = 4;

export const HIGH_SCHOOL_MOMENT_RESULTS = Object.freeze({
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
});

export const HIGH_SCHOOL_MOMENT_TYPES = Object.freeze({
  STANDARD: 'standard',
  SCHOLARSHIP: 'scholarship',
});

export const HIGH_SCHOOL_OBJECTIVE_RESULTS = Object.freeze({
  PASSED: 'passed',
  FAILED: 'failed',
});

const clean = (value, max = 240) => String(value ?? '').trim().slice(0, max);
const numberOrBlank = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : '';
};

const normalizeObjectiveResult = (value) => (
  Object.values(HIGH_SCHOOL_OBJECTIVE_RESULTS).includes(value) ? value : ''
);

const deriveMomentResult = (type, objectives, suppliedResult = '') => {
  const objectiveCount = type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP ? 1 : 2;
  const objectiveResults = objectives.slice(0, objectiveCount).map((objective) => objective.result);
  if (objectiveResults.every(Boolean)) {
    const passed = objectiveResults.filter((result) => result === HIGH_SCHOOL_OBJECTIVE_RESULTS.PASSED).length;
    if (passed === objectiveResults.length) return HIGH_SCHOOL_MOMENT_RESULTS.SUCCESS;
    if (passed === 0) return HIGH_SCHOOL_MOMENT_RESULTS.FAILED;
    return HIGH_SCHOOL_MOMENT_RESULTS.PARTIAL;
  }
  if (Object.values(HIGH_SCHOOL_MOMENT_RESULTS).includes(suppliedResult)) {
    return type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP && suppliedResult === HIGH_SCHOOL_MOMENT_RESULTS.PARTIAL
      ? ''
      : suppliedResult;
  }
  return '';
};

const createEmptyMoment = (index) => ({
  id: index + 1,
  type: HIGH_SCHOOL_MOMENT_TYPES.STANDARD,
  scholarshipSchool: '',
  objectives: [
    { id: 1, text: '', result: '' },
    { id: 2, text: '', result: '' },
  ],
  result: '',
});

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
  moments: Array.from({ length: HIGH_SCHOOL_MOMENT_COUNT }, (_, index) => createEmptyMoment(index)),
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
      const type = supplied.type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP
        ? HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP
        : HIGH_SCHOOL_MOMENT_TYPES.STANDARD;
      const suppliedObjectives = Array.isArray(supplied.objectives) ? supplied.objectives : [];
      const objectives = moment.objectives.map((objective, objectiveIndex) => {
        const suppliedObjective = suppliedObjectives[objectiveIndex] || {};
        return {
          id: objectiveIndex + 1,
          text: clean(suppliedObjective.text ?? (objectiveIndex === 0 ? supplied.objective : '')),
          result: normalizeObjectiveResult(suppliedObjective.result),
        };
      });
      return {
        id: index + 1,
        type,
        scholarshipSchool: type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP
          ? clean(supplied.scholarshipSchool, 120)
          : '',
        objectives,
        result: deriveMomentResult(type, objectives, supplied.result),
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
  if (evaluation.moments.some((moment) => !moment.result)) errors.push('Choose objective results for all four playable moments.');
  if (evaluation.moments.some((moment) => moment.type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP && !moment.scholarshipSchool)) {
    errors.push('Enter the school connected to each Scholarship Challenge moment.');
  }
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
    facts.push([`highSchool.moment.${moment.id}.type`, `Moment ${moment.id} type`, moment.type]);
    facts.push([`highSchool.moment.${moment.id}.result`, `Moment ${moment.id} result`, moment.result]);
    if (moment.scholarshipSchool) {
      facts.push([`highSchool.moment.${moment.id}.scholarshipSchool`, `Moment ${moment.id} scholarship school`, moment.scholarshipSchool]);
    }
    const objectiveCount = moment.type === HIGH_SCHOOL_MOMENT_TYPES.SCHOLARSHIP ? 1 : 2;
    moment.objectives.slice(0, objectiveCount).forEach((objective) => {
      if (objective.text) {
        facts.push([`highSchool.moment.${moment.id}.objective.${objective.id}.text`, `Moment ${moment.id} objective ${objective.id}`, objective.text]);
      }
      if (objective.result) {
        facts.push([`highSchool.moment.${moment.id}.objective.${objective.id}.result`, `Moment ${moment.id} objective ${objective.id} result`, objective.result]);
      }
    });
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
