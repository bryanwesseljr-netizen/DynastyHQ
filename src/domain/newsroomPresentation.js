const clean = (value, maxLength = 500) => String(value ?? '').trim().slice(0, maxLength);

const firstSentence = (value, maxLength = 210) => {
  const text = clean(value, 1200);
  if (!text) return '';
  const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0] || text;
  return clean(sentence, maxLength);
};

const PRESENTATIONS = Object.freeze({
  broadsheet: {
    audience: 'school', layout: 'classic', category: 'School & Community', strapline: 'The official record of the season',
    accent: '#b7791f', accentStrong: '#8a570c', masthead: '#13202d', paper: '#f8f5ed', ink: '#17202a', muted: '#66717c', rule: '#d8d1c3',
    sectionHeadings: ['The week in focus', 'What it means from here'], sidebarTitle: 'Season notebook',
  },
  local: {
    audience: 'local', layout: 'local-beat', category: 'Local Team Coverage', strapline: 'News. Analysis. Program focus.',
    accent: '#c8102e', accentStrong: '#a40821', masthead: '#08090b', paper: '#ffffff', ink: '#111318', muted: '#62676f', rule: '#d5d7db',
    sectionHeadings: ['What changed', 'Why it matters'], sidebarTitle: 'At a glance',
  },
  on3: {
    audience: 'recruiting', layout: 'insider', category: 'Recruiting & Evaluation', strapline: 'Intel, movement and the decision ahead',
    accent: '#f4b940', accentStrong: '#d89212', masthead: '#0b0c0f', paper: '#f5f3ee', ink: '#16171a', muted: '#66676d', rule: '#d9d4c9',
    sectionHeadings: ['Inside the recruitment', 'What evaluators watch next'], sidebarTitle: 'Recruiting intel',
  },
  filmroom: {
    audience: 'analysis', layout: 'analysis', category: 'Film & Performance', strapline: 'The evidence behind the football story',
    accent: '#2dd4bf', accentStrong: '#0f9f8f', masthead: '#071827', paper: '#eef4f4', ink: '#10202a', muted: '#607079', rule: '#cbd8d8',
    sectionHeadings: ['What the performance shows', 'The next football question'], sidebarTitle: 'Analyst notebook',
  },
  national: {
    audience: 'national', layout: 'national-desk', category: 'National College Football', strapline: 'The stories that move the sport',
    accent: '#e21b2d', accentStrong: '#b51222', masthead: '#0b1320', paper: '#ffffff', ink: '#10151d', muted: '#69717d', rule: '#dce0e5',
    sectionHeadings: ['Why this matters nationally', 'What comes next'], sidebarTitle: 'National context',
  },
  network: {
    audience: 'national', layout: 'national-desk', category: 'National College Football', strapline: 'The stories that move the sport',
    accent: '#e21b2d', accentStrong: '#b51222', masthead: '#0b1320', paper: '#ffffff', ink: '#10151d', muted: '#69717d', rule: '#dce0e5',
    sectionHeadings: ['Why this matters nationally', 'What comes next'], sidebarTitle: 'National context',
  },
  regional: {
    audience: 'regional', layout: 'regional-report', category: 'Regional College Football', strapline: 'The wider view across the region',
    accent: '#8f2030', accentStrong: '#701725', masthead: '#22171b', paper: '#fbf8f2', ink: '#20191b', muted: '#71666a', rule: '#ddd3d3',
    sectionHeadings: ['The regional view', 'Where the story goes next'], sidebarTitle: 'Regional watch',
  },
});

const IMPORTANCE_LABELS = Object.freeze({
  routine: 'Weekly Update',
  notable: 'Story Developing',
  major: 'Major Development',
  'career-defining': 'Career Milestone',
});

const FORMAT_LABELS = Object.freeze({
  news: 'News Report',
  feature: 'Feature',
  analysis: 'Analysis',
  'recruiting-intel': 'Recruiting Intel',
  milestone: 'Milestone',
  reaction: 'Reaction',
});

const importanceFor = (story = {}, issue = {}) => {
  const supplied = clean(story.storyImportance, 40).toLowerCase();
  if (IMPORTANCE_LABELS[supplied]) return supplied;

  const sample = clean([
    issue.editionType, story.kicker, story.headline, story.dek,
    ...(Array.isArray(story.paragraphs) ? story.paragraphs.slice(0, 3) : []),
  ].join(' '), 6000).toLowerCase();

  if (/national championship|championship win|heisman|national player of the year|career milestone/.test(sample)) return 'career-defining';
  if (/commit(?:ted|ment)|named starter|starting quarterback|rivalry win|upset|major award|transfer portal|transfer decision|season-ending injury|record[- ]setting|championship/.test(sample)) return 'major';
  if (/offer|ranking|tape score|depth chart|promotion|breakout|momentum|win\b|loss\b|injur|decision/.test(sample)) return 'notable';
  return 'routine';
};

const formatFor = (story = {}, presentation) => {
  const supplied = clean(story.storyFormat, 50).toLowerCase();
  if (FORMAT_LABELS[supplied]) return supplied;
  if (presentation.layout === 'insider') return 'recruiting-intel';
  if (presentation.layout === 'analysis') return 'analysis';
  if (importanceFor(story) === 'career-defining') return 'milestone';
  if (presentation.audience === 'national') return 'feature';
  return 'news';
};

const presentationForAudience = (story = {}) => {
  const audience = clean(story.audience, 40).toLowerCase();
  if (audience === 'local') return PRESENTATIONS.local;
  if (audience === 'regional') return PRESENTATIONS.regional;
  if (audience === 'national' || audience === 'national-lead') return { ...PRESENTATIONS.national, audience };
  if (audience === 'analysis') return PRESENTATIONS.filmroom;
  return null;
};

export const resolveNewsroomPresentation = (story = {}) => {
  const audiencePresentation = presentationForAudience(story);
  if (audiencePresentation) return audiencePresentation;
  const key = clean(story.theme || story.outletId, 60).toLowerCase();
  return PRESENTATIONS[key] || PRESENTATIONS.broadsheet;
};

export const presentationVariables = (presentation) => ({
  '--news-accent': presentation.accent,
  '--news-accent-strong': presentation.accentStrong,
  '--news-masthead': presentation.masthead,
  '--news-paper': presentation.paper,
  '--news-ink': presentation.ink,
  '--news-muted': presentation.muted,
  '--news-rule': presentation.rule,
});

const normalizeSidebars = (sidebars = []) => (Array.isArray(sidebars) ? sidebars : [])
  .map((section) => ({
    title: clean(section?.title, 80),
    items: (Array.isArray(section?.items) ? section.items : [])
      .map((item) => clean(item, 220))
      .filter(Boolean)
      .slice(0, 5),
  }))
  .filter((section) => section.title && section.items.length)
  .slice(0, 3);

const moduleEyebrow = (presentation, index) => {
  if (presentation.layout === 'insider') return index === 0 ? 'Recruiting Intel' : 'Decision Watch';
  if (presentation.layout === 'analysis') return index === 0 ? 'Film Note' : 'Development Point';
  if (presentation.audience === 'national') return index === 0 ? 'Why It Matters' : 'National Context';
  if (presentation.audience === 'regional') return index === 0 ? 'Regional View' : 'What Comes Next';
  if (presentation.audience === 'local') return index === 0 ? 'At A Glance' : 'Beat Notebook';
  return 'Story Notebook';
};

export const buildEditorialExtras = ({ story = {}, issue = {} }) => {
  const presentation = resolveNewsroomPresentation(story);
  const paragraphs = Array.isArray(story.paragraphs) ? story.paragraphs.filter(Boolean) : [];
  const generatedHeadings = (Array.isArray(story.sectionHeadings) ? story.sectionHeadings : [])
    .map((heading) => clean(heading, 100))
    .filter(Boolean)
    .slice(0, 3);
  const sectionHeadings = generatedHeadings.length >= 2 ? generatedHeadings : presentation.sectionHeadings;
  const pullQuote = clean(story.pullQuote, 320)
    || firstSentence(paragraphs[Math.min(2, Math.max(0, paragraphs.length - 1))], 280)
    || clean(story.dek, 280);
  const generatedSidebars = normalizeSidebars(story.sidebars);
  const fallbackStorylines = [paragraphs[1], paragraphs.at(-1)]
    .map((paragraph) => firstSentence(paragraph, 190))
    .filter(Boolean);
  const sidebars = generatedSidebars.length
    ? generatedSidebars
    : [
      {
        title: presentation.sidebarTitle,
        items: [
          story.desk || presentation.category,
          `Season ${issue.season || 1} · Week ${issue.week || 0}`,
          `${story.readingMinutes || Math.max(2, Math.round(paragraphs.join(' ').split(/\s+/).filter(Boolean).length / 225))} minute read`,
        ],
      },
      {
        title: presentation.audience === 'local' ? 'What it means' : presentation.sidebarTitle,
        items: fallbackStorylines.length ? fallbackStorylines : [clean(story.dek, 190)].filter(Boolean),
      },
    ];

  const importance = importanceFor(story, issue);
  const storyFormat = formatFor(story, presentation);
  const modulePlacement = ['insider', 'analysis', 'national-desk'].includes(presentation.layout) ? 'deck' : 'sidebar';
  const modules = modulePlacement === 'deck'
    ? sidebars.slice(0, 3).map((section, index) => ({ ...section, eyebrow: moduleEyebrow(presentation, index) }))
    : [];
  const sidebarsForAside = modulePlacement === 'sidebar' ? sidebars : [];

  return {
    sectionHeadings,
    pullQuote,
    sidebars,
    sidebarsForAside,
    modules,
    modulePlacement,
    importance,
    importanceLabel: IMPORTANCE_LABELS[importance],
    storyFormat,
    formatLabel: FORMAT_LABELS[storyFormat],
    audience: presentation.audience,
    audienceLabel: presentation.audience === 'national-lead'
      ? 'National Lead'
      : presentation.audience === 'national'
        ? 'National Desk'
        : presentation.audience === 'regional'
          ? 'Regional Desk'
          : presentation.audience === 'local'
            ? 'Local Beat'
            : presentation.category,
  };
};
