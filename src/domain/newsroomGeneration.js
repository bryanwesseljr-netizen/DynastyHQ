const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);

const wordCount = (value) => clean(value, 20000).split(/\s+/).filter(Boolean).length;

const matchesPublication = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const EDITORIAL_PROFILES = Object.freeze({
  bolt: {
    byline: 'Rachel Monroe · Thunderbirds Beat Writer',
    purpose: 'Lead with the strongest news of the week, then connect it to the player, school, and season-long journey. Write like a confident school beat reporter with access to the full public record.',
  },
  local: {
    byline: 'Anthony Carter · Metro Detroit Prep Reporter',
    purpose: 'Tell the hometown story. Emphasize the player’s development, local identity, family-and-community stakes, and what the update means in the Southeast Michigan recruiting picture when the supplied facts support it.',
  },
  recruiting: {
    byline: 'Marcus Grant · Recruiting Insider',
    purpose: 'Write an insider-style recruiting story. Center the ordered school list, new offers, rating or Tape Score movement, geographic patterns, decision pressure, and what deserves attention next. Clearly frame interpretation as analysis.',
  },
  filmroom: {
    byline: 'Tyler Brooks · Football Analyst',
    purpose: 'Write an analytical evaluation. Use objectives, results, statistics, and week-to-week changes to explain what the performance may indicate and what the next evaluation should test. Never invent a play, coverage, formation, or physical trait.',
  },
  national: {
    byline: 'Nicole Benton · National College Football Writer',
    purpose: 'Frame the week inside the larger career arc. Explain why the development, result, recruiting movement, or opportunity matters beyond one update without inventing national comparisons, rankings, or outside reactions.',
  },
  'college-local': {
    byline: 'Rachel Monroe · Campus Beat Writer',
    purpose: 'Write the definitive local college beat story, centered on the player’s role, the team result, and the immediate stakes for the program and the next chapter of the season.',
  },
  'college-regional': {
    byline: 'Anthony Carter · Regional College Football Writer',
    purpose: 'Interpret the update through a regional college-football lens, emphasizing trajectory, competition, role, and season stakes supported by the supplied career record.',
  },
});

const profileFor = (article = {}) => EDITORIAL_PROFILES[article.outletId]
  || EDITORIAL_PROFILES[article.theme]
  || {
    byline: `${clean(article.outletName, 80) || 'DynastyHQ'} Staff`,
    purpose: 'Write a polished sports-news feature with a clear angle, strong lead, useful context, and a forward-looking close.',
  };

const factId = (fact, index) => `${clean(fact.publicationId, 80) || 'career'}:${index}:${clean(fact.key, 140)}`;

const sourceFactsFor = (state, issue) => {
  const publicationId = issue.publicationId || issue.id;
  const historicalPublicationIds = (state.weeklyUpdates || [])
    .filter((entry) => !matchesPublication(entry, publicationId))
    .slice(-3)
    .map((entry) => entry.id || entry.publicationId || entry.weekKey)
    .filter(Boolean);
  const allowedPublicationIds = new Set([publicationId, ...historicalPublicationIds]);
  const relevant = (state.factLedger || [])
    .filter((fact) => fact?.verified && allowedPublicationIds.has(fact.publicationId))
    .slice(-100);

  return relevant.map((fact, index) => ({
    id: factId(fact, index),
    key: clean(fact.key, 180),
    label: clean(fact.label, 180) || clean(fact.key, 180),
    value: typeof fact.value === 'number' || typeof fact.value === 'boolean'
      ? fact.value
      : clean(fact.value, 600),
    period: matchesPublication(fact, publicationId) ? 'current edition' : `earlier career entry (${clean(fact.publicationId, 100)})`,
    publicationId: clean(fact.publicationId, 120),
  }));
};

export const buildNewsroomGenerationPayload = (state, publicationId) => {
  const issue = (state.newsroomIssues || []).find((entry) => matchesPublication(entry, publicationId));
  if (!issue?.articles?.length) throw new Error('Choose a published newsroom edition first.');
  const facts = sourceFactsFor(state, issue);
  if (!facts.length) throw new Error('This edition has no published career facts available for writing.');
  const currentFactIdsByKey = new Map();
  facts.forEach((fact) => {
    if (fact.period !== 'current edition') return;
    const ids = currentFactIdsByKey.get(fact.key) || [];
    ids.push(fact.id);
    currentFactIdsByKey.set(fact.key, ids);
  });

  return {
    publicationId: issue.publicationId || issue.id,
    season: Math.max(1, Number(issue.season) || 1),
    week: Math.max(0, Number(issue.week) || 0),
    label: clean(issue.label, 160),
    editionType: clean(issue.editionType, 80) || 'weekly',
    careerPhase: clean(issue.careerPhase, 60),
    player: {
      name: clean(state.player?.name, 120),
      school: clean(state.player?.school, 160),
      college: clean(state.player?.college, 160),
      position: clean(state.player?.pos, 40),
      number: clean(state.player?.number, 20),
      archetype: clean(state.player?.archetype, 80),
    },
    facts,
    articleBriefs: issue.articles.slice(0, 5).map((entry) => {
      const profile = profileFor(entry);
      const focusFactIds = [...new Set((entry.citedFactKeys || [])
        .flatMap((key) => currentFactIdsByKey.get(key) || []))];
      return {
        outletId: clean(entry.outletId || entry.id, 80),
        outletName: clean(entry.outletName, 120),
        desk: clean(entry.desk, 100),
        theme: clean(entry.theme, 60),
        byline: profile.byline,
        purpose: profile.purpose,
        focusFactIds: focusFactIds.length ? focusFactIds : facts.filter((fact) => fact.period === 'current edition').map((fact) => fact.id),
      };
    }),
  };
};

const normalizeCitations = (ids, payload) => {
  const factsById = new Map(payload.facts.map((fact) => [fact.id, fact]));
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .map((id) => factsById.get(id)?.key)
    .filter(Boolean);
};

export const normalizeGeneratedNewsroomEdition = ({ generated, payload, model = '', generatedAt = new Date().toISOString() }) => {
  const briefsById = new Map(payload.articleBriefs.map((brief) => [brief.outletId, brief]));
  const generatedByOutlet = new Map((generated?.articles || []).map((entry) => [clean(entry.outletId, 80), entry]));
  if (generatedByOutlet.size !== payload.articleBriefs.length) {
    throw new Error('The newsroom edition was incomplete. Please try writing it again.');
  }
  const articles = payload.articleBriefs.map((requestedBrief) => {
    const entry = generatedByOutlet.get(requestedBrief.outletId);
    if (!entry) return null;
    const outletId = clean(entry.outletId, 80);
    const brief = briefsById.get(outletId);
    if (!brief) return null;
    const paragraphs = (entry.paragraphs || []).map((paragraph) => clean(paragraph, 2200)).filter(Boolean).slice(0, 8);
    const articleWords = paragraphs.reduce((total, paragraph) => total + wordCount(paragraph), 0);
    if (paragraphs.length < 4 || articleWords < 220) return null;
    const citedFactKeys = normalizeCitations(entry.citedFactIds, payload);
    if (!citedFactKeys.length) return null;
    const sectionHeadings = (entry.sectionHeadings || []).map((heading) => clean(heading, 100)).filter(Boolean).slice(0, 3);
    const sidebars = (entry.sidebars || []).map((section) => ({
      title: clean(section?.title, 80),
      items: (section?.items || []).map((item) => clean(item, 220)).filter(Boolean).slice(0, 5),
    })).filter((section) => section.title && section.items.length >= 2).slice(0, 3);
    if (sectionHeadings.length < 2 || sidebars.length < 2) return null;
    return {
      outletId,
      kicker: clean(entry.kicker, 80),
      headline: clean(entry.headline, 260),
      dek: clean(entry.dek, 500),
      byline: brief.byline,
      dateline: clean(entry.dateline, 100),
      paragraphs,
      sectionHeadings,
      pullQuote: clean(entry.pullQuote, 320),
      sidebars,
      citedFactKeys,
      readingMinutes: Math.max(2, Math.round(articleWords / 225)),
      editorialStatus: 'generated',
      generatedAt,
      articleModel: clean(model, 100),
    };
  }).filter(Boolean);

  if (articles.length !== payload.articleBriefs.length) {
    throw new Error('The newsroom edition was incomplete. Please try writing it again.');
  }
  return { articles, generatedAt, model: clean(model, 100) };
};

export const applyGeneratedNewsroomEdition = (state, publicationId, edition) => ({
  ...state,
  newsroomIssues: (state.newsroomIssues || []).map((issue) => {
    if (!matchesPublication(issue, publicationId)) return issue;
    const generatedByOutlet = new Map(edition.articles.map((entry) => [entry.outletId, entry]));
    return {
      ...issue,
      editorialStatus: 'generated',
      editorialGeneratedAt: edition.generatedAt,
      editorialModel: edition.model,
      articles: (issue.articles || []).map((article) => {
        const generated = generatedByOutlet.get(article.outletId);
        return generated ? { ...article, ...generated, id: article.id, outletId: article.outletId } : article;
      }),
    };
  }),
  postgameFrontPages: (state.postgameFrontPages || []).map((page) => (
    page.publicationId === publicationId
      ? { ...page, needsRegeneration: true, staleAt: edition.generatedAt }
      : page
  )),
});
