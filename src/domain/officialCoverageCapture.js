const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);

const collection = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

export const publicationIdFor = (season = 1, week = 1) => `season-${Number(season) || 1}-week-${Number(week) || 1}`;

export const matchesOfficialCoverageWeek = (entry = {}, season = 1, week = 1, publicationId = publicationIdFor(season, week)) => (
  entry?.publicationId === publicationId
  || entry?.weekKey === publicationId
  || entry?.id === publicationId
  || (Number(entry?.season || 1) === Number(season || 1) && Number(entry?.week) === Number(week))
);

const officialSignal = (value) => /\bea\s*sports(?:\s+network)?\b|\bofficial\s+(?:in[- ]game\s+)?(?:media|coverage|article|news)\b/i.test(clean(value, 5000));

export const officialCoverageCandidateFromAnalysis = ({ analysis = {}, fileName = '' } = {}) => {
  const article = analysis?.officialArticle && typeof analysis.officialArticle === 'object'
    ? analysis.officialArticle
    : {};
  const screenTitle = clean(analysis?.screenTitle, 260);
  const summary = clean(analysis?.summary, 1800);
  const detectedTypes = collection(analysis?.screenTypes).join(' ');
  const outlet = clean(article.outlet, 160);
  const articleHeadline = clean(article.headline, 320);
  const articleDek = clean(article.dek, 1800);
  const articleByline = clean(article.byline, 300);
  const articleBody = clean(article.body, 12000);
  const pageLabel = clean(article.pageLabel, 220);
  const explicitArticleType = /ea_sports_network_article/i.test(detectedTypes);
  const evidence = [outlet, articleHeadline, screenTitle, summary, detectedTypes, clean(fileName, 200)].filter(Boolean).join(' · ');
  if (!explicitArticleType && !officialSignal(evidence)) return null;

  const headline = articleHeadline || screenTitle;
  const genericTitle = !headline || /^ea\s*sports(?:\s+network)?$/i.test(headline) || /^official\s+(?:game\s+)?coverage$/i.test(headline);
  return {
    outlet: 'EA SPORTS Network',
    headline: genericTitle ? 'EA SPORTS Network game coverage' : headline,
    dek: articleDek,
    byline: articleByline,
    body: articleBody,
    pageLabel,
    summary: articleDek || summary || (articleBody ? articleBody.slice(0, 900) : 'Official in-game coverage captured from College Football 27.'),
    sourceFileName: clean(fileName, 200),
    capturedAt: new Date().toISOString(),
  };
};

export const officialCoverageForWeek = (state = {}, season = 1, week = 1) => {
  const publicationId = publicationIdFor(season, week);
  const pools = [
    ...collection(state.eaSportsNetworkArticles),
    ...collection(state.eaSportsNetwork),
    ...collection(state.officialCoverage),
  ];
  const explicit = pools.find((entry) => matchesOfficialCoverageWeek(entry, season, week, publicationId));
  if (explicit) return { kind: 'official', entry: explicit, publicationId };

  const update = collection(state.weeklyUpdates)
    .find((entry) => matchesOfficialCoverageWeek(entry, season, week, publicationId));
  const preservedSources = collection(update?.sources || update?.sourceMetadata);
  const source = preservedSources.find((entry) => officialSignal([
    entry?.screenTitle,
    entry?.summary,
    entry?.fileName,
    collection(entry?.detectedTypes).join(' '),
  ].filter(Boolean).join(' · ')));
  if (source) {
    return {
      kind: 'source',
      publicationId,
      entry: {
        outlet: 'EA SPORTS Network',
        headline: clean(source.screenTitle, 220) || 'EA SPORTS Network game coverage',
        summary: clean(source.summary, 1200) || 'Official in-game coverage was captured with this week.',
        sourceFileName: clean(source.fileName, 200),
      },
    };
  }

  if (update && Number(update.sourceCount) > 0) {
    const coverageReference = collection(state.coverageReferences)
      .find((entry) => matchesOfficialCoverageWeek(entry, season, week, publicationId));
    return {
      kind: 'legacy-import',
      publicationId,
      sourceCount: Number(update.sourceCount) || 0,
      coverageFactCount: Number(coverageReference?.factCount) || 0,
    };
  }

  return { kind: 'missing', publicationId };
};
