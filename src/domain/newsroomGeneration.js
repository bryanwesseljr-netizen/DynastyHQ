import { buildProgramCoverageContext } from './programCoverage.js';

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
    purpose: 'Write football analysis from actual performance, team statistical contrasts, role, production, and meaningful development. Never narrate ratings, progression currencies, meters, or tracker bookkeeping as football analysis.',
  },
  national: {
    byline: 'Nicole Benton · National College Football Writer',
    purpose: 'Frame the week inside the larger football season and career arc. Focus on team results, stakes, momentum, role, opportunity, and consequential developments without inventing outside reaction.',
  },
  'college-local': {
    byline: 'Rachel Monroe · Campus Beat Writer',
    purpose: 'Cover the college football program like a real local beat writer. The team and game are the default story; the tracked player becomes the focal point only when his role, playing time, performance, or a meaningful depth-chart event makes him newsworthy.',
  },
  'college-regional': {
    byline: 'Anthony Carter · Regional College Football Writer',
    purpose: 'Interpret the week through a regional college-football lens: game result, season trajectory, opponent context, depth-chart movement, development, conference/postseason implications, and program momentum. Do not default to a player profile.',
  },
});

const profileFor = (article = {}) => EDITORIAL_PROFILES[article.outletId]
  || EDITORIAL_PROFILES[article.theme]
  || {
    byline: `${clean(article.outletName, 80) || 'DynastyHQ'} Staff`,
    purpose: 'Write polished modern sports journalism with one clear football angle, useful context, realistic stakes, and a forward-looking close. Treat tracker mechanics as background only.',
  };

const factId = (fact, index) => fact.id || `${clean(fact.publicationId, 80) || 'career'}:${index}:${clean(fact.key, 140)}`;

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
  'rtg.coachTrust', 'rtg.trustToNext', 'rtg.skillPoints', 'rtg.weeklyPoints', 'rtg.energy',
  'rtg.gpa', 'rtg.examWeeks', 'rtg.academicsStanding', 'rtg.academicsAbility',
  'rtg.academicsCoachHappinessBonus', 'rtg.leadershipLevel', 'rtg.leadershipAbility',
  'rtg.leadershipCoachHappinessBonus', 'rtg.leadershipTeamXpMultiplier', 'rtg.leadershipComposureBonus',
  'rtg.healthLevel', 'rtg.injuryRisk', 'rtg.healthWearImpact', 'rtg.fitnessLevel',
  'rtg.fitnessCoachHappinessBonus', 'rtg.fitnessTeamXpMultiplier', 'rtg.fitnessComposureBonus',
  'rtg.fitnessWeightBonus', 'rtg.fitnessWearImpact', 'rtg.followers', 'rtg.brandTier',
  'rtg.nextFanMilestone', 'rtg.brandEngagement', 'rtg.dealTier', 'rtg.brandAbility',
  'rtg.nilWeeklyCost', 'rtg.openNilSlots', 'rtg.valuation', 'rtg.sponsorships',
  'rtg.coachHappiness', 'rtg.draftProjection',
]).has(key) || key.startsWith('rtg.wear.');

const editorialUseFor = (fact, { current = false, coverageStage = 'high-school' } = {}) => {
  const key = clean(fact?.key, 180);
  if (!key) return 'exclude';
  if (coverageStage === 'college-player' && isHighSchoolLegacyFact(key)) return 'exclude';
  if (coverageStage === 'college-player' && !current && key.startsWith('recruiting.')) return 'exclude';
  if (key.startsWith('program.') || key.startsWith('player.')) return fact.editorialUse || 'context';
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

const sourceFactsFor = (state, issue, coverageContext = null) => {
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

  const ledgerFacts = (state.factLedger || [])
    .filter((fact) => fact?.verified && allowedPublicationIds.has(fact.publicationId))
    .filter((fact) => {
      const current = matchesPublication(fact, publicationId);
      return editorialUseFor(fact, { current, coverageStage }) !== 'exclude';
    })
    .slice(-100)
    .map((fact, index) => {
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

  const derivedFacts = coverageStage === 'college-player'
    ? (coverageContext?.facts || []).map((fact, index) => ({ ...fact, id: factId(fact, ledgerFacts.length + index) }))
    : [];
  const byKeyAndPeriod = new Map();
  [...ledgerFacts, ...derivedFacts].forEach((fact) => {
    byKeyAndPeriod.set(`${fact.period}:${fact.key}`, fact);
  });
  return [...byKeyAndPeriod.values()];
};

const isPlayerPerformanceKey = (key) => [
  'game.passYds', 'game.passTD', 'game.rushYds', 'game.rushTD', 'game.int',
  'rtg.rank', 'player.didPlay', 'player.firstAppearance', 'player.roleChange',
].includes(key);

const programFact = (fact) => fact.key.startsWith('program.')
  || fact.key.startsWith('weekly.')
  || [
    'game.opponent', 'game.result', 'game.homeScore', 'game.awayScore',
    'game.teamTotalYards', 'game.opponentTotalYards', 'game.teamFirstDowns', 'game.opponentFirstDowns',
    'game.teamTurnovers', 'game.opponentTurnovers', 'game.teamRushYds', 'game.opponentRushYds',
    'game.teamPassYds', 'game.opponentPassYds', 'game.teamPossession', 'game.opponentPossession',
  ].includes(fact.key);

const focusFactsForPlan = ({ plan, facts, fallback }) => {
  const currentUseful = facts.filter((fact) => fact.period === 'current edition' && fact.editorialUse !== 'background-only');
  const programFacts = currentUseful.filter(programFact);
  const playerFacts = currentUseful.filter((fact) => isPlayerPerformanceKey(fact.key));
  let selected = [];
  if (['program-first', 'season-first', 'game-first'].includes(plan.subjectPriority)) {
    selected = [...programFacts];
    if (!/omit/.test(plan.playerMentionPolicy || '')) selected.push(...playerFacts);
  } else if (plan.subjectPriority === 'player-event' || plan.subjectPriority === 'player-and-game') {
    selected = [...playerFacts, ...programFacts];
  } else {
    selected = [...programFacts, ...playerFacts];
  }
  if (!selected.length) selected = fallback;
  return [...new Map(selected.map((fact) => [fact.id, fact])).values()];
};

const choosePlannedEntries = (issue, storyPlans = []) => {
  const entries = issue.articles || [];
  const byId = new Map(entries.map((entry) => [clean(entry.outletId || entry.id, 80), entry]));
  const used = new Set();
  const themeMatch = (plan) => {
    const desired = plan.outletId === 'national'
      ? ['national']
      : plan.outletId === 'filmroom'
        ? ['filmroom']
        : plan.outletId === 'college-local'
          ? ['local', 'broadsheet']
          : ['regional', 'filmroom', 'local'];
    return entries.find((entry) => !used.has(entry) && desired.includes(clean(entry.theme, 60)));
  };

  return storyPlans.flatMap((plan, index) => {
    let entry = byId.get(plan.outletId);
    if (!entry || used.has(entry)) entry = themeMatch(plan);
    if (!entry || used.has(entry)) entry = entries.find((candidate) => !used.has(candidate));
    if (!entry) return [];
    used.add(entry);
    return [{ plan, entry, coverageOutletId: plan.outletId, order: index }];
  });
};

export const buildNewsroomGenerationPayload = (state, publicationId) => {
  const issue = (state.newsroomIssues || []).find((entry) => matchesPublication(entry, publicationId));
  if (!issue?.articles?.length) throw new Error('Choose a published newsroom edition first.');
  const coverageStage = coverageStageFor(state, issue);
  const coverageContext = coverageStage === 'college-player' ? buildProgramCoverageContext(state, issue) : null;
  const facts = sourceFactsFor(state, issue, coverageContext);
  if (!facts.length) throw new Error('This edition has no published football facts available for writing.');

  const currentFactIdsByKey = new Map();
  facts.forEach((fact) => {
    if (fact.period !== 'current edition') return;
    const ids = currentFactIdsByKey.get(fact.key) || [];
    ids.push(fact.id);
    currentFactIdsByKey.set(fact.key, ids);
  });
  const currentPrimary = facts.filter((fact) => fact.period === 'current edition' && fact.editorialUse === 'primary');
  const currentContext = facts.filter((fact) => fact.period === 'current edition' && fact.editorialUse === 'context');
  const fallback = currentPrimary.length ? currentPrimary : currentContext;

  const plannedEntries = coverageStage === 'college-player'
    ? choosePlannedEntries(issue, coverageContext.storyPlans || [])
    : issue.articles.slice(0, 5).map((entry) => ({ plan: null, entry, coverageOutletId: entry.outletId || entry.id }));

  const articleBriefs = plannedEntries.map(({ plan, entry, coverageOutletId }) => {
    const profile = plan ? profileFor({ ...entry, outletId: coverageOutletId }) : profileFor(entry);
    let focusFacts;
    if (plan) {
      focusFacts = focusFactsForPlan({ plan, facts, fallback });
    } else {
      const requestedFocus = [...new Set((entry.citedFactKeys || [])
        .flatMap((key) => currentFactIdsByKey.get(key) || []))]
        .map((id) => facts.find((fact) => fact.id === id))
        .filter((fact) => fact && fact.editorialUse !== 'background-only');
      focusFacts = requestedFocus.length ? requestedFocus : fallback;
    }
    return {
      outletId: clean(entry.outletId || entry.id, 80),
      outletName: clean(entry.outletName, 120),
      desk: clean(entry.desk, 100),
      theme: clean(entry.theme, 60),
      byline: profile.byline,
      purpose: profile.purpose,
      storyType: clean(plan?.storyType, 80),
      angle: clean(plan?.angle, 1000),
      subjectPriority: clean(plan?.subjectPriority, 80),
      playerMentionPolicy: clean(plan?.playerMentionPolicy, 80),
      focusFactIds: [...new Set(focusFacts.map((fact) => fact.id))],
    };
  }).filter((brief) => brief.focusFactIds.length);

  if (!articleBriefs.length) throw new Error('This edition does not have a usable program-coverage assignment yet.');

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
    coveragePlan: coverageContext ? {
      program: coverageContext.program,
      playerRelevance: coverageContext.relevance,
      editorialPrinciple: 'The team/game is the default story. The tracked player becomes the story only when football relevance makes him the story.',
    } : null,
    player: {
      name: clean(state.player?.name, 120),
      school: clean(state.player?.school, 160),
      college: clean(state.player?.college, 160),
      position: clean(state.player?.pos, 40),
      number: clean(state.player?.number, 20),
      archetype: clean(state.player?.archetype, 80),
    },
    facts,
    articleBriefs,
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
    })).filter((section) => section.title && section.items.length >= 1).slice(0, 3);
    if (sectionHeadings.length < 1 || sidebars.length < 1) return null;

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
      readingMinutes: Math.max(1, Math.round(articleWords / 225)),
      editorialStatus: 'generated',
      generatedAt,
      articleModel: clean(model, 100),
      storyType: brief.storyType,
      subjectPriority: brief.subjectPriority,
      playerMentionPolicy: brief.playerMentionPolicy,
    };
  }).filter(Boolean);

  if (articles.length !== payload.articleBriefs.length) throw new Error('The newsroom edition was incomplete. Please try writing it again.');
  return { articles, generatedAt, model: clean(model, 100) };
};

export const applyGeneratedNewsroomEdition = (state, publicationId, edition) => ({
  ...state,
  newsroomIssues: (state.newsroomIssues || []).map((issue) => {
    if (!matchesPublication(issue, publicationId)) return issue;
    const existingByOutlet = new Map((issue.articles || []).map((article) => [article.outletId, article]));
    const articles = edition.articles.map((generated) => {
      const prior = existingByOutlet.get(generated.outletId) || {};
      return {
        ...prior,
        ...generated,
        id: prior.id || generated.outletId,
        outletId: generated.outletId,
        outletName: prior.outletName || generated.outletName,
        desk: prior.desk || generated.desk,
        theme: prior.theme || generated.theme,
      };
    });
    return {
      ...issue,
      editorialStatus: 'generated',
      editorialGeneratedAt: edition.generatedAt,
      editorialModel: edition.model,
      articles,
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