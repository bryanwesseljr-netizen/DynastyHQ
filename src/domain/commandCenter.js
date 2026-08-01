export const CAREER_STAGES = Object.freeze({
  HIGH_SCHOOL: 'HighSchool',
  COLLEGE: 'College',
  OC: 'OC',
  HC: 'HC',
  RETIRED: 'Retired',
});

const clean = (value) => String(value || '').trim();

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const numberOrZero = (value) => numberOrNull(value) ?? 0;

const sameSchool = (left, right) => (
  clean(left).toLowerCase() !== ''
  && clean(left).toLowerCase() === clean(right).toLowerCase()
);

export const deriveCareerStage = (state = {}) => {
  if (state.careerPhase === 'Retired') return CAREER_STAGES.RETIRED;
  if (state.careerPhase === 'HC') return CAREER_STAGES.HC;
  if (state.careerPhase === 'OC') return CAREER_STAGES.OC;

  const explicit = state.careerStage || state.player?.careerStage;
  if (explicit === CAREER_STAGES.COLLEGE || explicit === CAREER_STAGES.HIGH_SCHOOL) return explicit;

  const player = state.player || {};
  const collegeStarted = sameSchool(player.school, player.college)
    || (player.isCommitted && numberOrZero(state.currentSeason) > 1);
  return collegeStarted ? CAREER_STAGES.COLLEGE : CAREER_STAGES.HIGH_SCHOOL;
};

const stageDetails = {
  [CAREER_STAGES.HIGH_SCHOOL]: {
    eyebrow: 'High School Recruiting Journey',
    title: 'Recruit Command Center',
    description: 'Build verified tape, earn offers, and make the college decision without skipping the three-star grind.',
    primaryAction: { label: 'Log recruiting week', tab: 'dataEntry' },
    secondaryAction: { label: 'Open recruiting board', tab: 'recruiting' },
  },
  [CAREER_STAGES.COLLEGE]: {
    eyebrow: 'Road to Glory',
    title: 'College Player Command Center',
    description: 'Balance the depth chart, academics, health, development, and NIL while building a real college résumé.',
    primaryAction: { label: 'Log player week', tab: 'dataEntry' },
    secondaryAction: { label: 'Review career archive', tab: 'chronicle' },
  },
  [CAREER_STAGES.OC]: {
    eyebrow: 'Coaching Career · Offensive Coordinator',
    title: 'Offensive Coordinator Office',
    description: 'Own the offense, contribute to recruiting, meet contract expectations, and earn the next opportunity.',
    primaryAction: { label: 'Log coordinator week', tab: 'dataEntry' },
    secondaryAction: { label: 'Open personnel office', tab: 'frontOffice' },
  },
  [CAREER_STAGES.HC]: {
    eyebrow: 'Coaching Career · Head Coach',
    title: 'Head Coach Program Center',
    description: 'Manage results, staff direction, recruiting, roster retention, NIL resources, and the athletic director’s expectations.',
    primaryAction: { label: 'Log program week', tab: 'dataEntry' },
    secondaryAction: { label: 'Open personnel office', tab: 'frontOffice' },
  },
  [CAREER_STAGES.RETIRED]: {
    eyebrow: 'Career Complete',
    title: 'Legacy & Retirement Center',
    description: 'Explore the full player-to-coach journey, defining moments, records, championships, and permanent legacy.',
    primaryAction: { label: 'Explore career chronicle', tab: 'chronicle' },
    secondaryAction: { label: 'Open trophy case', tab: 'trophies' },
  },
};

const gameTotals = (games = []) => games.reduce((totals, game) => ({
  passYds: totals.passYds + numberOrZero(game.passYds),
  passTD: totals.passTD + numberOrZero(game.passTD),
  rushYds: totals.rushYds + numberOrZero(game.rushYds),
  rushTD: totals.rushTD + numberOrZero(game.rushTD),
  interceptions: totals.interceptions + numberOrZero(game.int),
  points: totals.points + numberOrZero(game.homeScore),
}), { passYds: 0, passTD: 0, rushYds: 0, rushTD: 0, interceptions: 0, points: 0 });

const recordFor = (games = []) => ({
  wins: games.filter((game) => game.result === 'W').length,
  losses: games.filter((game) => game.result === 'L').length,
});

const display = (value, suffix = '') => value === null ? '—' : `${value}${suffix}`;

const formatCompact = (value) => {
  const numeric = numberOrNull(value);
  if (numeric === null) return '—';
  if (numeric >= 1_000_000) return `${(numeric / 1_000_000).toFixed(1)}m`;
  if (numeric >= 1_000) return `${(numeric / 1_000).toFixed(1)}k`;
  return String(numeric);
};

const topRecruit = (recruiting = []) => [...recruiting]
  .filter((entry) => numberOrZero(entry.interest) > 0)
  .sort((left, right) => numberOrZero(right.interest) - numberOrZero(left.interest))[0] || null;

const getStageGames = (state, stage) => {
  const season = numberOrZero(state.currentSeason) || 1;
  const logs = (state.gameLogs || []).filter((game) => numberOrZero(game.season) === season);
  if (![CAREER_STAGES.OC, CAREER_STAGES.HC].includes(stage)) return logs;

  const phase = stage;
  const verified = (state.weeklyUpdates || [])
    .filter((update) => update.careerPhase === phase && numberOrZero(update.season) === season && update.game)
    .map((update) => update.game);
  return verified.length ? verified : logs;
};

const createAdvisor = ({ state, stage, seasonGames, totals, offers, topSchool }) => {
  const advice = [];
  const add = (tone, title, text) => advice.push({ tone, title, text });
  const rtg = state.rtg || {};
  const coach = state.coach || {};
  const gpa = numberOrNull(rtg.gpa);
  const energy = numberOrNull(rtg.energy);
  const trust = numberOrNull(rtg.coachTrust);
  const trustTarget = numberOrNull(rtg.trustToNext);
  const security = numberOrNull(coach.security);

  if (stage === CAREER_STAGES.HIGH_SCHOOL) {
    if (!offers.length) add('info', 'Recruiting runway', 'No verified scholarship offer is on the board yet. Keep building tape and publish each recruiting update.');
    else add('success', 'Offer leverage', `${offers.length} verified offer${offers.length === 1 ? '' : 's'} on the board. Keep the decision grounded in the in-game options.`);
    if (topSchool) add('info', 'Current leader', `${topSchool.name} has the strongest verified interest at ${numberOrZero(topSchool.interest)}%.`);
    if (state.player?.isCommitted) add('success', 'Decision locked', `The commitment to ${state.player.college} is in the permanent Chronicle. Finish the high-school chapter.`);
  }

  if (stage === CAREER_STAGES.COLLEGE) {
    if (gpa === null || gpa === 0) add('info', 'Academics pending', 'Upload the current academics screen before the site gives eligibility advice.');
    else if (gpa < 2.5) add('danger', 'Academic risk', `The verified GPA is ${gpa.toFixed(1)}. Protect eligibility before spending energy elsewhere.`);
    else add('success', 'Academic standing', `The verified GPA is ${gpa.toFixed(1)} and currently above the house-rule danger line.`);
    if (energy !== null && energy > 0 && energy < 30) add('warning', 'Low energy', `Weekly energy is ${energy}. Recovery should take priority over optional development.`);
    if (trust !== null && trustTarget !== null && trustTarget > trust) add('info', 'Position battle', `${trustTarget - trust} verified Coach Trust points remain to reach the next depth-chart threshold.`);
  }

  if (stage === CAREER_STAGES.OC || stage === CAREER_STAGES.HC) {
    if (security === null) add('info', 'AD status pending', 'Upload the current coach or program screen before the office assigns a hot-seat status.');
    else if (security < 40) add('danger', 'Hot seat', `Verified job security is ${security}%. Results and AD goals need immediate attention.`);
    else if (security >= 80) add('success', 'Program confidence', `Verified job security is ${security}%. The current foundation is stable.`);
    if (seasonGames.length) add('info', 'Season pace', `The verified season record is ${recordFor(seasonGames).wins}-${recordFor(seasonGames).losses}.`);
    else add('info', 'Baseline needed', 'Publish the first coach-week screenshot set to establish verified program results.');
    if (stage === CAREER_STAGES.OC) add('info', 'Coordinator boundary', 'Track offensive results and assigned recruiting work; leave defense, staff, and final budget authority to the head coach.');
    if (stage === CAREER_STAGES.HC) add('info', 'Program authority', 'Review recruiting, retention, NIL resources, staff, and AD expectations before advancing the week.');
  }

  if (stage === CAREER_STAGES.RETIRED) {
    add('success', 'Career preserved', `${(state.careerChronicle || []).length} verified Chronicle events remain available for the complete career review.`);
    add('info', 'Legacy audit', 'Use the Chronicle filters to revisit each player and coaching era without changing the retired save.');
  }

  if ([CAREER_STAGES.HIGH_SCHOOL, CAREER_STAGES.COLLEGE].includes(stage) && seasonGames.length && totals.interceptions >= seasonGames.length) {
    add('warning', 'Ball security', `${totals.interceptions} interceptions in ${seasonGames.length} appearances is a verified trend worth addressing.`);
  }
  return advice.slice(0, 4);
};

const panel = (id, title, icon, rows) => ({ id, title, icon, rows });
const row = (label, value, tone = 'default') => ({ label, value, tone });

export const buildCommandCenter = (state = {}) => {
  const stage = deriveCareerStage(state);
  const details = stageDetails[stage];
  const seasonGames = getStageGames(state, stage);
  const allGames = state.gameLogs || [];
  const seasonRecord = recordFor(seasonGames);
  const careerRecord = recordFor(allGames);
  const totals = gameTotals(seasonGames);
  const careerTotals = gameTotals(allGames);
  const rtg = state.rtg || {};
  const coach = state.coach || {};
  const player = state.player || {};
  const recruiting = state.recruiting || [];
  const offers = recruiting.filter((entry) => entry.offered);
  const topSchool = topRecruit(recruiting);
  const activeTargets = recruiting.filter((entry) => numberOrZero(entry.interest) > 0);
  const totalTouchdowns = totals.passTD + totals.rushTD;
  const careerTouchdowns = careerTotals.passTD + careerTotals.rushTD;
  const healthStates = Object.values(rtg.wear || {});
  const healthStatus = healthStates.includes('Red') ? 'Questionable' : (healthStates.includes('Yellow') ? 'Probable' : 'Active');
  const championships = (state.trophies || []).filter((entry) => entry.type === 'Championship').length;
  const awards = (state.trophies || []).filter((entry) => entry.type === 'Award').length;
  const institution = stage === CAREER_STAGES.HIGH_SCHOOL
    ? player.school
    : (coach.currentSchool || player.college || player.school);
  let metrics;
  let panels;

  if (stage === CAREER_STAGES.HIGH_SCHOOL) {
    metrics = [
      { label: 'Season record', value: `${seasonRecord.wins}-${seasonRecord.losses}`, tone: 'default' },
      { label: 'Verified offers', value: String(offers.length), tone: 'gold' },
      { label: 'Season total TD', value: String(totalTouchdowns), tone: 'gold' },
      { label: 'QB national rank', value: display(numberOrNull(player.nationalQbRank), ''), tone: 'default' },
    ];
    panels = [
      panel('recruiting', 'Recruiting Race', 'map', [
        row('Current status', player.isCommitted ? `Committed · ${player.college}` : 'Uncommitted', player.isCommitted ? 'success' : 'gold'),
        row('Verified offers', offers.length),
        row('Interest leader', topSchool ? `${topSchool.name} · ${numberOrZero(topSchool.interest)}%` : 'No verified leader'),
      ]),
      panel('tape', 'Tape & Development', 'film', [
        row('Prospect grade', `${numberOrZero(player.stars) || 3}-star`),
        row('Overall', display(numberOrNull(player.overall))),
        row('Season pass / rush', `${totals.passYds} / ${totals.rushYds} yds`),
      ]),
      panel('availability', 'Friday Night Status', 'health', [
        row('Availability', healthStatus, healthStatus === 'Active' ? 'success' : 'warning'),
        row('Week', numberOrZero(state.currentWeek) || 1),
        row('Latest verified update', state.weeklyUpdates?.length ? 'Published' : 'Awaiting first upload'),
      ]),
    ];
  } else if (stage === CAREER_STAGES.COLLEGE) {
    metrics = [
      { label: 'Season record', value: `${seasonRecord.wins}-${seasonRecord.losses}`, tone: 'default' },
      { label: 'Season pass yards', value: String(totals.passYds), tone: 'default' },
      { label: 'Season total TD', value: String(totalTouchdowns), tone: 'gold' },
      { label: 'Coach Trust', value: display(numberOrNull(rtg.coachTrust)), tone: 'gold' },
    ];
    panels = [
      panel('position', 'Position Battle', 'target', [
        row('Depth-chart rank', clean(rtg.rank) || 'Not verified'),
        row('Coach Trust', display(numberOrNull(rtg.coachTrust))),
        row('Next threshold', display(numberOrNull(rtg.trustToNext))),
      ]),
      panel('player-health', 'Health & Academics', 'health', [
        row('Availability', healthStatus, healthStatus === 'Active' ? 'success' : 'warning'),
        row('GPA', numberOrNull(rtg.gpa) && numberOrNull(rtg.gpa) > 0 ? numberOrNull(rtg.gpa).toFixed(1) : 'Not verified'),
        row('Weekly energy', numberOrNull(rtg.energy) && numberOrNull(rtg.energy) > 0 ? numberOrNull(rtg.energy) : 'Not verified'),
      ]),
      panel('brand', 'NIL & Development', 'money', [
        row('Valuation', numberOrNull(rtg.valuation) ? `$${numberOrNull(rtg.valuation).toLocaleString()}` : 'Not verified', 'success'),
        row('Followers', formatCompact(rtg.followers)),
        row('Skill points', display(numberOrNull(rtg.skillPoints))),
      ]),
    ];
  } else if (stage === CAREER_STAGES.OC) {
    const pointsPerGame = seasonGames.length ? (totals.points / seasonGames.length).toFixed(1) : '—';
    metrics = [
      { label: 'Offense record', value: `${seasonRecord.wins}-${seasonRecord.losses}`, tone: 'default' },
      { label: 'Points per game', value: pointsPerGame, tone: 'gold' },
      { label: 'Pass / rush yards', value: `${totals.passYds} / ${totals.rushYds}`, tone: 'default' },
      { label: 'Job security', value: display(numberOrNull(coach.security), '%'), tone: numberOrZero(coach.security) < 40 ? 'danger' : 'success' },
    ];
    panels = [
      panel('offense', 'Offensive Command', 'playbook', [
        row('Season touchdowns', totalTouchdowns),
        row('Turnovers', totals.interceptions, totals.interceptions > seasonGames.length ? 'warning' : 'default'),
        row('Program outlook', clean(state.playoffPicture) || 'Not verified'),
      ]),
      panel('assignments', 'Recruiting Assignments', 'users', [
        row('Active targets', activeTargets.length),
        row('Verified offers', offers.length),
        row('Top priority', topSchool?.name || 'No verified target'),
      ]),
      panel('contract', 'Contract & Carousel', 'contract', [
        row('Prestige', clean(coach.prestige) || 'Not verified'),
        row('Contract year', `${numberOrZero(coach.contractYear) || 1} / ${numberOrZero(coach.contractRemaining) || 3}`),
        row('Role boundary', 'Offense + assigned recruiting'),
      ]),
    ];
  } else if (stage === CAREER_STAGES.HC) {
    metrics = [
      { label: 'Program record', value: `${seasonRecord.wins}-${seasonRecord.losses}`, tone: 'default' },
      { label: 'Job security', value: display(numberOrNull(coach.security), '%'), tone: numberOrZero(coach.security) < 40 ? 'danger' : 'success' },
      { label: 'Coach prestige', value: clean(coach.prestige) || '—', tone: 'gold' },
      { label: 'Allocated budget', value: formatCompact(coach.budget), tone: 'gold' },
    ];
    panels = [
      panel('program', 'Program Health', 'shield', [
        row('AD confidence', display(numberOrNull(coach.security), '%'), numberOrZero(coach.security) < 40 ? 'danger' : 'success'),
        row('Program outlook', clean(state.playoffPicture) || 'Not verified'),
        row('Alma mater status', clean(coach.almaMaterStatus) || 'Not verified'),
      ]),
      panel('personnel', 'Personnel Department', 'users', [
        row('Active targets', activeTargets.length),
        row('Verified offers', offers.length),
        row('Board leader', topSchool?.name || 'No verified target'),
      ]),
      panel('budget', 'NIL & Budget Office', 'money', [
        row('Current allocation', formatCompact(coach.budget)),
        row('Contract year', `${numberOrZero(coach.contractYear) || 1} / ${numberOrZero(coach.contractRemaining) || 3}`),
        row('Budget status', numberOrNull(coach.budget) === null ? 'Awaiting verified screen' : 'Tracked'),
      ]),
    ];
  } else {
    metrics = [
      { label: 'Career record', value: `${careerRecord.wins}-${careerRecord.losses}`, tone: 'default' },
      { label: 'Verified events', value: String((state.careerChronicle || []).length), tone: 'gold' },
      { label: 'Championships', value: String(championships), tone: 'gold' },
      { label: 'Career total TD', value: String(careerTouchdowns), tone: 'default' },
    ];
    panels = [
      panel('legacy', 'Legacy Résumé', 'trophy', [
        row('Championships', championships, championships ? 'success' : 'default'),
        row('Individual awards', awards),
        row('Trophy-case entries', (state.trophies || []).length),
      ]),
      panel('chapters', 'Career Chapters', 'book', [
        row('Player games', allGames.length),
        row('Career milestones', (state.careerMilestones || []).length),
        row('Newsroom editions', (state.newsroomIssues || []).length),
      ]),
      panel('final-post', 'Final Post', 'briefcase', [
        row('Final school', clean(coach.currentSchool || player.school) || 'Not recorded'),
        row('Final prestige', clean(coach.prestige) || 'Not recorded'),
        row('Status', 'Career complete', 'success'),
      ]),
    ];
  }

  return {
    stage,
    ...details,
    institution: clean(institution) || 'Institution not recorded',
    season: numberOrZero(state.currentSeason) || 1,
    week: numberOrZero(state.currentWeek) || 1,
    record: seasonRecord,
    metrics,
    panels,
    advice: createAdvisor({ state, stage, seasonGames, totals, offers, topSchool }),
    recentGames: [...seasonGames].sort((left, right) => numberOrZero(right.week) - numberOrZero(left.week)).slice(0, 6),
    recentEvents: [...(state.careerChronicle || [])].sort((left, right) => (
      numberOrZero(right.season) - numberOrZero(left.season)
      || numberOrZero(right.week) - numberOrZero(left.week)
      || clean(right.occurredAt).localeCompare(clean(left.occurredAt))
    )).slice(0, 6),
  };
};
