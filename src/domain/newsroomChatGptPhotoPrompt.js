import { getCollegeFootballTeamIdentity } from './collegeFootballTeamIdentity.js';

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
  const teamIdentity = getCollegeFootballTeamIdentity(team);
  const position = clean(director.position || playerContext.position, 40);
  const verified = verifiedContextLines(director.verifiedDetails || {});
  const mechanics = boundedList(director.mechanics, 8, 420);
  const style = boundedList(director.styleDirectives, 12, 420);
  const forbidden = boundedList(director.forbiddenDetails, 14, 520);

  const lines = [
    'Create 4 distinct photorealistic editorial college-football photographs that could realistically accompany the fictional sports-news article below.',
    'Use the verified article information only to understand the game, teams, storyline, result, setting, and football situation.',
    'Do not attempt to recreate or reference a pre-existing created-player appearance, player-profile image, face, hairstyle, body type, personalized jersey number, accessories, throwing hand, equipment personalization, or other character-specific visual details.',
    'Players should look like believable anonymous college football athletes appropriate for their positions and teams. A player name appearing in article text is story context only and must not be treated as a likeness instruction.',
    '',
    'Verified Story Context',
    `Season ${Math.max(1, Number(issue.season) || 1)}, Week ${Math.max(1, Number(issue.week) || 1)}.`,
    article.outletName || article.desk ? `Publication: ${[clean(article.outletName, 120), clean(article.desk, 120)].filter(Boolean).join(' — ')}.` : '',
    `Verified article headline: ${clean(article.headline, 400)}`,
    `Verified article summary: ${clean(article.dek, 800)}`,
    team ? `Team/program: ${team}.` : '',
    teamIdentity ? `Current 2026 football conference: ${teamIdentity.conference}.` : '',
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
  lines.push('MANDATORY UNIFORM AUTHENTICITY: visible football jerseys must include clear, believable jersey numbers in the normal real-world locations. Do not leave visible jerseys blank or numberless. Use realistic numbers appropriate to the players and positions, but do not copy a personalized DynastyHQ player number unless that number is independently verified by the story context.');
  lines.push('MANDATORY BACK NAMEPLATES: whenever the back of a jersey is visible enough to read, include a properly placed, legible surname/nameplate above the number in the style a real college uniform would use. If the verified story provides a player surname, that surname may be used as text without attempting to match the player\'s likeness. Otherwise use a plausible generic surname rather than leaving the nameplate blank.');
  lines.push(team
    ? `MANDATORY FRONT TEAM TEXT: whenever the front of a ${team} jersey is visible enough to read, render the authentic real-world team/program wordmark or jersey-front text normally used by ${team} for that uniform style. Spell it correctly, place it naturally, and make it look sewn/printed into the uniform rather than like an overlay.`
    : 'MANDATORY FRONT TEAM TEXT: whenever the front of a team jersey is visible enough to read, include the authentic real-world team/program wordmark or jersey-front text appropriate to that team and uniform style. Spell it correctly, place it naturally, and make it look sewn/printed into the uniform rather than like an overlay.');

  if (teamIdentity?.conference === 'Independent') {
    lines.push(`MANDATORY CONFERENCE ACCURACY: ${teamIdentity.team} is an FBS independent for the 2026 season. Do not invent or add a conference jersey patch.`);
  } else if (teamIdentity?.conferencePatch) {
    lines.push(`MANDATORY CONFERENCE PATCH: ${teamIdentity.team} is a ${teamIdentity.conference} football member for the 2026 season. Any visible standard game jersey must use the current ${teamIdentity.conferencePatch} conference patch/mark in the realistic jersey location, scale, orientation, and color treatment. Do not substitute an older or unrelated conference patch.`);
    if (teamIdentity.legacyConferenceMarks?.length) {
      lines.push(`OUTDATED PATCHES FORBIDDEN FOR ${teamIdentity.team.toUpperCase()}: do not use ${teamIdentity.legacyConferenceMarks.join(', ')} conference branding. The current ${teamIdentity.conferencePatch} patch/mark is authoritative.`);
    }
  } else if (team) {
    lines.push(`CONFERENCE ACCURACY: if ${team} is shown in a standard college game uniform with a conference patch, use only the team\'s current real-world 2026 football conference mark. Never guess from an older conference affiliation.`);
  }

  lines.push('Uniform lettering, numbers, nameplates, trim, colors, logos, conference patch placement, and proportions should look like real college-football equipment. Do not invent fake school names, fake conference marks, or misspell team identifiers.');
  lines.push('Avoid cinematic fantasy effects, promotional-poster composition, video-game-render appearance, exaggerated HDR, artificial text overlays, or overly staged poses.');
  lines.push('Accuracy rules: depict only events supported by the verified article context. Do not invent touchdowns, celebrations, trophies, injuries, weather, scores, opponents, stadium features, or outcomes that contradict the supplied information. If a non-uniform visual detail is unknown, keep it generic rather than inventing it.');
  lines.push('Do not render headlines, captions, scoreboards, statistics, watermarks, or unrelated signage. Readable jersey numbers, back nameplates, authentic jersey-front team text, and the correct conference patch are required uniform details and are the exception to this no-overlay/no-extra-text rule.');
  lines.push('Do not reproduce the likeness of a real athlete or attempt to match a previously created DynastyHQ player. The goal is an authentic fictional editorial sports photograph, not a portrait of a specific created player.');

  if (forbidden.length) {
    lines.push('Explicitly forbidden unless the verified Photo Director context supports it:');
    forbidden.forEach((entry) => lines.push(`- ${entry}`));
  }

  lines.push('Final quality check: realistic human anatomy and hands, realistic football equipment, believable player spacing, physically plausible action, professional sports-photo composition, natural lighting, restrained photographic color grading, accurate readable uniform numbers/nameplates/team text wherever visible, and the correct current conference patch/mark for the team.');
  return lines.join('\n');
};
