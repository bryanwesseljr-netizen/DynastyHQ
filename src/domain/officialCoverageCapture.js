const clean = (value, max = 1200) => String(value ?? '').trim().slice(0, max);

const collection = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value && typeof value === 'object') return Object.values(value).filter(Boolean);
  return [];
};

const normalizeSpace=(value)=>clean(value,20000).replace(/\s+/g,' ').trim();
const normalizeCompare=(value)=>normalizeSpace(value).toLowerCase();

const mergeTextWithOverlap=(left='',right='')=>{
  const a=clean(left,20000);
  const b=clean(right,20000);
  if(!a) return b;
  if(!b) return a;

  const aNorm=normalizeCompare(a);
  const bNorm=normalizeCompare(b);
  if(aNorm.includes(bNorm)) return a;
  if(bNorm.includes(aNorm)) return b;

  const aCompact=normalizeSpace(a);
  const bCompact=normalizeSpace(b);
  const aLower=aCompact.toLowerCase();
  const bLower=bCompact.toLowerCase();
  const max=Math.min(aLower.length,bLower.length);
  let overlap=0;
  for(let size=max;size>=24;size-=1){
    if(aLower.slice(-size)===bLower.slice(0,size)){
      overlap=size;
      break;
    }
  }
  if(overlap){
    return (aCompact+bCompact.slice(overlap)).trim();
  }

  const leftParagraphs=a.split(/\n\s*\n/).map((item)=>item.trim()).filter(Boolean);
  const seen=new Set(leftParagraphs.map(normalizeCompare));
  const additions=b.split(/\n\s*\n/).map((item)=>item.trim()).filter(Boolean)
    .filter((item)=>!seen.has(normalizeCompare(item)));
  return additions.length ? [...leftParagraphs,...additions].join('\n\n') : a;
};

const expandedPages=(entries=[])=>collection(entries).flatMap((entry,index)=>{
  const sourcePages=collection(entry?.sourcePages || entry?.screenshotPages);
  if(sourcePages.length){
    return sourcePages.map((page,pageIndex)=>({
      ...page,
      headline:clean(page?.headline || entry?.headline,320),
      dek:clean(page?.dek || entry?.dek,1800),
      byline:clean(page?.byline || entry?.byline,300),
      pageLabel:clean(page?.pageLabel || entry?.pageLabel,220),
      body:clean(page?.body,12000),
      fileName:clean(page?.fileName || page?.sourceFileName,200),
      imageDataUrl:page?.imageDataUrl || '',
      screenshotUrl:clean(page?.screenshotUrl,1600),
      screenshotStoragePath:clean(page?.screenshotStoragePath,1600),
      screenshotMimeType:clean(page?.screenshotMimeType,120),
      screenshotSizeBytes:Number(page?.screenshotSizeBytes)||0,
      pageNumber:Number(page?.pageNumber)||pageIndex+1,
      _order:index*100+pageIndex,
    }));
  }
  return [{
    headline:clean(entry?.headline,320),
    dek:clean(entry?.dek,1800),
    byline:clean(entry?.byline,300),
    pageLabel:clean(entry?.pageLabel,220),
    body:clean(entry?.body,12000),
    fileName:clean(entry?.fileName || entry?.sourceFileName,200),
    imageDataUrl:entry?.imageDataUrl || '',
    screenshotUrl:clean(entry?.screenshotUrl,1600),
    screenshotStoragePath:clean(entry?.screenshotStoragePath,1600),
    screenshotMimeType:clean(entry?.screenshotMimeType,120),
    screenshotSizeBytes:Number(entry?.screenshotSizeBytes)||0,
    pageNumber:Number(entry?.pageNumber)||index+1,
    _order:index,
  }];
});

const dedupePages=(pages=[])=>{
  const seen=new Set();
  return pages
    .slice()
    .sort((a,b)=>(Number(a._order)||0)-(Number(b._order)||0))
    .filter((page)=>{
      const signature=[
        clean(page?.fileName,200).toLowerCase(),
        normalizeCompare(page?.body).slice(0,260),
        clean(page?.screenshotUrl,800).toLowerCase(),
      ].join('|');
      if(seen.has(signature)) return false;
      seen.add(signature);
      return true;
    })
    .map((page,index)=>({...page,pageNumber:index+1}));
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
    headline: genericTitle ? '' : headline,
    dek: articleDek,
    byline: articleByline,
    body: articleBody,
    pageLabel,
    summary: articleDek || summary || (articleBody ? articleBody.slice(0, 900) : 'Official in-game coverage captured from College Football 27.'),
    sourceFileName: clean(fileName, 200),
    capturedAt: new Date().toISOString(),
  };
};

export const mergeOfficialCoveragePages=(entries=[])=>{
  const pages=dedupePages(expandedPages(entries));
  if(!pages.length) return null;

  const headline=pages.map((page)=>clean(page.headline,320))
    .find((value)=>value && !/^ea\s*sports(?:\s+network)?(?:\s+game\s+coverage)?$/i.test(value))
    || 'EA SPORTS Network game coverage';
  const dek=pages.map((page)=>clean(page.dek,1800)).find(Boolean) || '';
  const byline=pages.map((page)=>clean(page.byline,300)).find(Boolean) || '';
  const pageLabel=pages.map((page)=>clean(page.pageLabel,220)).find(Boolean) || 'EA SPORTS NETWORK';
  const body=pages.reduce((combined,page)=>mergeTextWithOverlap(combined,page.body),'');
  const sourcePages=pages.map(({_order,...page})=>page);
  const firstImagePage=sourcePages.find((page)=>page.screenshotUrl || page.imageDataUrl) || sourcePages[0] || {};

  return {
    outlet:'EA SPORTS Network',
    headline,
    dek,
    byline,
    body,
    pageLabel,
    summary:dek || (body ? body.slice(0,900) : 'Official in-game coverage captured from College Football 27.'),
    pageCount:sourcePages.length,
    sourcePages,
    sourceFileName:sourcePages.map((page)=>page.fileName).filter(Boolean).join(' · '),
    screenshotUrl:firstImagePage.screenshotUrl || '',
    screenshotStoragePath:firstImagePage.screenshotStoragePath || '',
    screenshotMimeType:firstImagePage.screenshotMimeType || '',
    screenshotSizeBytes:Number(firstImagePage.screenshotSizeBytes)||0,
    capturedAt:new Date().toISOString(),
  };
};

const WISCONSIN_WEEK_12_PAGE_1=`Winning is always nice, but doing so behind a season-high score is even better (just ask Oregon). The Ducks took their contest on Saturday with ease, bagging a 59-17 win over the Wisconsin Badgers. The victory is more of the same for the Ducks, who have now won four games in a row.

It was another big night for Bryan Wessel, who threw for 334 yards and 5 TDs (1 INT) while completing 76.5% of his passes. Those 334 passing yards set a new season-high mark for Wessel. Brandon Smith helped Wessel out on the ground, rushing for 125 yards and a pair of touchdowns on only 10 carries.`;

const WISCONSIN_WEEK_12_PAGE_2=`The win improved Oregon's record to 7-3. As for Wisconsin, they dropped their record down to 3-7 with the defeat, which was their fifth straight at home.

Looking ahead, Oregon and Washington will face off in a Big Ten clash at 9:15 p.m. on Saturday. The Ducks have to be circling this as a 'W' on the schedule, but we'll see soon enough if they can make that a reality. As for Wisconsin, they are also set to square off against Iowa in a Big Ten battle at 1:00 p.m. on Saturday. The Badgers sure do not have the rankings advantage, meaning they'll be fighting a steep uphill battle. Coach O'Brien embraced the underdog role: "Nobody's giving us a chance, which is exactly how we like it."`;

export const applyOfficialCoverageLegacyBackfill=(entry={},context={})=>{
  const season=Number(context?.season ?? entry?.season);
  const week=Number(context?.week ?? entry?.week);
  const opponent=clean(context?.opponent,180).toLowerCase();
  const headline=clean(entry?.headline,320);
  const body=clean(entry?.body,20000);
  const isWisconsinWeek12=season===4 && week===12
    && (opponent==='wisconsin' || /wisconsin/i.test(body))
    && (/statement win/i.test(headline) || /59-17/.test(body));
  if(!isWisconsinWeek12) return entry;

  const fullBody=mergeTextWithOverlap(WISCONSIN_WEEK_12_PAGE_1,WISCONSIN_WEEK_12_PAGE_2);
  const alreadyComplete=/The win improved Oregon's record to 7-3/.test(body) && /Nobody's giving us a chance/.test(body);
  const sourcePages=collection(entry?.sourcePages).length
    ? entry.sourcePages
    : [
      {pageNumber:1,fileName:'Week 12 Wisconsin · EA SPORTS Network · page 1',body:WISCONSIN_WEEK_12_PAGE_1},
      {pageNumber:2,fileName:'Week 12 Wisconsin · EA SPORTS Network · page 2',body:WISCONSIN_WEEK_12_PAGE_2},
    ];
  return {
    ...entry,
    headline:headline || 'STATEMENT WIN',
    body:alreadyComplete ? body : fullBody,
    summary:clean(entry?.summary,1800) || WISCONSIN_WEEK_12_PAGE_1.slice(0,900),
    pageCount:Math.max(Number(entry?.pageCount)||0,2),
    sourcePages,
    legacyBackfillId:'s4-w12-wisconsin-ea-network',
  };
};

export const officialCoverageForWeek = (state = {}, season = 1, week = 1) => {
  const publicationId = publicationIdFor(season, week);
  const pools = [
    ...collection(state.eaSportsNetworkArticles),
    ...collection(state.eaSportsNetwork),
    ...collection(state.officialCoverage),
  ];
  const explicitMatches = pools.filter((entry) => matchesOfficialCoverageWeek(entry, season, week, publicationId));
  if (explicitMatches.length) {
    const merged=mergeOfficialCoveragePages(explicitMatches) || explicitMatches[0];
    return {
      kind: 'official',
      entry: applyOfficialCoverageLegacyBackfill(merged,{season,week}),
      publicationId,
    };
  }

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
