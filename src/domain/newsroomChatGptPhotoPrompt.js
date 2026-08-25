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
    ['didPlay', 'Featured player appeared'],
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

export const buildGeneralChatGptNewsroomPhotoPrompt = ({
  issue = {},
  article = {},
  generationContext = {},
} = {}) => {
  const director = generationContext.director || {};
  const playerContext = generationContext.playerContext || {};
  const subject = clean(director.subject || 'team', 40).toLowerCase();
  const team = clean(playerContext.team, 120);
  const position = clean(director.position || playerContext.position, 40);
  const verified = verifiedContextLines(director.verifiedDetails || {});
  const mechanics = boundedList(director.mechanics, 8, 420);
  const style = boundedList(director.styleDirectives, 12, 420);
  const forbidden = boundedList(director.forbiddenDetails, 14, 520);

  const lines = [
    'Create 4 distinct photorealistic editorial college-football photographs that could realistically accompany the fictional sports-news article below.',
    'Use the verified article information only to understand the game, teams, storyline, result, setting, and football situation.',
    'Do not attempt to recreate or reference a pre-existing created-player appearance, player-profile image, face, hairstyle, body type, jersey number, accessories, throwing hand, equipment personalization, or other character-specific visual details.',
    'Players should look like believable anonymous college football athletes appropriate for their positions and teams. A player name appearing in article text is story context only and must not be treated as a likeness instruction.',
    '',
    'Verified Story Context',
    `Season ${Math.max(1, Number(issue.season) || 1)}, Week ${Math.max(1, Number(issue.week) || 1)}.`,
    article.outletName || article.desk ? `Publication: ${[clean(article.outletName, 120), clean(article.desk, 120)].filter(Boolean).join(' — ')}.` : '',
    `Verified article headline: ${clean(article.headline, 400)}`,
    `Verified article summary: ${clean(article.dek, 800)}`,
    team ? `Team/program: ${team}.` : '',
    subject === 'player' && position
      ? `Generic featured subject: an anonymous ${position} for ${team || 'the featured team'}.`
      : subject === 'coach'
        ? `Generic featured subject: an anonymous coach for ${team || 'the featured program'}.`
        : 'Generic featured subject: the team/program or football scene rather than a personalized created player.',
    '',
    'Selected Editorial Scene',
    director.presetLabel ? `Director preset: ${clean(director.presetLabel, 120)}.` : '',
    director.scene ? `Required scene: ${clean(director.scene, 600)}.` : '',
    '',
    'Photo Direction',
    director.reason ? `Director rationale: ${clean(director.reason, 520)}.` : '',
    director.emotionalTone ? `Emotional tone: ${clean(director.emotionalTone, 240)}.` : '',
  ].filter(Boolean);

  if (verified.length) {
    lines.push('Verified context may guide the action and emotion but must never appear as rendered statistics or scoreboard text:');
    verified.forEach((entry) => lines.push(`- ${entry}`));
  }

  if (mechanics.length) {
    lines.push('Football action and anatomy requirements:');
    mechanics.forEach((entry) => lines.push(`- ${entry}`));
  }

  if (style.length) {
    lines.push('Professional photo style requirements:');
    style.forEach((entry) => lines.push(`- ${entry}`));
  }

  lines.push('Create four noticeably different professional sports-photography interpretations of the supported scene. Vary camera position, moment, framing, lens feel, player arrangement, and background action while remaining consistent with the verified events.');
  lines.push('Use realistic college-football uniforms and equipment, authentic stadium lighting, natural player anatomy and body language, believable sideline/crowd/field detail, realistic depth of field and telephoto compression, photographic motion blur where appropriate, natural fabric and equipment wear, and composition suitable for a major sports publication.');
  lines.push('Use believable uniform colors appropriate to the named program when that identity is known from the story context. Keep uncertain logos, jersey text, signage, and stadium-specific details visually generic rather than inventing them.');
  lines.push('Avoid cinematic fantasy effects, promotional-poster composition, video-game-render appearance, exaggerated HDR, artificial text overlays, or overly staged poses.');
  lines.push('Accuracy rules: depict only events supported by the verified article context. Do not invent touchdowns, celebrations, trophies, injuries, weather, scores, opponents, uniforms, stadium features, or outcomes that contradict the supplied information. If a specific visual detail is unknown, keep it generic rather than inventing it.');
  lines.push('Do not render headlines, captions, scoreboards, statistics, watermarks, jersey-name text, signage, or other readable text in the image.');
  lines.push('Do not reproduce the likeness of a real athlete or attempt to match a previously created DynastyHQ player. The goal is an authentic fictional editorial sports photograph, not a portrait of a specific created player.');

  if (forbidden.length) {
    lines.push('Explicitly forbidden unless the verified Photo Director context supports it:');
    forbidden.forEach((entry) => lines.push(`- ${entry}`));
  }

  lines.push('Final quality check: realistic human anatomy and hands, realistic football equipment, believable player spacing, physically plausible action, professional sports-photo composition, natural lighting, and restrained photographic color grading.');
  return lines.join('\n');
};
