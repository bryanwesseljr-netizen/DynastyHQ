const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);

const wordCount = (value) => clean(value, 20000).split(/\s+/).filter(Boolean).length;

const matchesPublication = (entry, publicationId) => (
  entry?.publicationId === publicationId || entry?.id === publicationId || entry?.weekKey === publicationId
);

const EDITORIAL_PROFILES = Object.freeze({
  bolt: {
    byline: 'Rachel Monroe · Thunderbirds Beat Writer',
    purpose: 'Write like a real school beat reporter. Lead with the actual football development or recruiting news, explain why it matters, and keep game-interface mechanics out of the copy unless they represent a genuine public storyline.',
  },
  local: {
    byline: 'Anthony Carter · Metro Detroit Prep Reporter',
    purpose: 'Tell the hometown story with a human sportswriting angle: development, opportunity, recruiting decisions, role changes, setbacks, and what comes next. Do not turn tracker values into the story.',
  },
  recruiting: {
    byline: 'Marcus Grant · Recruiting Insider',
    purpose: 'Write a modern recruiting-insider story about offers, visits, preference movement, commitments, transfers, and decision pressure. Use recruiting mechanics only when they translate into a real recruiting development.',
  },
  filmroom: {
    byline: 'Tyler Brooks · Football Analyst',
    purpose: 'Write football analysis from actual performance, role, production, and meaningful development. Never narrate ratings, progression currencies, meters, or tracker bookkeeping as though they are football analysis.',
  },
  national: {
    byline: 'Nicole Benton · National College Football Writer',
    purpose: 'Frame the week inside the larger football career arc. Focus on role, opportunity, results, pressure, momentum, postseason stakes, and consequential decisions without inventing outside reaction.',
  },
  'college-local': {
    byline: 'Rachel Monroe · Campus Beat Writer',
    purpose: 'Write the definitive local college beat story. Center the player’s real role in the program, the quarterback-room or team stakes, the week’s football context, and what coaches and fans would realistically care about. Never write an article about OVR, Coach Trust, Skill Points, GPA, followers, or other game meters.',
  },
  'college-regional': {
    byline: 'Anthony Carter · Regional College Football Writer',
    purpose: 'Interpret the week through a regional college-football lens: competition, opportunity, depth-chart movement, development, team trajectory, opponent context, and postseason implications. Keep internal progression numbers invisible.',
  },
});

const profileFor = (article = {}) => EDITORIAL_PROFILES[article.outletId]
  || EDITORIAL_PROFILES[article.theme]
  || {
    byline: `${clean(article.outletName, 80) || 'DynastyHQ'} Staff`,
    purpose: 'Write a polished modern sports article with a clear football angle, strong lead, useful context, realistic stakes, and a forward-looking close. Treat tracker mechanics as background only.',
  };

const factId = (fact, index) => `${clean(fact.publicationId, 80) || 'career'}:${index}:${clean(fact.key, 140)}`;

const coverageStageFor = (state = {}, issue = {}) => {
  const phase = clean(issue.careerPhase || state.careerPhase, 40);
  if (['OC', 'HC'].includes(phase)) return 'coach';
  if (['high-school-evaluation', 'recruiting'].includes(clean(issue.editionType, 80))) return 'high-school';
  if (state.player?.isCommitted || state.player?.college) return 'college-player';
  return 'high-school';
};

const isHighSchoolLegacyFact = (key) => (
  key.startsWith('highSchool.')
  || key.startsWith('recruiting.profile.')
  || key === 'profile.player.stars'
  || key === 'profile.player.nationalQbRank'
);

const isMechanicalRtgFact = (key) => new Set([
  'profile.player.overall',
  'rtg.coachTrust',
  'rtg.trustToNext',
  'rtg.skillPoints',
  'rtg.weeklyPoints',
  'rtg.energy',
  'rtg.gpa',
  'rtg.examWeeks',
  'rtg.academicsStanding',
  'rtg.academicsAbility',
  'rtg.academicsCoachHappinessBonus',
  'rtg.leadershipLevel',
  'rtg.leadershipAbility',
  'rtg.leadershipCoachHappinessBonus',
  'rtg.leadershipTeamXpMultiplier',
  'rtg.leadershipComposureBonus',
  'rtg.healthLevel',
  'rtg.injuryRisk',
  'rtg.healthWearImpact',
  'rtg.fitnessLevel',
  'rtg.fitnessCoachHappinessBonus',
  'rtg.fitnessTeamXpMultiplier',
  'rtg.fitnessComposureBonus',
  'rtg.fitnessWeightBonus',
  'rtg.fitnessWearImpact',
  'rtg.followers',
  'rtg.brandTier',
  'rtg.nextFanMilestone',
  'rtg.brandEngagement',
  'rtg.dealTier',
  'rtg.brandAbility',
  'rtg.nilWeeklyCost',
  'rtg.openNilSlots',
  'rtg.valuation',
  'rtg.sponsorships',
  'rtg.coachHappiness',
  'rtg.draftProjection',
]).has(key) || key.startsWith('rtg.wear.');

const editorialUseFor = (fact, { current = false, coverageStage = 'high-school' } = {}) => {
  const key = clean(fact?.key, 180);
  if (!key) return 'exclude';
  if (coverageStage === 'college-player' && isHighSchoolLegacyFact(key)) return 'exclude';
  if (coverageStage === 'college-player' && !current && key.startsWith('recruiting.')) return 'exclude';
  if (key.startsWith('game.')) return 'primary';
  if (key.startsWith('milestone.') || key.startsWith('award.') || key.startsWith('transfer.') || key.startsWith('portal.')) return 'primary';
  if (key === 'weekly.note' && clean(fact.value, 500)) return 'primary';
  if (key === 'rtg.rank') return 'primary';
  if (isMechanicalRtgFact(key)) return 'background-only';
  if (key.startsWith('highSchool.')) return coverageStage === 'high-school' ? 'primary' : 'exclude';
  if (key.startsWith('recruiting.')) return current ? 'primary' : 'context';
  if (key.startsWith('coach.')) {
    return ['coach.portalDepartures', 'coach.openScholarships', 'coach.classCommits', 'coach.portalAdditions'].includes(key)
      ? 'primary'
      : 'background-only';
  }
  if (key.startsWith('roster.')) return current ? 'context' : 'background-only';
  if (key.startsWith('profile.player.')) return 'context';
  if (key.startsWith('weekly.')) return 'context';
  return 'context';
};

const sourceFactsFor = (state, issue) => {
  const publicationId = issue.publicationId || issue.id;
  const coverageStage = coverageStageFor(state, issue);
  const season = Math.max(1, Number(issue.season) || 1);
  const week = Math.max(0, Number(issue.week) || 0);
  const historicalPublicationIds = (state.weeklyUpdates || [])
    .filter((entry) => !matchesPublication(entry, publicationId))
    .filter((entry) => Number(entry.season || 1) === season)
    .filter((entry) => Number(entry.week ?? 1) <= week)
    .filter((entry) => {
      if (coverageStage !== 'college-player') return true;
      return entry?.game?.stage !== 'high-school' && !entry?.game?.evaluation && !entry?.highSchoolEvaluation;
    })
    .slice(-3)
    .map((entry) => entry.id || entry.publicationId || entry.weekKey)
    .filter(Boolean);
  const allowedPublicationIds = new Set([publicationId, ...historicalPublicationIds]);

  const relevant = (state.factLedger || [])
    .filter((fact) => fact?.verified && allowedPublicationIds.has(fact.publicationId))
    .filter((fact) => {
      const current = matchesPublication(fact, publicationId);
      return editorialUseFor(fact, { current, coverageStage }) !== 'exclude';
    })
    .slice(-100);

  return relevant.map((fact, index) => {
    const current = matchesPublication(fact, publicationId);
    return {
      id: factId(fact, index),
      key: clean(fact.key, 180),
      label: clean(fact.label, 180) || clean(fact.key, 180),
      value: typeof fact.value === 'number' || typeof fact.value === 'boolean' ? fact.value : clean(fact.value, 600),
      period: current ? 'current edition' : `earlier same-stage context (${clean(fact.publicationId, 100)})`,
      publicationId: clean(fact.publicationId, 120),
      editorialUse: editorialUseFor(fact, { current, coverageStage }),
    };
  });
};

export const buildNewsroomGenerationPayload = (state, publicationId) => {
  const issue = (state.newsroomIssues || []).find((entry) => matchesPublication(entry, publicationId));
  if (!issue?.articles?.length) throw new Error('Choose a published newsroom edition first.');
  const facts = sourceFactsFor(state, issue);
  if (!facts.length) throw new Error('This edition has no published career facts available for writing.');
  const coverageStage = coverageStageFor(state, issue);
  const currentFactIdsByKey = new Map();
  facts.forEach((fact) => {
    if (fact.period !== 'current edition') return;
    const ids = currentFactIdsByKey.get(fact.key) || [];
    ids.push(fact.id);
    currentFactIdsByKey.set(fact.key, ids);
  });

  const currentPrimary = facts.filter((fact) => fact.period === 'current edition' && fact.editorialUse === 'primary');
  const currentContext = facts.filter((fact) => fact.period === 'current edition' && fact.editorialUse === 'context');

  return {
    publicationId: issue.publicationId || issue.id,
    season: Math.max(1, Number(issue.season) || 1),
    week: Math.max(0, Number(issue.week) || 0),
    label: clean(issue.label, 160),
    editionType: clean(issue.editionType, 80) || 'weekly',
    weekType: clean(issue.weekType, 60),
    weekPhase: clean(issue.weekPhase, 80),
    careerPhase: clean(issue.careerPhase, 60),
    coverageStage,
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
      const requestedFocus = [...new Set((entry.citedFactKeys || [])
        .flatMap((key) => currentFactIdsByKey.get(key) || []))]
        .map((id) => facts.find((fact) => fact.id === id))
        .filter((fact) => fact && fact.editorialUse !== 'background-only');
      const fallback = currentPrimary.length ? currentPrimary : currentContext;
      const focusFacts = requestedFocus.length ? requestedFocus : fallback;
      return {
        outletId: clean(entry.outletId || entry.id, 80),
        outletName: clean(entry.outletName, 120),
        desk: clean(entry.desk, 100),
        theme: clean(entry.theme, 60),
        byline: profile.byline,
        purpose: profile.purpose,
        focusFactIds: [...new Set(focusFacts.map((fact) => fact.id))],
      };
    }).filter((brief) => brief.focusFactIds.length),
  };
};

const normalizeCitations = (ids, payload) => {
  const factsById = new Map(payload.facts.map((fact) => [fact.id, fact]));
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .map((id) => factsById.get(id)?.key)
    .filter(Boolean);
};

const normalizeImportance = (value) => {
  const normalized = clean(value, 40).toLowerCase();
  return ['routine', 'notable', 'major', 'career-defining'].includes(normalized) ? normalized : 'routine';
};

const normalizeStoryFormat = (value) => {
  const normalized = clean(value, 50).toLowerCase();
  return ['news', 'feature', 'analysis', 'recruiting-intel', 'milestone', 'reaction'].includes(normalized) ? normalized : 'news';
};

export const normalizeGeneratedNewsroomEdition = ({ generated, payload, model = '', generatedAt = new Date().toISOString() }) => {
  const briefsById = new Map(payload.articleBriefs.map((brief) => [brief.outletId, brief]));
  const generatedByOutlet = new Map((generated?.articles || []).map((entry) => [clean(entry.outletId, 80), entry]));
  if (generatedByOutlet.size !== payload.articleBriefs.length) throw new Error('The newsroom edition was incomplete. Please try writing it again.');

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
      storyImportance: normalizeImportance(entry.storyImportance),
      storyFormat: normalizeStoryFormat(entry.storyFormat),
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

  if (articles.length !== payload.articleBriefs.length) throw new Error('The newsroom edition was incomplete. Please try writing it again.');
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
    page.publicationId === publicationId ? { ...page, needsRegeneration: true, staleAt: edition.generatedAt } : page
  )),
  podcastEpisodes: (state.podcastEpisodes || []).map((episode) => (
    episode.publicationId === publicationId ? {
      ...episode,
      status: 'needs-regeneration',
      audioStatus: 'stale',
      staleAt: edition.generatedAt,
      chapters: [],
      segments: [],
      citedFactKeys: [],
    } : episode
  )),
});
