const clean = (value, maxLength = 500) => String(value ?? '').trim().slice(0, maxLength);

const firstSentence = (value, maxLength = 210) => {
  const text = clean(value, 1200);
  if (!text) return '';
  const sentence = text.match(/^.*?[.!?](?:\s|$)/)?.[0] || text;
  return clean(sentence, maxLength);
};

const PRESENTATIONS = Object.freeze({
  broadsheet: {
    layout: 'classic', category: 'School & Community', strapline: 'The official record of the season',
    accent: '#b7791f', accentStrong: '#8a570c', masthead: '#13202d', paper: '#f8f5ed', ink: '#17202a', muted: '#66717c', rule: '#d8d1c3',
    sectionHeadings: ['The week in focus', 'What it means from here'], sidebarTitle: 'Season notebook',
  },
  local: {
    layout: 'community', category: 'Metro Detroit Sports', strapline: 'Local football. Local stakes.',
    accent: '#c8202f', accentStrong: '#9d1622', masthead: '#102235', paper: '#fbfbfa', ink: '#151b23', muted: '#66707c', rule: '#d6dbe0',
    sectionHeadings: ['The story behind the week', 'The road ahead'], sidebarTitle: 'Local storylines',
  },
  on3: {
    layout: 'insider', category: 'Recruiting & Evaluation', strapline: 'Intel, movement and the decision ahead',
    accent: '#f4b940', accentStrong: '#d89212', masthead: '#0b0c0f', paper: '#f5f3ee', ink: '#16171a', muted: '#66676d', rule: '#d9d4c9',
    sectionHeadings: ['Inside the recruitment', 'What evaluators watch next'], sidebarTitle: 'Recruiting intel',
  },
  filmroom: {
    layout: 'analysis', category: 'Film & Performance', strapline: 'The numbers behind the next step',
    accent: '#2dd4bf', accentStrong: '#0f9f8f', masthead: '#071827', paper: '#eef4f4', ink: '#10202a', muted: '#607079', rule: '#cbd8d8',
    sectionHeadings: ['What the performance shows', 'The next evaluation'], sidebarTitle: 'Analyst notebook',
  },
  national: {
    layout: 'network', category: 'National College Football', strapline: 'The bigger picture of the journey',
    accent: '#ef3340', accentStrong: '#bd1825', masthead: '#111722', paper: '#ffffff', ink: '#151a21', muted: '#68717e', rule: '#dfe3e8',
    sectionHeadings: ['Why this week matters', 'Where the story goes next'], sidebarTitle: 'National perspective',
  },
  network: {
    layout: 'network', category: 'National College Football', strapline: 'The bigger picture of the journey',
    accent: '#ef3340', accentStrong: '#bd1825', masthead: '#0b0d11', paper: '#ffffff', ink: '#14171c', muted: '#686f79', rule: '#dfe2e6',
    sectionHeadings: ['Why this week matters', 'The national view'], sidebarTitle: 'National perspective',
  },
  regional: {
    layout: 'regional', category: 'Regional College Football', strapline: 'Programs, players and the race around the region',
    accent: '#9f2432', accentStrong: '#791824', masthead: '#30141b', paper: '#faf6ef', ink: '#21191a', muted: '#746568', rule: '#ddcfd0',
    sectionHeadings: ['Across the region', 'The stakes ahead'], sidebarTitle: 'Regional watch',
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
  if (presentation.layout === 'network') return 'feature';
  return 'news';
};

export const resolveNewsroomPresentation = (story = {}) => {
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

const moduleEyebrow = (layout, index) => {
  if (layout === 'insider') return index === 0 ? 'Recruiting Intel' : 'Decision Watch';
  if (layout === 'analysis') return index === 0 ? 'Film Note' : 'Development Point';
  if (layout === 'network') return index === 0 ? 'Why It Matters' : 'National Context';
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
        title: 'Edition snapshot',
        items: [
          story.desk || presentation.category,
          `Season ${issue.season || 1} · Week ${issue.week || 0}`,
          `${story.readingMinutes || Math.max(2, Math.round(paragraphs.join(' ').split(/\s+/).filter(Boolean).length / 225))} minute read`,
        ],
      },
      {
        title: presentation.sidebarTitle,
        items: fallbackStorylines.length ? fallbackStorylines : [clean(story.dek, 190)].filter(Boolean),
      },
    ];

  const importance = importanceFor(story, issue);
  const storyFormat = formatFor(story, presentation);
  const modulePlacement = ['insider', 'analysis', 'network'].includes(presentation.layout) ? 'deck' : 'sidebar';
  const modules = modulePlacement === 'deck'
    ? sidebars.slice(0, 3).map((section, index) => ({ ...section, eyebrow: moduleEyebrow(presentation.layout, index) }))
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
  };
};
