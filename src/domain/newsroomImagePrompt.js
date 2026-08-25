const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);

const boundedList = (values, maxItems = 12, maxLength = 500) => (
  (Array.isArray(values) ? values : [])
    .map((value) => clean(value, maxLength))
    .filter(Boolean)
    .slice(0, maxItems)
);

const verifiedContextLines = (details = {}) => {
  const mapping = [
    ['opponent', 'Opponent'],
    ['result', 'Result'],
    ['teamRank', 'Tracked team rank'],
    ['opponentRank', 'Opponent rank'],
    ['didPlay', 'Tracked player appeared'],
    ['passYds', 'Passing yards'],
    ['passTD', 'Passing touchdowns'],
    ['rushYds', 'Rushing yards'],
    ['rushTD', 'Rushing touchdowns'],
    ['interceptions', 'Interceptions'],
    ['teamTurnovers', 'Team turnovers'],
    ['opponentTurnovers', 'Opponent turnovers'],
    ['roleChange', 'Role change'],
    ['depthRank', 'Depth-chart rank'],
    ['rivalry', 'Verified rivalry'],
  ];
  return mapping
    .filter(([key]) => details[key] !== undefined && details[key] !== null && details[key] !== '')
    .map(([key, label]) => `${label}: ${clean(details[key], 160)}`);
};

const referenceLines = (references = []) => (
  (Array.isArray(references) ? references : [])
    .slice(0, 4)
    .map((entry, index) => (
      `Reference ${index + 1} — ${clean(entry?.roleLabel || entry?.role || 'General reference', 80)}: ${clean(entry?.instruction || 'Use only as a visual reference without copying its pose or background.', 520)}`
    ))
);

const teamIdentityLines = (identity, role = 'Primary team') => {
  if (!identity) return [];
  if (identity.primaryConference === 'Independent') {
    return [
      `${role} uniform identity: ${identity.team} is an FBS Independent in the resolved Dynasty context.`,
      `HARD UNIFORM RULE: do not add a conference patch to ${identity.team} jerseys.`,
    ];
  }
  const lines = [
    `${role} uniform identity: ${identity.team} = ${identity.primaryConference}.`,
    `REQUIRED conference patch: ${identity.conferencePatchVisual || identity.conferencePatchLabel}.`,
    identity.identitySource === 'save-override'
      ? `This is a DynastyHQ save-specific conference override and it supersedes real-world 2026 alignment${identity.realWorldConference ? ` (${identity.realWorldConference})` : ''}.`
      : 'This uses the real-world 2026 conference fallback because no save-specific override applies.',
    `If a visible ${identity.team} game jersey would show a conference patch, the resolved conference mark above is mandatory and no other conference mark may appear.`,
  ];
  if (identity.forbiddenLegacyPatches?.length) {
    lines.push(`Forbidden conference branding on ${identity.team}: ${identity.forbiddenLegacyPatches.join('; ')}.`);
  }
  return lines;
};

export const buildGroundedNewsroomImagePrompt = ({
  issue = {},
  article = {},
  generationContext = {},
  references = [],
} = {}) => {
  const director = generationContext.director || {};
  const visualDirectives = boundedList(generationContext.visualProfileDirectives, 14, 420);
  const mechanics = boundedList(director.mechanics, 8, 420);
  const handedness = boundedList(director.throwingHandConstraints, 4, 420);
  const style = boundedList(director.styleDirectives, 12, 420);
  const forbidden = boundedList(director.forbiddenDetails, 14, 520);
  const verified = verifiedContextLines(director.verifiedDetails || {});
  const refs = Array.isArray(references) ? references.slice(0, 4) : [];
  const subject = clean(director.subject || 'team', 40).toLowerCase();
  const playerContext = generationContext.playerContext || {};
  const conferenceContext = generationContext.conferenceContext || {};

  const lines = [
    'Create one photorealistic 3:2 editorial American-football photograph for DynastyHQ.',
    'This must look like a genuine professional sports photograph, not a video-game screenshot, illustration, poster, composite graphic, or promotional key art.',
    `Publication context: Season ${Math.max(1, Number(issue.season) || 1)}, Week ${Math.max(1, Number(issue.week) || 1)}. Outlet: ${clean(article.outletName, 120)}, ${clean(article.desk, 120)}.`,
    `Verified article headline: ${clean(article.headline, 400)}`,
    `Verified article summary: ${clean(article.dek, 800)}`,
    `Photo Director subject: ${subject}.`,
    director.presetLabel ? `Photo Director preset: ${clean(director.presetLabel, 120)}.` : '',
    director.scene ? `Required scene: ${clean(director.scene, 600)}.` : '',
    director.emotionalTone ? `Emotional tone: ${clean(director.emotionalTone, 240)}.` : '',
  ].filter(Boolean);

  const primaryIdentityLines = teamIdentityLines(conferenceContext.teamIdentity, 'Primary team');
  if (primaryIdentityLines.length) {
    lines.push('Resolved team/conference uniform identity — authoritative:');
    primaryIdentityLines.forEach((entry) => lines.push(`- ${entry}`));
  }
  const opponentIdentityLines = teamIdentityLines(conferenceContext.opponentIdentity, 'Opponent');
  if (opponentIdentityLines.length) opponentIdentityLines.forEach((entry) => lines.push(`- ${entry}`));

  if (subject === 'player') {
    const playerBits = [
      playerContext.position ? `position ${clean(playerContext.position, 40)}` : '',
      playerContext.jerseyNumber ? `jersey number ${clean(playerContext.jerseyNumber, 12)}` : '',
      playerContext.team ? `team ${clean(playerContext.team, 120)}` : '',
    ].filter(Boolean);
    if (playerBits.length) lines.push(`Tracked fictional player context: ${playerBits.join(', ')}.`);
    if (visualDirectives.length) {
      lines.push('Permanent Visual Player Profile — preserve these durable details exactly when they are visible:');
      visualDirectives.forEach((entry) => lines.push(`- ${entry}`));
      lines.push('Do not add a distinctive accessory that contradicts the Visual Player Profile. Leave unspecified durable equipment ordinary and unobtrusive.');
    }
  } else if (subject === 'team') {
    lines.push('This is a team/program-first image. Do not force the tracked player into the frame and do not use a face/identity reference to make that player the central subject.');
  } else if (subject === 'coach') {
    lines.push('This is a coach-first image. Do not force the tracked player into the frame.');
  }

  if (verified.length) {
    lines.push('Verified context may guide the scene and emotion, but must never appear as rendered statistics or scoreboard text:');
    verified.forEach((entry) => lines.push(`- ${entry}`));
  }

  if (refs.length) {
    lines.push('Approved typed references — each image has one specific job. Preserve only the assigned visual information and create a new pose, composition, camera angle, and background:');
    referenceLines(refs).forEach((entry) => lines.push(`- ${entry}`));
    lines.push('When references conflict, a specific typed reference beats a General reference, and an explicit Visual Player Profile field beats an incidental detail in a reference image.');
  } else if (subject === 'player') {
    lines.push('No approved identity image is available. Depict a fictional athlete consistent with the supplied Visual Player Profile; do not attempt to recreate a real person.');
  }

  if (mechanics.length || handedness.length) {
    lines.push('Football mechanics and anatomy requirements:');
    [...mechanics, ...handedness].forEach((entry) => lines.push(`- ${entry}`));
  }

  if (style.length) {
    lines.push('Professional photo style requirements:');
    style.forEach((entry) => lines.push(`- ${entry}`));
  }

  lines.push('Grounding rules: depict only a generalized scene supported by the verified context. Do not invent an exact touchdown, exact pass result, exact run result, injury, award ceremony, confrontation, or other specific event that was not separately verified.');
  lines.push('Uniform authenticity is mandatory: use the resolved school identity and conference patch above, with realistic jersey numbers and team text where visible. A wrong or legacy conference patch is a failed image.');
  lines.push('Do not render headlines, captions, scoreboards, statistics, watermarks, or unrelated signage in the image.');
  lines.push('Do not copy any reference photo background, pose, facial expression, crop, or camera angle. References exist to preserve identity, build, uniform, helmet, equipment, or team style only according to their assigned roles.');

  if (forbidden.length) {
    lines.push('Explicitly forbidden unless the verified Photo Director context supports it:');
    forbidden.forEach((entry) => lines.push(`- ${entry}`));
  }

  lines.push('Final quality check: realistic human anatomy and hands, realistic football equipment, believable player spacing, physically plausible action, professional sports-photo composition, natural lighting, restrained photographic color grading, and the correct resolved team/conference uniform identity.');
  return lines.join('\n');
};
