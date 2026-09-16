const clean = (value, max = 1000) => String(value ?? '').trim().slice(0, max);

export const EDITORIAL_LANGUAGE_VERSION = 2;

export const GAME_LOCATION_CONTEXTS = Object.freeze({
  UNKNOWN: 'unknown',
  HOME: 'home',
  AWAY: 'away',
  NEUTRAL: 'neutral',
});

export const UNIFORM_CONTEXTS = Object.freeze({
  ANY: 'any',
  HOME: 'home',
  AWAY: 'away',
  NEUTRAL: 'neutral',
});

const VALID_GAME_LOCATIONS = new Set(Object.values(GAME_LOCATION_CONTEXTS));
const VALID_UNIFORM_CONTEXTS = new Set(Object.values(UNIFORM_CONTEXTS));

export const normalizeGameLocationContext = (value) => {
  const normalized = clean(value, 20).toLowerCase();
  return VALID_GAME_LOCATIONS.has(normalized) ? normalized : GAME_LOCATION_CONTEXTS.UNKNOWN;
};

export const normalizeUniformContext = (value) => {
  const normalized = clean(value, 20).toLowerCase();
  return VALID_UNIFORM_CONTEXTS.has(normalized) ? normalized : UNIFORM_CONTEXTS.ANY;
};

const numericZero = (value) => {
  if (value === '' || value === null || value === undefined) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
};

export const PLAYER_STAT_KEYS = Object.freeze([
  'game.passYds',
  'game.passTD',
  'game.rushYds',
  'game.rushTD',
  'game.int',
]);

export const isAllZeroPlayerStatLine = (values = {}) => (
  PLAYER_STAT_KEYS.every((key) => numericZero(values[key] ?? values[key.replace('game.', '')]))
);

export const isAllZeroPlayerFactLine = (facts = []) => {
  const byKey = new Map((facts || []).map((entry) => [entry?.key, entry?.value]));
  if (!PLAYER_STAT_KEYS.every((key) => byKey.has(key))) return false;
  return PLAYER_STAT_KEYS.every((key) => numericZero(byKey.get(key)));
};

const escapeRegExp = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const collapseInitialSurname = (value = '') => String(value || '').replace(
  /\b[A-Z]\.\s+([A-Z][A-Za-zÀ-ÖØ-öø-ÿ'’.-]{1,})\b/g,
  '$1',
);

const positionLabel = (position) => {
  const pos = clean(position, 12).toUpperCase();
  const labels = {
    QB: 'quarterback', RB: 'running back', FB: 'fullback', WR: 'wide receiver', TE: 'tight end',
    LT: 'left tackle', LG: 'left guard', C: 'center', RG: 'right guard', RT: 'right tackle', OL: 'offensive lineman',
    DE: 'edge defender', DT: 'defensive tackle', DL: 'defensive lineman', LB: 'linebacker', MLB: 'linebacker', OLB: 'linebacker',
    CB: 'cornerback', FS: 'safety', SS: 'safety', S: 'safety', K: 'kicker', P: 'punter',
  };
  return labels[pos] || '';
};

const naturalHeight = (value) => {
  const raw = clean(value, 24);
  const match = raw.match(/^(\d)\s*['′-]\s*(\d{1,2})(?:\s*["″])?$/);
  if (match) return `${match[1]}-foot-${Number(match[2])}`;
  const textMatch = raw.match(/^(\d)-foot-(\d{1,2})$/i);
  return textMatch ? `${textMatch[1]}-foot-${Number(textMatch[2])}` : '';
};

export const buildVerifiedPlayerDescriptors = (career = {}) => {
  const player = career?.player || {};
  const rtg = career?.rtg || {};
  const position = positionLabel(player.pos);
  const rank = clean(rtg.rank, 30).toUpperCase();
  const archetype = clean(player.archetype, 80).toLowerCase();
  const height = naturalHeight(player.height);
  const descriptors = [];

  if (position === 'quarterback') {
    if (rank === 'QB1') descriptors.push('the starting quarterback');
    else if (rank === 'QB2') descriptors.push('the backup quarterback');
    else if (rank === 'QB3') descriptors.push('the third-string quarterback');
    if (/scrambl|improvis|dual[- ]?threat/.test(archetype)) descriptors.push('the dual-threat quarterback');
    else if (/field general|pocket/.test(archetype)) descriptors.push('the pocket passer');
    descriptors.push('the quarterback', 'the signal-caller');
  } else if (position) {
    descriptors.push(`the ${position}`);
  }

  if (height && position) descriptors.push(`the ${height} ${position}`);
  return [...new Set(descriptors)];
};

const playerNameParts = (career = {}) => {
  const fullName = clean(career?.player?.name, 120);
  const parts = fullName.split(/\s+/).filter(Boolean);
  return { fullName, lastName: parts.length >= 2 ? parts[parts.length - 1] : fullName };
};

export const createEditorialNameState = (career = {}) => {
  const { fullName, lastName } = playerNameParts(career);
  return {
    fullName,
    lastName,
    descriptors: buildVerifiedPlayerDescriptors(career),
    fullNameMentions: 0,
    replacementIndex: 0,
  };
};

export const humanizePlayerReferences = (value = '', career = {}, sharedState = null) => {
  let output = collapseInitialSurname(value);
  const state = sharedState || createEditorialNameState(career);
  if (!state.fullName || !state.lastName || state.fullName === state.lastName) return output;

  const exactName = new RegExp(`\\b${escapeRegExp(state.fullName)}\\b`, 'g');
  output = output.replace(exactName, (match) => {
    state.fullNameMentions += 1;
    if (state.fullNameMentions === 1) return match;
    const variants = [state.lastName, ...state.descriptors, state.lastName].filter(Boolean);
    if (!variants.length) return state.lastName;
    const replacement = variants[state.replacementIndex % variants.length];
    state.replacementIndex += 1;
    return replacement;
  });
  return output;
};

const INTERNAL_SENTENCE_RE = /(?:\bcoach trust\b|\bskill points?\b|\bweekly points?\b|\benergy\b|\bgpa\b|\bfollowers?\b|\bnil valuation\b|\bbrand footprint\b|\bprogression record\b|\brtg snapshot\b|\bscreenshot\b|\bupload(?:ed)?\b|\bmissing field\b|\bfields on file\b|\bwill not invent\b|\bwill not manufacture\b|\bseparately verified\b|\bunsupported\b)/i;

const replaceInternalPhrases = (value = '') => String(value || '')
  .replace(/\bFact Ledger\b/gi, 'weekly report')
  .replace(/\bpublished ledger\b/gi, 'season totals')
  .replace(/\bverified ledger\b/gi, 'season record')
  .replace(/\bverified data point(s?)\b/gi, 'confirmed development$1')
  .replace(/\bdata point(s?)\b/gi, 'development$1')
  .replace(/\bpermanent career artifact\b/gi, 'lasting career milestone')
  .replace(/\bpermanent (?:career )?archive\b/gi, 'career history')
  .replace(/\bpermanent Chronicle\b/gi, 'career history')
  .replace(/\bcareer archive\b/gi, 'career history')
  .replace(/\bthe archive\b/gi, 'the career history')
  .replace(/\bverified snapshot\b/gi, 'current picture')
  .replace(/\bgame-supplied snapshot\b/gi, 'current picture')
  .replace(/\bgame-supplied\b/gi, 'current')
  .replace(/\bdirectly uploaded career evidence\b/gi, 'the latest football results')
  .replace(/\bpublished record\b/gi, 'season record')
  .replace(/\bverified record\b/gi, 'record')
  .replace(/\bverified final\b/gi, 'final')
  .replace(/\bverified result\b/gi, 'result')
  .replace(/\bverified performance\b/gi, 'performance')
  .replace(/\bverified season evidence\b/gi, 'season evidence')
  .replace(/\bverified game line\b/gi, 'game line')
  .replace(/\bverified Week\b/gi, 'Week')
  .replace(/\bverified scholarship offer list\b/gi, 'scholarship offer list')
  .replace(/\bverified offer list\b/gi, 'offer list')
  .replace(/\bsaved line\b/gi, 'stat line')
  .replace(/\bsaved personal preference order\b/gi, 'personal preference order')
  .replace(/\bpublished facts\b/gi, 'available information')
  .replace(/\bweekly data point\b/gi, 'weekly development')
  .replace(/\bpermanent season-and-career\b/gi, 'season-and-career')
  .replace(/\s{2,}/g, ' ')
  .trim();

export const sanitizeEditorialSystemLanguage = (value = '') => {
  const replaced = replaceInternalPhrases(value);
  if (!replaced) return '';
  const sentences = replaced.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
  const readerFacing = sentences.filter((sentence) => !INTERNAL_SENTENCE_RE.test(sentence));
  if (readerFacing.length) return readerFacing.join(' ');
  return 'The next meaningful football development will determine where the story goes from here.';
};

const normalizeEditorialText = (value, career, state) => sanitizeEditorialSystemLanguage(
  humanizePlayerReferences(value, career, state),
);

const normalizeTextArray = (values, career, state) => (values || [])
  .map((value) => normalizeEditorialText(value, career, state))
  .filter(Boolean);

export const normalizeNewsroomIssueLanguage = (issue = {}, career = {}) => ({
  ...issue,
  editorialLanguageVersion: EDITORIAL_LANGUAGE_VERSION,
  articles: (issue.articles || []).map((article) => {
    const state = createEditorialNameState(career);
    return {
      ...article,
      kicker: normalizeEditorialText(article.kicker, career, state),
      headline: normalizeEditorialText(article.headline, career, state),
      dek: normalizeEditorialText(article.dek, career, state),
      paragraphs: normalizeTextArray(article.paragraphs, career, state),
      sectionHeadings: normalizeTextArray(article.sectionHeadings, career, state),
      pullQuote: normalizeEditorialText(article.pullQuote, career, state),
      sidebars: (article.sidebars || []).map((sidebar) => ({
        ...sidebar,
        title: normalizeEditorialText(sidebar?.title, career, state),
        items: normalizeTextArray(sidebar?.items, career, state),
      })),
    };
  }),
});

export const normalizePodcastEpisodeLanguage = (episode = {}, career = {}) => {
  const state = createEditorialNameState(career);
  return {
    ...episode,
    editorialLanguageVersion: EDITORIAL_LANGUAGE_VERSION,
    title: normalizeEditorialText(episode.title, career, state),
    summary: normalizeEditorialText(episode.summary, career, state),
    chapters: (episode.chapters || []).map((chapter) => ({
      ...chapter,
      title: normalizeEditorialText(chapter?.title, career, state),
      summary: normalizeEditorialText(chapter?.summary, career, state),
    })),
    segments: (episode.segments || []).map((segment) => ({
      ...segment,
      text: normalizeEditorialText(segment?.text, career, state),
    })),
  };
};

export const uniformContextAdjustment = ({ gameLocation, uniformContext }) => {
  const location = normalizeGameLocationContext(gameLocation);
  const uniform = normalizeUniformContext(uniformContext);
  if (location === GAME_LOCATION_CONTEXTS.UNKNOWN) return 0;
  if (uniform === UNIFORM_CONTEXTS.ANY) return location === GAME_LOCATION_CONTEXTS.NEUTRAL ? 10 : 0;
  if (uniform === location) return location === GAME_LOCATION_CONTEXTS.NEUTRAL ? 140 : 220;
  if (location === GAME_LOCATION_CONTEXTS.NEUTRAL) return 0;
  if (uniform === UNIFORM_CONTEXTS.NEUTRAL) return -120;
  return -450;
};

export const uniformContextIsHardMismatch = ({ gameLocation, uniformContext }) => {
  const location = normalizeGameLocationContext(gameLocation);
  const uniform = normalizeUniformContext(uniformContext);
  if (![GAME_LOCATION_CONTEXTS.HOME, GAME_LOCATION_CONTEXTS.AWAY].includes(location)) return false;
  return (location === GAME_LOCATION_CONTEXTS.HOME && uniform === UNIFORM_CONTEXTS.AWAY)
    || (location === GAME_LOCATION_CONTEXTS.AWAY && uniform === UNIFORM_CONTEXTS.HOME);
};
