const clean = (value, max = 600) => String(value ?? '').trim().slice(0, max);
const normalizeKey = (value) => clean(value, 180);
const matchesPublication = (entry, publicationId) => Boolean(publicationId) && (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

export const NEWSROOM_IMAGE_PRESETS = Object.freeze({
  QB_POCKET_ACTION: 'qb-pocket-action',
  DUAL_THREAT_SCRAMBLE: 'dual-threat-scramble',
  PREGAME_TUNNEL: 'pregame-tunnel',
  SIDELINE_WAITING: 'sideline-waiting',
  POSTGAME_SIGNATURE_WIN: 'postgame-signature-win',
  TOUGH_LOSS_REFLECTIVE: 'tough-loss-reflective',
  FALL_CAMP_PRACTICE: 'fall-camp-practice',
  BREAKOUT_PLAYER_FEATURE: 'breakout-player-feature',
  RIVALRY_GAME: 'rivalry-game',
  PLAYER_PROFILE_MEDIA: 'player-profile-media',
  RECRUITING_PROFILE: 'recruiting-profile',
});

export const NEWSROOM_IMAGE_SCENE_OVERRIDES = Object.freeze({
  AUTO: 'auto',
  POCKET_ACTION: 'pocket-action',
  SCRAMBLE: 'scramble',
  CELEBRATION: 'celebration',
  SIDELINE: 'sideline',
  PORTRAIT: 'portrait',
  TUNNEL: 'tunnel',
  PRACTICE: 'practice',
  TOUGH_LOSS: 'tough-loss',
  RIVALRY: 'rivalry',
  RECRUITING: 'recruiting',
});

const PRESET_META = Object.freeze({
  [NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION]: {
    label: 'QB Pocket Action',
    scene: 'live game action from a believable passing pocket',
    tone: 'focused, composed, decisive',
  },
  [NEWSROOM_IMAGE_PRESETS.DUAL_THREAT_SCRAMBLE]: {
    label: 'Dual-Threat Scramble',
    scene: 'live game action with the quarterback escaping pressure or advancing as a runner',
    tone: 'urgent, athletic, controlled',
  },
  [NEWSROOM_IMAGE_PRESETS.PREGAME_TUNNEL]: {
    label: 'Pregame Tunnel',
    scene: 'pregame arrival or tunnel atmosphere before kickoff',
    tone: 'locked in, anticipatory, restrained',
  },
  [NEWSROOM_IMAGE_PRESETS.SIDELINE_WAITING]: {
    label: 'Sideline / Waiting for Opportunity',
    scene: 'authentic sideline coverage during a live game without depicting an invented snap',
    tone: 'patient, observant, competitive',
  },
  [NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN]: {
    label: 'Postgame Signature Win',
    scene: 'postgame editorial reaction after a verified significant win',
    tone: 'satisfied, emotional, grounded',
  },
  [NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE]: {
    label: 'Tough Loss / Reflective Sideline',
    scene: 'late-game or postgame sideline reflection after a verified loss',
    tone: 'disappointed, reflective, composed',
  },
  [NEWSROOM_IMAGE_PRESETS.FALL_CAMP_PRACTICE]: {
    label: 'Fall Camp / Practice',
    scene: 'practice-field or fall-camp football work with realistic drill spacing',
    tone: 'focused, developmental, competitive',
  },
  [NEWSROOM_IMAGE_PRESETS.BREAKOUT_PLAYER_FEATURE]: {
    label: 'Breakout Player Feature',
    scene: 'editorial player feature rooted in verified on-field production',
    tone: 'confident, emerging, natural',
  },
  [NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME]: {
    label: 'Rivalry Game',
    scene: 'high-intensity game-day photojournalism for a verified rivalry matchup',
    tone: 'intense, competitive, controlled',
  },
  [NEWSROOM_IMAGE_PRESETS.PLAYER_PROFILE_MEDIA]: {
    label: 'Player Profile / Media Feature',
    scene: 'natural editorial player portrait or football-environment feature image',
    tone: 'confident, relaxed, authentic',
  },
  [NEWSROOM_IMAGE_PRESETS.RECRUITING_PROFILE]: {
    label: 'Recruiting / Profile',
    scene: 'editorial recruiting or player-profile photograph without invented commitment ceremony details',
    tone: 'confident, thoughtful, aspirational',
  },
});

export const MASTER_EDITORIAL_PHOTO_STYLE = Object.freeze([
  'photorealistic editorial college-football photography',
  'professional sports-photojournalism composition rather than poster art',
  'realistic stadium, sideline, tunnel, or practice lighting appropriate to the selected scene',
  'authentic football equipment and natural athletic body language',
  'believable player spacing, sidelines, field geometry, and background activity',
  'realistic helmet reflections, skin texture, jersey fabric, pads, gloves, and grass or turf',
  'shallow depth of field and telephoto compression when appropriate to professional sports photography',
  'restrained professional color grading with realistic contrast and skin tones',
  'subtle motion blur only when physically appropriate to the action',
  'no CGI, video-game render, comic-book, superhero, poster, or promotional-key-art appearance',
]);

export const NEWSROOM_POSITION_MODULES = Object.freeze({
  QB: Object.freeze([
    'Use a believable football grip with anatomically correct fingers and wrist alignment.',
    'Keep shoulder, elbow, hips, and lower-body mechanics coordinated for the depicted quarterback action.',
    'Keep the quarterback’s eyes naturally downfield or on an appropriate sideline read for the scene.',
    'Use balanced pocket footwork and a realistic base; avoid exaggerated throwing poses.',
    'Before release, show natural two-hand ball security when the action timing calls for it.',
  ]),
  RB: Object.freeze([
    'Use realistic ball security with the ball high and tight when carrying.',
    'Keep pad level, stride length, torso lean, and contact balance believable for a running back.',
    'Avoid impossible cuts, floating feet, or exaggerated sprint poses.',
  ]),
  WR_TE: Object.freeze([
    'Use believable route-running posture, stride mechanics, hand position, and eye tracking.',
    'For catches, align the hands, wrists, shoulders, and ball trajectory naturally.',
    'Keep defender leverage and field spacing plausible; avoid staged one-on-one poster poses.',
  ]),
  OL: Object.freeze([
    'Use a stable pass-set or run-blocking base with realistic knee bend, pad level, and weight distribution.',
    'Keep hand placement and arm extension believable and inside the defender frame when possible.',
    'Show realistic line spacing and engagement rather than isolated wrestling poses.',
  ]),
  DL_EDGE: Object.freeze([
    'Use believable get-off, pad level, hand fighting, leverage, and pass-rush body angle.',
    'Keep pursuit paths and blocker interaction physically plausible.',
    'Avoid impossible torso twists, flying contact, or superhero pass-rush poses.',
  ]),
  LB: Object.freeze([
    'Use realistic linebacker stance, read-step posture, pursuit angle, and tackling approach.',
    'Keep hips, shoulders, feet, and eyes coordinated with the depicted assignment.',
    'Show believable second-level spacing relative to the line and secondary.',
  ]),
  DB: Object.freeze([
    'Use believable coverage leverage, hip turn, footwork, eye discipline, and ball tracking.',
    'Keep receiver-defender spacing plausible for man or zone coverage.',
    'For interceptions or breakups, align the ball, hands, body position, and trajectory naturally.',
  ]),
  K_P: Object.freeze([
    'Use realistic plant-foot placement, leg swing, torso balance, and follow-through for kicking or punting.',
    'Keep holder, snapper, protection, and coverage spacing believable when they are visible.',
    'Avoid impossible leg extension, ball contact, or staged frozen poses.',
  ]),
  COACH: Object.freeze([
    'Use natural sideline coaching posture, headset handling, play-sheet behavior, and interaction with staff or players.',
    'Keep emotion realistic for a working coach rather than a promotional portrait unless the selected scene is a profile.',
    'Do not depict an invented trophy, ceremony, confrontation, or specific play call.',
  ]),
  TEAM: Object.freeze([
    'Use believable group spacing, sideline organization, tunnel flow, or postgame interaction.',
    'Keep equipment variation and body language natural across multiple athletes.',
    'Avoid duplicated faces, cloned poses, synchronized poster stances, or impossible crowding.',
  ]),
});

const POSITION_GROUPS = Object.freeze({
  QB: new Set(['QB', 'QUARTERBACK']),
  RB: new Set(['RB', 'HB', 'FB', 'RUNNING BACK', 'HALFBACK', 'FULLBACK']),
  WR_TE: new Set(['WR', 'TE', 'WIDE RECEIVER', 'TIGHT END']),
  OL: new Set(['OL', 'LT', 'LG', 'C', 'RG', 'RT', 'OT', 'OG', 'CENTER', 'OFFENSIVE LINE']),
  DL_EDGE: new Set(['DL', 'DE', 'DT', 'NT', 'EDGE', 'DEFENSIVE END', 'DEFENSIVE TACKLE', 'NOSE TACKLE']),
  LB: new Set(['LB', 'MLB', 'OLB', 'ILB', 'LINEBACKER']),
  DB: new Set(['DB', 'CB', 'FS', 'SS', 'S', 'CORNERBACK', 'SAFETY']),
  K_P: new Set(['K', 'P', 'K/P', 'PK', 'KICKER', 'PUNTER']),
});

export const getNewsroomPositionModule = (position, subject = 'player') => {
  if (subject === 'coach') return { key: 'COACH', mechanics: [...NEWSROOM_POSITION_MODULES.COACH] };
  if (subject === 'team') return { key: 'TEAM', mechanics: [...NEWSROOM_POSITION_MODULES.TEAM] };
  const normalized = clean(position, 60).toUpperCase();
  const key = Object.entries(POSITION_GROUPS).find(([, values]) => values.has(normalized))?.[0] || 'TEAM';
  return { key, mechanics: [...NEWSROOM_POSITION_MODULES[key]] };
};

const WEEKLY_GAME_FACTS = Object.freeze({
  opponent: 'game.opponent',
  result: 'game.result',
  homeScore: 'game.homeScore',
  awayScore: 'game.awayScore',
  passYds: 'game.passYds',
  passTD: 'game.passTD',
  rushYds: 'game.rushYds',
  rushTD: 'game.rushTD',
  int: 'game.int',
  teamRank: 'game.teamRank',
  opponentRank: 'game.opponentRank',
  teamTurnovers: 'game.teamTurnovers',
  opponentTurnovers: 'game.opponentTurnovers',
  didPlay: 'player.didPlay',
});

const addFact = (map, key, value, source) => {
  const safeKey = normalizeKey(key);
  if (!safeKey || value === undefined || value === null || value === '') return;
  if (map.has(safeKey)) return;
  map.set(safeKey, { key: safeKey, value, source });
};

export const collectNewsroomImageFacts = ({ state = {}, issue = {}, verifiedFacts = [] } = {}) => {
  const publicationId = issue.publicationId || issue.id || '';
  const facts = new Map();

  (Array.isArray(verifiedFacts) ? verifiedFacts : []).forEach((fact) => {
    if (fact?.verified === false) return;
    addFact(facts, fact?.key, fact?.value, 'verified-payload');
  });

  (state.factLedger || [])
    .filter((fact) => fact?.verified === true && matchesPublication(fact, publicationId))
    .forEach((fact) => addFact(facts, fact.key, fact.value, 'fact-ledger'));

  const publishedUpdate = [...(state.weeklyUpdates || [])].reverse().find((entry) => (
    entry?.status === 'published' && matchesPublication(entry, publicationId)
  ));
  if (publishedUpdate?.game) {
    Object.entries(WEEKLY_GAME_FACTS).forEach(([field, key]) => addFact(facts, key, publishedUpdate.game[field], 'published-week'));
  }

  return [...facts.values()];
};

const factMapFrom = (facts) => new Map((facts || []).map((fact) => [fact.key, fact]));
const factValue = (factsByKey, key) => factsByKey.get(key)?.value;
const hasFact = (factsByKey, key) => factsByKey.has(key);
const numericFact = (factsByKey, key) => {
  const value = factValue(factsByKey, key);
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const booleanFact = (factsByKey, key) => {
  const value = factValue(factsByKey, key);
  if (value === true || value === false) return value;
  const normalized = clean(value, 20).toLowerCase();
  if (['true', 'yes', '1', 'played', 'appearance'].includes(normalized)) return true;
  if (['false', 'no', '0', 'did not play', 'no appearance'].includes(normalized)) return false;
  return null;
};

const RIVALRY_KEYS = ['game.rivalry', 'game.isRivalry', 'program.rivalry', 'weekly.rivalry'];
const verifiedRivalry = (factsByKey) => RIVALRY_KEYS.some((key) => {
  if (!hasFact(factsByKey, key)) return false;
  const value = factValue(factsByKey, key);
  if (value === true || Number(value) === 1) return true;
  return /rival|yes|true/i.test(clean(value, 120));
});

const normalizeThrowingHand = (value) => {
  const normalized = clean(value, 20).toLowerCase();
  if (normalized.startsWith('l')) return 'left';
  if (normalized.startsWith('r')) return 'right';
  return '';
};

const subjectFor = ({ state, article, didPlay }) => {
  const careerPhase = clean(state.careerPhase, 40).toUpperCase();
  if (['OC', 'HC'].includes(careerPhase) || /coach/i.test(clean(article.subjectPriority, 80))) return 'coach';
  if (article.playerMentionPolicy === 'omit') return 'team';
  if (didPlay === false) return 'player';
  if (['program-first', 'season-first', 'game-first'].includes(article.subjectPriority)) return 'team';
  return 'player';
};

const isRecruitingContext = ({ issue, article, factsByKey }) => {
  if (/recruit/i.test(clean(issue.editionType, 100))) return true;
  if (/recruit/i.test(`${clean(article.storyType, 100)} ${clean(article.storyFormat, 100)} ${clean(article.desk, 100)}`)) return true;
  return [...factsByKey.keys()].some((key) => key.startsWith('recruiting.'));
};

const isPracticeContext = ({ issue, article, factsByKey }) => {
  const phaseText = `${clean(issue.weekPhase, 100)} ${clean(issue.weekType, 100)}`;
  const articleText = `${clean(article.storyType, 120)} ${clean(article.headline, 300)} ${clean(article.dek, 500)}`;
  const verifiedRole = hasFact(factsByKey, 'player.roleChange') || hasFact(factsByKey, 'rtg.rank');
  return verifiedRole && (/camp|practice|preseason/i.test(phaseText) || /depth chart|practice|camp|role/i.test(articleText));
};

const performanceAvailable = (factsByKey) => [
  'game.passYds', 'game.passTD', 'game.rushYds', 'game.rushTD', 'game.int',
].some((key) => hasFact(factsByKey, key));

const candidate = (preset, score, evidence = []) => ({ preset, score, evidence: [...new Set(evidence.filter(Boolean))] });

const autoCandidates = ({ state, issue, article, factsByKey, subject, positionKey, didPlay }) => {
  const result = clean(factValue(factsByKey, 'game.result'), 10).toUpperCase();
  const opponentRank = numericFact(factsByKey, 'game.opponentRank');
  const passYds = numericFact(factsByKey, 'game.passYds');
  const passTD = numericFact(factsByKey, 'game.passTD');
  const rushYds = numericFact(factsByKey, 'game.rushYds');
  const rushTD = numericFact(factsByKey, 'game.rushTD');
  const interceptions = numericFact(factsByKey, 'game.int');
  const teamTurnovers = numericFact(factsByKey, 'game.teamTurnovers');
  const rivalry = verifiedRivalry(factsByKey);
  const recruiting = isRecruitingContext({ issue, article, factsByKey });
  const practice = isPracticeContext({ issue, article, factsByKey });
  const importance = clean(article.storyImportance, 50).toLowerCase();
  const storyText = `${clean(article.storyType, 100)} ${clean(article.storyFormat, 100)} ${clean(article.headline, 300)}`;
  const archetype = clean(state.player?.archetype, 100).toLowerCase();
  const candidates = [];

  if (recruiting) {
    const recruitingEvidence = [...factsByKey.keys()].filter((key) => key.startsWith('recruiting.')).slice(0, 5);
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.RECRUITING_PROFILE, 110, recruitingEvidence));
  }

  if (subject === 'player' && didPlay === false) {
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.SIDELINE_WAITING, 105, [
      'player.didPlay',
      hasFact(factsByKey, 'rtg.rank') ? 'rtg.rank' : '',
      hasFact(factsByKey, 'game.result') ? 'game.result' : '',
    ]));
  }

  if (rivalry) {
    const rivalryKey = RIVALRY_KEYS.find((key) => hasFact(factsByKey, key));
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME, 90, [
      rivalryKey,
      hasFact(factsByKey, 'game.opponent') ? 'game.opponent' : '',
      hasFact(factsByKey, 'game.result') ? 'game.result' : '',
    ]));
  }

  if (result === 'W') {
    const rankedWin = opponentRank !== null && opponentRank >= 1 && opponentRank <= 25;
    const majorWin = ['major', 'career-defining'].includes(importance);
    if (rankedWin || majorWin) {
      candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN, rankedWin ? 130 : 82, [
        'game.result',
        rankedWin ? 'game.opponentRank' : '',
        hasFact(factsByKey, 'game.opponent') ? 'game.opponent' : '',
      ]));
    }
  }

  if (result === 'L') {
    let score = 72;
    const evidence = ['game.result'];
    if (teamTurnovers !== null && teamTurnovers >= 2) {
      score += 12;
      evidence.push('game.teamTurnovers');
    }
    if (interceptions !== null && interceptions >= 2) {
      score += 10;
      evidence.push('game.int');
    }
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE, score, evidence));
  }

  if (practice) {
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.FALL_CAMP_PRACTICE, 86, [
      hasFact(factsByKey, 'player.roleChange') ? 'player.roleChange' : '',
      hasFact(factsByKey, 'rtg.rank') ? 'rtg.rank' : '',
    ]));
  }

  if (subject === 'player' && positionKey === 'QB' && didPlay !== false) {
    if (passYds !== null || passTD !== null) {
      let score = 52;
      const evidence = [];
      if (passYds !== null) {
        evidence.push('game.passYds');
        score += passYds >= 300 ? 30 : passYds >= 250 ? 20 : passYds >= 200 ? 12 : 4;
      }
      if (passTD !== null) {
        evidence.push('game.passTD');
        score += passTD >= 3 ? 20 : passTD >= 2 ? 15 : passTD >= 1 ? 7 : 0;
      }
      candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION, score, evidence));
    }

    if (rushYds !== null || rushTD !== null) {
      let score = 45;
      const evidence = [];
      if (rushYds !== null) {
        evidence.push('game.rushYds');
        score += rushYds >= 75 ? 35 : rushYds >= 50 ? 25 : rushYds >= 30 ? 14 : 3;
      }
      if (rushTD !== null) {
        evidence.push('game.rushTD');
        score += rushTD >= 2 ? 20 : rushTD >= 1 ? 12 : 0;
      }
      if (/dual|scrambl|mobile/.test(archetype)) score += 6;
      candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.DUAL_THREAT_SCRAMBLE, score, evidence));
    }
  }

  if (subject === 'player' && performanceAvailable(factsByKey) && (/feature|profile|spotlight|breakout/i.test(storyText))) {
    const totalYards = Math.max(0, passYds || 0) + Math.max(0, rushYds || 0);
    const totalTd = Math.max(0, passTD || 0) + Math.max(0, rushTD || 0);
    const productionBoost = totalYards >= 300 || totalTd >= 3 ? 18 : totalYards >= 200 || totalTd >= 2 ? 10 : 3;
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.BREAKOUT_PLAYER_FEATURE, 65 + productionBoost, [
      passYds !== null ? 'game.passYds' : '',
      passTD !== null ? 'game.passTD' : '',
      rushYds !== null ? 'game.rushYds' : '',
      rushTD !== null ? 'game.rushTD' : '',
      hasFact(factsByKey, 'player.firstAppearance') ? 'player.firstAppearance' : '',
    ]));
  }

  const hasGameContext = hasFact(factsByKey, 'game.result') || hasFact(factsByKey, 'game.opponent');
  if (hasGameContext && didPlay !== false) {
    candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.PREGAME_TUNNEL, 34, [
      hasFact(factsByKey, 'game.opponent') ? 'game.opponent' : '',
      hasFact(factsByKey, 'game.result') ? 'game.result' : '',
    ]));
  }

  candidates.push(candidate(NEWSROOM_IMAGE_PRESETS.PLAYER_PROFILE_MEDIA, subject === 'player' ? 25 : 18, (
    article.citedFactKeys || []
  ).filter((key) => hasFact(factsByKey, key)).slice(0, 4)));

  return candidates.sort((a, b) => b.score - a.score);
};

const OVERRIDE_TO_PRESET = Object.freeze({
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.POCKET_ACTION]: NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.SCRAMBLE]: NEWSROOM_IMAGE_PRESETS.DUAL_THREAT_SCRAMBLE,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.CELEBRATION]: NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.SIDELINE]: NEWSROOM_IMAGE_PRESETS.SIDELINE_WAITING,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.PORTRAIT]: NEWSROOM_IMAGE_PRESETS.PLAYER_PROFILE_MEDIA,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.TUNNEL]: NEWSROOM_IMAGE_PRESETS.PREGAME_TUNNEL,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.PRACTICE]: NEWSROOM_IMAGE_PRESETS.FALL_CAMP_PRACTICE,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.TOUGH_LOSS]: NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.RIVALRY]: NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME,
  [NEWSROOM_IMAGE_SCENE_OVERRIDES.RECRUITING]: NEWSROOM_IMAGE_PRESETS.RECRUITING_PROFILE,
});

const overrideEligibility = ({ preset, factsByKey, subject, positionKey, didPlay, issue, article }) => {
  const result = clean(factValue(factsByKey, 'game.result'), 10).toUpperCase();
  if (preset === NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN && result !== 'W') return 'A celebration/signature-win scene requires a verified win.';
  if (preset === NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE && result !== 'L') return 'A tough-loss scene requires a verified loss.';
  if (preset === NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME && !verifiedRivalry(factsByKey)) return 'A rivalry scene requires a verified rivalry fact.';
  if (preset === NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION && (subject !== 'player' || positionKey !== 'QB' || didPlay === false || (!hasFact(factsByKey, 'game.passYds') && !hasFact(factsByKey, 'game.passTD') && didPlay !== true))) return 'Pocket action requires a verified quarterback appearance or passing production.';
  if (preset === NEWSROOM_IMAGE_PRESETS.DUAL_THREAT_SCRAMBLE && (subject !== 'player' || positionKey !== 'QB' || didPlay === false || (!hasFact(factsByKey, 'game.rushYds') && !hasFact(factsByKey, 'game.rushTD')))) return 'A scramble scene requires verified quarterback rushing production.';
  if (preset === NEWSROOM_IMAGE_PRESETS.FALL_CAMP_PRACTICE && !isPracticeContext({ issue, article, factsByKey })) return 'A practice scene requires verified role/depth context plus a practice, camp, or depth-chart story.';
  if (preset === NEWSROOM_IMAGE_PRESETS.RECRUITING_PROFILE && !isRecruitingContext({ issue, article, factsByKey })) return 'A recruiting scene requires verified recruiting context.';
  return '';
};

const reasonFor = ({ preset, factsByKey }) => {
  const passYds = numericFact(factsByKey, 'game.passYds');
  const passTD = numericFact(factsByKey, 'game.passTD');
  const rushYds = numericFact(factsByKey, 'game.rushYds');
  const rushTD = numericFact(factsByKey, 'game.rushTD');
  const opponent = clean(factValue(factsByKey, 'game.opponent'), 120);
  const opponentRank = numericFact(factsByKey, 'game.opponentRank');
  const turnovers = numericFact(factsByKey, 'game.teamTurnovers');
  const role = clean(factValue(factsByKey, 'rtg.rank') || factValue(factsByKey, 'player.roleChange'), 120);

  if (preset === NEWSROOM_IMAGE_PRESETS.SIDELINE_WAITING) return `Verified weekly facts show no statistical appearance${role ? ` while the player is listed as ${role}` : ''}.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.POSTGAME_SIGNATURE_WIN) return `Verified result is a win${opponent ? ` over ${opponent}` : ''}${opponentRank ? `, a No. ${opponentRank} opponent` : ''}.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.TOUGH_LOSS_REFLECTIVE) return `Verified result is a loss${turnovers !== null ? ` with ${turnovers} team turnover${turnovers === 1 ? '' : 's'} recorded` : ''}.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.QB_POCKET_ACTION) return `Verified passing production${passYds !== null ? ` includes ${passYds} yards` : ''}${passTD !== null ? ` and ${passTD} passing touchdown${passTD === 1 ? '' : 's'}` : ''}.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.DUAL_THREAT_SCRAMBLE) return `Verified quarterback rushing production${rushYds !== null ? ` includes ${rushYds} yards` : ''}${rushTD !== null ? ` and ${rushTD} rushing touchdown${rushTD === 1 ? '' : 's'}` : ''}.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.RIVALRY_GAME) return `A verified rivalry fact supports rivalry-game treatment${opponent ? ` against ${opponent}` : ''}.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.FALL_CAMP_PRACTICE) return `Verified role or depth-chart context${role ? ` (${role})` : ''} supports a development/practice scene.`;
  if (preset === NEWSROOM_IMAGE_PRESETS.RECRUITING_PROFILE) return 'Verified recruiting context supports a recruiting/profile image rather than invented game action.';
  if (preset === NEWSROOM_IMAGE_PRESETS.BREAKOUT_PLAYER_FEATURE) return 'Verified player production supports an editorial breakout feature.';
  if (preset === NEWSROOM_IMAGE_PRESETS.PREGAME_TUNNEL) return `Verified game context${opponent ? ` against ${opponent}` : ''} supports a neutral pregame scene without inventing a play.`;
  return 'The verified article supports a neutral editorial player or team feature without inventing a game event.';
};

const verifiedDetailsFor = (factsByKey) => {
  const mapping = {
    opponent: 'game.opponent',
    result: 'game.result',
    homeScore: 'game.homeScore',
    awayScore: 'game.awayScore',
    teamRank: 'game.teamRank',
    opponentRank: 'game.opponentRank',
    didPlay: 'player.didPlay',
    passYds: 'game.passYds',
    passTD: 'game.passTD',
    rushYds: 'game.rushYds',
    rushTD: 'game.rushTD',
    interceptions: 'game.int',
    teamTurnovers: 'game.teamTurnovers',
    opponentTurnovers: 'game.opponentTurnovers',
    roleChange: 'player.roleChange',
    depthRank: 'rtg.rank',
  };
  const details = {};
  Object.entries(mapping).forEach(([name, key]) => {
    if (hasFact(factsByKey, key)) details[name] = factValue(factsByKey, key);
  });
  if (verifiedRivalry(factsByKey)) details.rivalry = true;
  return details;
};

const forbiddenDetailsFor = (factsByKey) => {
  const forbidden = [
    'rendered statistics, scoreboards used as text overlays, headlines, captions, watermarks, or graphic overlays',
    'an exact touchdown sequence or exact play result unless a separately verified play-by-play fact explicitly supports it',
  ];
  if (!hasFact(factsByKey, 'game.opponent')) forbidden.push('specific opponent identity or opponent branding');
  if (!(hasFact(factsByKey, 'game.homeScore') && hasFact(factsByKey, 'game.awayScore'))) forbidden.push('specific final score');
  if (!(hasFact(factsByKey, 'game.teamRank') || hasFact(factsByKey, 'game.opponentRank'))) forbidden.push('specific ranking');
  if (![...factsByKey.keys()].some((key) => key.startsWith('injury.'))) forbidden.push('specific injury or medical condition');
  if (![...factsByKey.keys()].some((key) => key === 'game.venue' || key.startsWith('venue.'))) forbidden.push('specific stadium or venue');
  if (![...factsByKey.keys()].some((key) => key === 'game.weather' || key.startsWith('weather.'))) forbidden.push('specific weather condition');
  if (![...factsByKey.keys()].some((key) => key.startsWith('award.') || key.startsWith('milestone.award'))) forbidden.push('specific award or trophy');
  return forbidden;
};

const throwingHandConstraintsFor = (throwingHand, positionKey) => {
  if (positionKey !== 'QB' || !throwingHand) return [];
  const hand = throwingHand.toUpperCase();
  return [
    `The quarterback is ${hand}-HANDED and must throw with the ${throwingHand} arm.`,
    `Preserve ${throwingHand}-hand quarterback mechanics exactly; do not mirror the throwing motion.`,
    `Final handedness check: football release, lead shoulder, and body orientation must remain consistent with a ${hand}-HANDED quarterback.`,
  ];
};

export const directNewsroomImage = ({
  state = {},
  issue = {},
  article = {},
  verifiedFacts = [],
  sceneOverride = NEWSROOM_IMAGE_SCENE_OVERRIDES.AUTO,
} = {}) => {
  if (!issue || !article) throw new Error('An issue and article are required for editorial photo direction.');
  const facts = collectNewsroomImageFacts({ state, issue, verifiedFacts });
  const factsByKey = factMapFrom(facts);
  const didPlay = booleanFact(factsByKey, 'player.didPlay');
  const subject = subjectFor({ state, article, didPlay });
  const position = clean(state.player?.pos || article.position, 40);
  const module = getNewsroomPositionModule(position, subject);
  const candidates = autoCandidates({ state, issue, article, factsByKey, subject, positionKey: module.key, didPlay });
  const autoChoice = candidates[0];

  const normalizedOverride = clean(sceneOverride, 40).toLowerCase() || NEWSROOM_IMAGE_SCENE_OVERRIDES.AUTO;
  const requestedPreset = OVERRIDE_TO_PRESET[normalizedOverride] || null;
  let selected = autoChoice;
  let overrideApplied = false;
  let overrideRejectedReason = '';

  if (requestedPreset) {
    overrideRejectedReason = overrideEligibility({
      preset: requestedPreset,
      factsByKey,
      subject,
      positionKey: module.key,
      didPlay,
      issue,
      article,
    });
    if (!overrideRejectedReason) {
      selected = candidate(requestedPreset, 1000, (article.citedFactKeys || []).filter((key) => hasFact(factsByKey, key)).slice(0, 6));
      overrideApplied = true;
    }
  }

  const meta = PRESET_META[selected?.preset] || PRESET_META[NEWSROOM_IMAGE_PRESETS.PLAYER_PROFILE_MEDIA];
  const throwingHand = normalizeThrowingHand(state.player?.visualProfile?.throwingHand || state.player?.throwingHand);
  const priorityFacts = selected?.evidence?.length
    ? selected.evidence
    : (article.citedFactKeys || []).filter((key) => hasFact(factsByKey, key)).slice(0, 6);

  return {
    preset: selected?.preset || NEWSROOM_IMAGE_PRESETS.PLAYER_PROFILE_MEDIA,
    presetLabel: meta.label,
    subject,
    position,
    positionModule: module.key,
    throwingHand,
    emotionalTone: meta.tone,
    scene: meta.scene,
    reason: overrideApplied ? `Manual scene override accepted because the verified facts support ${meta.label}.` : reasonFor({ preset: selected?.preset, factsByKey }),
    priorityFacts: [...new Set(priorityFacts)],
    verifiedDetails: verifiedDetailsFor(factsByKey),
    mechanics: module.mechanics,
    throwingHandConstraints: throwingHandConstraintsFor(throwingHand, module.key),
    styleDirectives: [...MASTER_EDITORIAL_PHOTO_STYLE],
    forbiddenDetails: forbiddenDetailsFor(factsByKey),
    sceneOverride: normalizedOverride,
    overrideApplied,
    overrideRejectedReason,
    candidateScores: candidates.slice(0, 5).map((entry) => ({ preset: entry.preset, score: entry.score })),
  };
};
