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

const conferencePatchRules = (identity, roleLabel = 'Team') => {
  if (!identity) return [];
  const label = clean(roleLabel, 80) || 'Team';

  if (identity.primaryConference === 'Independent') {
    return [
      `${label.toUpperCase()} CONFERENCE IDENTITY — AUTHORITATIVE 2026 DATA`,
      `- Team: ${identity.team}.`,
      '- Football status: FBS Independent.',
      '- HARD RULE: do not add any conference jersey patch to this team.',
    ];
  }

  const rules = [
    `${label.toUpperCase()} CONFERENCE IDENTITY — AUTHORITATIVE 2026 DATA`,
    `- Team: ${identity.team}.`,
    `- Primary football conference: ${identity.primaryConference}.`,
    `- REQUIRED jersey conference patch: ${identity.conferencePatchLabel}.`,
    `- EXACT VISUAL TARGET: ${identity.conferencePatchVisual}.`,
    `- HARD RULE: whenever a conference-patch area on a visible ${identity.team} game jersey can be seen, it MUST show ${identity.conferencePatchVisual}. Do not approximate the conference mark and do not substitute a different conference logo.`,
  ];

  if (identity.forbiddenLegacyPatches?.length) {
    rules.push(`- FORBIDDEN LEGACY PATCHES: ${identity.forbiddenLegacyPatches.join('; ')}. None of these may appear on ${identity.team} uniforms.`);
  }

  rules.push(`- PATCH VALIDATION: before finalizing each image, inspect every visible ${identity.team} jersey. If its conference mark is missing where the real uniform would show one, belongs to another conference, resembles a forbidden legacy patch, or is visually incorrect, correct the uniform before returning the image.`);
  rules.push(`- If the conference patch cannot be rendered accurately at the chosen angle or distance, change the framing/angle so the patch is not falsely readable rather than displaying the wrong conference identity.`);
  return rules;
};

export const buildGeneralChatGptNewsroomPhotoPrompt = ({
  issue = {},
  article = {},
  generationContext = {},
} = {}) => {
  const director = generationContext.director || {};
  const playerContext = generationContext.playerContext || {};
  const verifiedDetails = director.verifiedDetails || {};
  const subject = clean(director.subject || 'team', 40).toLowerCase();
  const team = clean(playerContext.team, 120);
  const opponent = clean(verifiedDetails.opponent, 120);
  const teamIdentity = getCollegeFootballTeamIdentity(team);
  const opponentIdentity = opponent && opponent.toLowerCase() !== team.toLowerCase()
    ? getCollegeFootballTeamIdentity(opponent)
    : null;
  const position = clean(director.position || playerContext.position, 40);
  const verified = verifiedContextLines(verifiedDetails);
  const mechanics = boundedList(director.mechanics, 8, 420);
  const style = boundedList(director.styleDirectives, 12, 420);
  const forbidden = boundedList(director.forbiddenDetails, 14, 520);

  const lines = [
    'Create 4 distinct photorealistic editorial college-football photographs that could realistically accompany the fictional sports-news article below.',
    'Use the verified article information only to understand the game, teams, storyline, result, setting, and football situation.',
    'Do not attempt to recreate or reference a pre-existing created-player appearance, player-profile image, face, hairstyle, body type, personalized jersey number, accessories, throwing hand, equipment personalization, or other character-specific visual details.',
    'Players should look like believable anonymous college football athletes appropriate for their positions and teams. A player name appearing in article text is story context only and must not be treated as a likeness instruction.',
    'TEAM AND CONFERENCE UNIFORM DATA PROVIDED BELOW IS AUTHORITATIVE. Do not override it from memory, prior seasons, historical affiliations, or visual associations with an older conference.',
    '',
    'Verified Story Context',
    `Dynasty season ${Math.max(1, Number(issue.season) || 1)}, Week ${Math.max(1, Number(issue.week) || 1)}.`,
    'Real-world uniform/conference metadata basis: 2026 college football alignment.',
    article.outletName || article.desk ? `Publication: ${[clean(article.outletName, 120), clean(article.desk, 120)].filter(Boolean).join(' — ')}.` : '',
    `Verified article headline: ${clean(article.headline, 400)}`,
    `Verified article summary: ${clean(article.dek, 800)}`,
    team ? `Team/program: ${team}.` : '',
    teamIdentity ? `Authoritative 2026 conference: ${teamIdentity.primaryConference}.` : '',
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

  lines.push('', 'Uniform Authenticity Requirements', 'UNIFORM AUTHENTICITY IS MANDATORY.');
  lines.push(`- Use authentic real-world ${team || 'team'} football uniform identity appropriate to the scene.`);
  lines.push('- Jersey numbers are mandatory anywhere a jersey is visibly shown. Do not leave game jerseys blank or numberless.');
  lines.push('- If the back of a jersey is visible enough to read, include a properly placed realistic last-name nameplate above the number.');
  lines.push(team
    ? `- If the front of a ${team} jersey is visible enough to read, use the authentic team/program wordmark or jersey-front text that belongs on that real uniform style. Spell it correctly and integrate it naturally into the fabric.`
    : '- If the front of a team jersey is visible enough to read, use the authentic team/program wordmark or jersey-front text that belongs on that real uniform style.');
  lines.push('- Numbers, nameplates, team text, logos, and conference patches must look physically sewn/printed/applied to the uniform, never like floating text or graphic overlays.');

  conferencePatchRules(teamIdentity, 'Primary team').forEach((entry) => lines.push(entry));
  if (opponentIdentity) {
    lines.push('');
    conferencePatchRules(opponentIdentity, 'Opponent').forEach((entry) => lines.push(entry));
  }

  if (teamIdentity?.team === 'Cincinnati') {
    lines.push('CINCINNATI PATCH CHECK — NON-NEGOTIABLE: Cincinnati is a Big 12 football member. The only acceptable conference mark on a visible Cincinnati jersey is the official Big 12 Conference stylized "XII" mark/logo. An American Athletic Conference, AAC, American/AAC star-A, or other conference patch on Cincinnati is incorrect and must not appear.');
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
  lines.push('Uniform lettering, numbers, nameplates, trim, colors, logos, conference patch placement, and proportions should look like real college-football equipment. Do not invent fake school names, fake conference marks, or misspell team identifiers.');
  lines.push('Avoid cinematic fantasy effects, promotional-poster composition, video-game-render appearance, exaggerated HDR, artificial text overlays, or overly staged poses.');
  lines.push('Accuracy rules: depict only events supported by the verified article context. Do not invent touchdowns, celebrations, trophies, injuries, weather, scores, opponents, stadium features, or outcomes that contradict the supplied information. If a non-uniform visual detail is unknown, keep it generic rather than inventing it.');
  lines.push('Do not render headlines, captions, scoreboards, statistics, watermarks, or unrelated signage. Readable jersey numbers, back nameplates, authentic jersey-front team text, and the correct conference patch are required uniform details and are the exception to this no-overlay/no-extra-text rule.');
  lines.push('Do not reproduce the likeness of a real athlete or attempt to match a previously created DynastyHQ player. The goal is an authentic fictional editorial sports photograph, not a portrait of a specific created player.');

  if (forbidden.length) {
    lines.push('Explicitly forbidden unless the verified Photo Director context supports it:');
    forbidden.forEach((entry) => lines.push(`- ${entry}`));
  }

  lines.push('FINAL UNIFORM VALIDATION — REQUIRED BEFORE RETURNING EACH IMAGE: verify the school identity, jersey number, back nameplate when visible, front team text/wordmark when visible, and conference patch against the authoritative team metadata above. A wrong or legacy conference patch is a failed image and must be corrected before final output.');
  lines.push('Final photographic quality check: realistic human anatomy and hands, realistic football equipment, believable player spacing, physically plausible action, professional sports-photo composition, natural lighting, restrained photographic color grading, and accurate readable uniform details wherever visible.');
  return lines.join('\n');
};
