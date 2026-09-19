import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, ArrowLeft, ArrowRight, BookOpen, ChevronDown, FileImage, Flame, Globe2, Image as ImageIcon,
  LayoutGrid, MapPin, Newspaper, Radio, Settings2, Sparkles,
} from 'lucide-react';
import { resolveNewsroomMedia } from '../domain/newsroomMedia';
import { resolveNewsroomPresentation } from '../domain/newsroomPresentation';
import {
  resolveCareerTeamMediaProfile,
  resolveIssueTeamMediaProfile,
  sameProgram,
} from '../domain/teamMediaProfile';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import '../team-newsroom-hub.css';

const clean = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const officialPages = (article = {}) => list(article.pages)
  .filter((page) => clean(page.sourceImageUrl) || clean(page.body) || clean(page.summary) || clean(page.headline));

const officialRichness = (article = {}) => (
  (clean(article.body).length * 3)
  + officialPages(article).reduce((score, page) => score + clean(page.body).length + (clean(page.sourceImageUrl) ? 400 : 0), 0)
  + clean(article.dek || article.summary).length
);

const officialArticlePool = (career = {}) => {
  const merged = new Map();
  [
    ...list(career.eaSportsNetworkArticles),
    ...list(career.eaSportsNetwork),
    ...list(career.officialCoverage),
  ].forEach((entry) => {
    if (!entry) return;
    const season = Number(entry.season || 1) || 1;
    const week = Number(entry.week ?? 0) || 0;
    const headline = clean(entry.headline || entry.title);
    if (!headline && !clean(entry.body) && !clean(entry.summary || entry.dek)) return;
    const key = clean(entry.publicationId || entry.id) || `season-${season}-week-${week}:${headline.toLowerCase()}`;
    const current = merged.get(key);
    if (!current || officialRichness(entry) >= officialRichness(current)) merged.set(key, { ...current, ...entry, season, week, headline: headline || clean(current?.headline) });
  });
  return [...merged.values()].sort((left, right) => {
    const seasonDelta = (Number(right.season) || 0) - (Number(left.season) || 0);
    return seasonDelta || ((Number(right.week) || 0) - (Number(left.week) || 0));
  });
};

const findOfficialArticle = (articles = [], request = {}) => {
  const headline = clean(request.headline).toLowerCase();
  const season = Number(request.season);
  const week = Number(request.week);
  return articles.find((entry) => {
    if (headline && clean(entry.headline || entry.title).toLowerCase() !== headline) return false;
    if (Number.isFinite(season) && season > 0 && Number(entry.season || 1) !== season) return false;
    if (Number.isFinite(week) && week >= 0 && Number(entry.week ?? 0) !== week) return false;
    return true;
  }) || null;
};

const audienceFor = (story) => resolveNewsroomPresentation(story || {}).audience;
const isLocalStory = (story) => audienceFor(story) === 'local';
const isRegionalStory = (story) => audienceFor(story) === 'regional';
const isNationalStory = (story) => ['national', 'national-lead'].includes(audienceFor(story));

const storyForAudience = (issue, audience) => {
  const stories = Array.isArray(issue?.articles) ? issue.articles : [];
  if (audience === 'team') return stories.find(isLocalStory) || null;
  if (audience === 'regional') return stories.find(isRegionalStory) || null;
  if (audience === 'national') return stories.find(isNationalStory) || null;
  return null;
};

const publicationLabel = (story, profile) => {
  const audience = audienceFor(story);
  if (audience === 'local') return profile.localOutletName;
  if (audience === 'regional') return profile.regionalOutletName;
  if (audience === 'national' || audience === 'national-lead') return story?.outletName || profile.nationalOutletName;
  return story?.outletName || 'Newsroom';
};

const issueLabel = (issue) => clean(issue?.label) || `Season ${issue?.season || 1} · Week ${issue?.week ?? 0}`;

const resolveCardMedia = (career, issue, story) => {
  if (!story) return null;
  const theme = story.theme || story.outletId || '';
  const imageKey = theme === 'on3' ? 'on3' : theme;
  return resolveNewsroomMedia({
    article: story,
    mediaLibrary: career?.newsroomMediaLibrary || [],
    fallbackUrl: career?.outletImages?.[imageKey]
      || (audienceFor(story) === 'local' ? career?.outletImages?.local : '')
      || career?.outletImages?.broadsheet,
  });
};

const setNativeSelectValue = (select, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
  if (setter) setter.call(select, value);
  else select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
};

const openSavedStory = (issue, story) => {
  const select = document.querySelector('select[aria-label="Choose weekly newsroom edition"]');
  if (!select || !issue?.id || !story) return;
  setNativeSelectValue(select, issue.id);
  window.setTimeout(() => {
    const cards = [...document.querySelectorAll('.dhq-newsroom-story-card')];
    const target = cards.find((card) => clean(card.textContent).includes(clean(story.headline)));
    target?.click();
  }, 90);
};

const StoryRow = ({ career, issue, story, profile, compact = false }) => {
  const media = resolveCardMedia(career, issue, story);
  if (!story) return null;
  return (
    <button type="button" onClick={() => openSavedStory(issue, story)} className={`dhq-team-news-row ${compact ? 'dhq-team-news-row--compact' : ''}`}>
      {media?.url && <span className="dhq-team-news-row__image" aria-hidden="true"><img src={media.url} alt="" /></span>}
      <span className="dhq-team-news-row__copy">
        <span className="dhq-team-news-row__meta">{issueLabel(issue)} · {publicationLabel(story, profile)}</span>
        <strong>{story.headline}</strong>
        {!compact && story.dek && <span className="dhq-team-news-row__dek">{story.dek}</span>}
        <span className="dhq-team-news-row__action">Read story <ArrowRight size={13} /></span>
      </span>
    </button>
  );
};

const StoryTile = ({ career, entry, size = 'standard', eyebrow = '' }) => {
  if (!entry?.story) return null;
  const { issue, story, profile } = entry;
  const media = resolveCardMedia(career, issue, story);
  return (
    <button type="button" onClick={() => openSavedStory(issue, story)} className={`dhq-team-story-tile dhq-team-story-tile--${size}`}>
      <span className="dhq-team-story-tile__media" aria-hidden="true">
        {media?.url ? <img src={media.url} alt="" /> : <span className="dhq-team-story-tile__fallback"><Newspaper size={32} /></span>}
        <span className="dhq-team-story-tile__shade" />
      </span>
      <span className="dhq-team-story-tile__copy">
        <span className="dhq-team-story-tile__meta">{eyebrow || publicationLabel(story, profile)} · {issueLabel(issue)}</span>
        <strong>{story.headline}</strong>
        {size === 'feature' && story.dek && <small>{story.dek}</small>}
        <b>Read Story <ArrowRight size={13} /></b>
      </span>
    </button>
  );
};

const OfficialFeedCard = ({ article, onOpen }) => {
  const pages = officialPages(article);
  const hasBody = Boolean(clean(article.body) || pages.some((page) => clean(page.body)));
  const sourceImages = pages.filter((page) => clean(page.sourceImageUrl)).length;
  return (
    <button type="button" className="dhq-official-feed-card" onClick={() => onOpen(article)}>
      <span className="dhq-official-feed-card__brand"><Radio size={15} /> EA SPORTS NETWORK <b>OFFICIAL FEED</b></span>
      <span className="dhq-official-feed-card__week">SEASON {article.season || 1} · WEEK {article.week ?? 0}</span>
      <strong>{clean(article.headline || article.title) || 'Official game coverage'}</strong>
      {clean(article.dek || article.summary) ? <p>{clean(article.dek || article.summary)}</p> : null}
      <span className="dhq-official-feed-card__footer">
        <em><FileImage size={12} /> {pages.length || article.sourceFiles?.length || 1} PAGE{(pages.length || article.sourceFiles?.length || 1) === 1 ? '' : 'S'}</em>
        <em>{sourceImages ? 'ORIGINAL CAPTURE' : hasBody ? 'FULL TEXT' : 'WIRE BRIEF'}</em>
        <b>OPEN OFFICIAL FEED <ArrowRight size={13} /></b>
      </span>
    </button>
  );
};

const OfficialFeedReader = ({ career, article, onBack }) => {
  const pages = officialPages(article);
  const paragraphs = clean(article.body).split(/\n{2,}/).map((value) => value.trim()).filter(Boolean);
  const standfirst = clean(article.dek || article.summary);
  const hasBody = paragraphs.length > 0 || pages.some((page) => clean(page.body));
  const issue = list(career?.newsroomIssues).find((entry) => Number(entry.season || 1) === Number(article.season || 1) && Number(entry.week ?? 0) === Number(article.week ?? 0));
  const relatedStory = issue ? storyForAudience(issue, 'team') : null;

  return (
    <section className="dhq-official-feed-reader" aria-label="EA Sports Network official feed story">
      <button type="button" className="dhq-official-feed-reader__back" onClick={onBack}><ArrowLeft size={14} /> Official Feed</button>
      <div className="dhq-official-feed-reader__brand"><Radio size={16} /><span>EA <b>SPORTS</b> NETWORK</span><em>OFFICIAL IN-GAME REPORT</em></div>
      <p className="dhq-official-feed-reader__meta">SEASON {article.season || 1} · WEEK {article.week ?? 0} · COLLEGE FOOTBALL 27</p>
      <h1>{clean(article.headline || article.title) || 'Official game coverage'}</h1>
      {standfirst ? <p className="dhq-official-feed-reader__dek">{standfirst}</p> : null}
      {clean(article.byline) ? <p className="dhq-official-feed-reader__byline">{clean(article.byline)}</p> : null}

      {paragraphs.length ? (
        <div className="dhq-official-feed-reader__body">
          {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
        </div>
      ) : !hasBody ? (
        <div className="dhq-official-feed-reader__brief">
          <span>OFFICIAL WIRE BRIEF</span>
          <strong>Original headline and story brief preserved from this edition.</strong>
          <p>No additional article copy was captured for this game, so the Official Feed stops here rather than inventing missing text.</p>
        </div>
      ) : null}

      {pages.length ? (
        <div className="dhq-official-feed-reader__pages">
          <header><span>ORIGINAL CFB 27 COVERAGE</span><strong>{pages.length} captured page{pages.length === 1 ? '' : 's'}</strong></header>
          {pages.map((page, index) => (
            <figure key={`${page.sourceFileName || 'page'}-${index}`}>
              <figcaption><span>{page.pageLabel || `PAGE ${index + 1}`}</span><small>{page.sourceFileName || 'EA SPORTS Network capture'}</small></figcaption>
              {page.sourceImageUrl ? <img src={page.sourceImageUrl} alt={`EA SPORTS Network captured page ${index + 1}`} loading="lazy" /> : null}
              {!page.sourceImageUrl && page.body ? <p>{page.body}</p> : null}
            </figure>
          ))}
        </div>
      ) : null}

      {relatedStory ? (
        <div className="dhq-official-feed-reader__related">
          <span>RELATED DYNASTYHQ COVERAGE</span>
          <strong>{relatedStory.headline}</strong>
          <button type="button" onClick={() => openSavedStory(issue, relatedStory)}>READ DYNASTYHQ STORY <ArrowRight size={13} /></button>
        </div>
      ) : null}
    </section>
  );
};

const NewsroomTeamHubPortal = () => {
  const { career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [isHome, setIsHome] = useState(false);
  const [activeDesk, setActiveDesk] = useState('front');
  const [selectedOfficial, setSelectedOfficial] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;
    let ownedMount = null;
    let scheduled = false;

    const sync = () => {
      scheduled = false;
      const issueSelect = root.querySelector('select[aria-label="Choose weekly newsroom edition"]');
      if (!issueSelect) {
        setMount(null);
        setIsHome(false);
        if (ownedMount?.parentElement) ownedMount.remove();
        ownedMount = null;
        return;
      }

      const newsroomRoot = issueSelect.closest('.max-w-6xl');
      if (!newsroomRoot) return;
      const readerOpen = Boolean(newsroomRoot.querySelector('.dhq-news-article'));
      const frontPageOpen = Boolean(newsroomRoot.querySelector('[data-postgame-front-page], .dhq-postgame-front-page'));
      setIsHome(!readerOpen && !frontPageOpen);

      const pressRoom = issueSelect.closest('.rounded-2xl');
      if (pressRoom) pressRoom.classList.add('dhq-newsroom-owner-controls');

      const libraryHeading = [...newsroomRoot.querySelectorAll('h2')].find((node) => /career photo library/i.test(node.textContent || ''));
      const library = libraryHeading?.closest('section');
      if (library) library.classList.add('dhq-newsroom-owner-library');

      const weeklyCoverage = newsroomRoot.querySelector('#weekly-coverage-title')?.closest('section');
      if (weeklyCoverage) weeklyCoverage.classList.add('dhq-newsroom-legacy-coverage');

      newsroomRoot.classList.toggle('dhq-newsroom-tools-open', toolsOpen);
      newsroomRoot.classList.toggle('dhq-newsroom-library-open', libraryOpen);

      if (!ownedMount || !ownedMount.isConnected) {
        ownedMount = document.createElement('div');
        ownedMount.dataset.teamNewsroomHub = 'true';
        newsroomRoot.insertBefore(ownedMount, newsroomRoot.firstChild);
      }
      setMount((current) => current === ownedMount ? current : ownedMount);
    };

    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };
    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (ownedMount?.parentElement) ownedMount.remove();
    };
  }, [libraryOpen, toolsOpen]);

  useEffect(() => {
    if (!career) return undefined;
    const focusOfficial = (event) => {
      const articles = officialArticlePool(career);
      const matched = findOfficialArticle(articles, event.detail || {});
      setActiveDesk('official');
      setSelectedOfficial(matched);
    };
    window.addEventListener('dynastyhq:newsroom-official-focus', focusOfficial);
    return () => window.removeEventListener('dynastyhq:newsroom-official-focus', focusOfficial);
  }, [career]);

  const data = useMemo(() => {
    if (!career) return null;
    const issues = Array.isArray(career.newsroomIssues) ? career.newsroomIssues : [];
    const currentProfile = resolveCareerTeamMediaProfile(career);
    const currentIssues = issues
      .filter((issue) => sameProgram(issue?.outletProfile?.school, currentProfile.school))
      .sort((left, right) => {
        const seasonDelta = (Number(right.season) || 0) - (Number(left.season) || 0);
        return seasonDelta || ((Number(right.week) || 0) - (Number(left.week) || 0));
      });

    const storyEntries = (audience) => currentIssues
      .map((issue) => ({ issue, story: storyForAudience(issue, audience), profile: resolveIssueTeamMediaProfile(issue, career) }))
      .filter((entry) => entry.story);

    const allStops = new Map();
    issues.forEach((issue) => {
      const school = clean(issue?.outletProfile?.school);
      const story = storyForAudience(issue, 'team');
      if (!school || !story) return;
      if (!allStops.has(school)) allStops.set(school, []);
      allStops.get(school).push({ issue, story, profile: resolveIssueTeamMediaProfile(issue, career) });
    });

    return {
      currentProfile,
      currentIssues,
      teamEntries: storyEntries('team'),
      regionalEntries: storyEntries('regional'),
      nationalEntries: storyEntries('national'),
      officialEntries: officialArticlePool(career),
      archiveGroups: [...allStops.entries()].reverse(),
    };
  }, [career]);

  if (!mount || !isHome || !career || !data || !data.currentIssues.length) return null;

  const { currentProfile: profile, teamEntries, regionalEntries, nationalEntries, officialEntries, archiveGroups } = data;
  const deskEntries = activeDesk === 'regional' ? regionalEntries : activeDesk === 'national' ? nationalEntries : teamEntries;
  const featured = teamEntries[0];
  const featuredMedia = featured ? resolveCardMedia(career, featured.issue, featured.story) : null;
  const latestRegional = regionalEntries[0];
  const latestNational = nationalEntries[0];
  const latestOfficial = officialEntries[0] || null;
  const latestTeamStories = teamEntries.slice(1);
  const trending = [
    ...teamEntries.slice(0, 2).map((entry) => ({
      id: `team-${entry.issue.id}-${entry.story.id}`,
      source: 'DYNASTYHQ',
      headline: entry.story.headline,
      action: () => openSavedStory(entry.issue, entry.story),
      season: Number(entry.issue.season || 1),
      week: Number(entry.issue.week ?? 0),
    })),
    ...(latestOfficial ? [{
      id: `official-${latestOfficial.publicationId || latestOfficial.id || latestOfficial.headline}`,
      source: 'EA SPORTS',
      headline: clean(latestOfficial.headline || latestOfficial.title),
      action: () => { setSelectedOfficial(latestOfficial); setActiveDesk('official'); },
      season: Number(latestOfficial.season || 1),
      week: Number(latestOfficial.week ?? 0),
    }] : []),
    ...(latestRegional ? [{
      id: `regional-${latestRegional.issue.id}-${latestRegional.story.id}`,
      source: 'REGIONAL',
      headline: latestRegional.story.headline,
      action: () => openSavedStory(latestRegional.issue, latestRegional.story),
      season: Number(latestRegional.issue.season || 1),
      week: Number(latestRegional.issue.week ?? 0),
    }] : []),
    ...(latestNational ? [{
      id: `national-${latestNational.issue.id}-${latestNational.story.id}`,
      source: 'NATIONAL',
      headline: latestNational.story.headline,
      action: () => openSavedStory(latestNational.issue, latestNational.story),
      season: Number(latestNational.issue.season || 1),
      week: Number(latestNational.issue.week ?? 0),
    }] : []),
  ]
    .filter((entry) => clean(entry.headline))
    .sort((left, right) => (right.season - left.season) || (right.week - left.week))
    .filter((entry, index, items) => items.findIndex((candidate) => candidate.headline === entry.headline) === index)
    .slice(0, 4);
  const currentSeason = featured?.issue?.season || data.currentIssues[0]?.season || 1;
  const currentWeek = featured?.issue?.week ?? data.currentIssues[0]?.week ?? 0;

  return createPortal(
    <section
      className="dhq-team-newsroom"
      style={{
        '--team-primary': profile.primary,
        '--team-secondary': profile.secondary,
        '--team-accent': profile.accent,
      }}
    >
      <div className="dhq-team-newsroom__program-bar">
        <div className="dhq-team-newsroom__program-mark"><span>FB</span><strong>{profile.teamNewsLabel}</strong></div>
        <div className="dhq-team-newsroom__program-meta"><MapPin size={12} /> {profile.city} <span>·</span> Season {currentSeason} <span>·</span> Week {currentWeek}</div>
      </div>

      <header
        className="dhq-team-newsroom__masthead"
        style={featuredMedia?.url ? { backgroundImage: `linear-gradient(90deg, rgba(2,5,9,.96) 0%, rgba(2,5,9,.78) 48%, rgba(2,5,9,.28) 100%), url(${featuredMedia.url})` } : undefined}
      >
        <div className="dhq-team-newsroom__masthead-copy">
          <p className="dhq-team-newsroom__eyebrow">DynastyHQ Newsroom</p>
          <h1>{profile.nickname}</h1>
          <h2>Football</h2>
          <p>{profile.teamNewsTagline}</p>
          <div className="dhq-team-newsroom__masthead-badges"><span>{profile.localOutletName}</span><span>{profile.localMotto}</span></div>
        </div>
      </header>

      <nav className="dhq-team-newsroom__desks" aria-label="Newsroom desks">
        <button type="button" data-active={activeDesk === 'front'} onClick={() => { setSelectedOfficial(null); setActiveDesk('front'); }}><LayoutGrid size={15} /> Front Page</button>
        <button type="button" data-active={activeDesk === 'team'} onClick={() => { setSelectedOfficial(null); setActiveDesk('team'); }}><Newspaper size={15} /> {profile.nickname} News <span>{teamEntries.length}</span></button>
        <button type="button" data-active={activeDesk === 'regional'} onClick={() => { setSelectedOfficial(null); setActiveDesk('regional'); }}><BookOpen size={15} /> Regional <span>{regionalEntries.length}</span></button>
        <button type="button" data-active={activeDesk === 'national'} onClick={() => { setSelectedOfficial(null); setActiveDesk('national'); }}><Globe2 size={15} /> National <span>{nationalEntries.length}</span></button>
        <span className="dhq-team-newsroom__desk-divider" aria-hidden="true" />
        <button type="button" className="is-official-desk" data-active={activeDesk === 'official'} onClick={() => { setSelectedOfficial(null); setActiveDesk('official'); }}><Radio size={15} /><span className="dhq-team-newsroom__official-tab-copy"><b>EA SPORTS NETWORK</b><small>Official Feed</small></span><span>{officialEntries.length}</span></button>
      </nav>

      {activeDesk === 'front' && featured ? (
        <>
          <div className="dhq-team-newsroom__trending">
            <div className="dhq-team-newsroom__trending-label"><Flame size={14} /> Trending</div>
            <div className="dhq-team-newsroom__trending-track">
              {trending.map((entry, index) => (
                <button key={entry.id} type="button" onClick={entry.action}>
                  <span>0{index + 1}</span>
                  <em>{entry.source}</em>
                  <strong>{entry.headline}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="dhq-team-newsroom__lead-grid">
            <StoryTile career={career} entry={featured} size="feature" eyebrow="Featured Story" />
            <div className="dhq-team-newsroom__lead-rail">
              {latestTeamStories.slice(0, 2).map((entry) => <StoryTile key={`${entry.issue.id}-${entry.story.id}`} career={career} entry={entry} size="rail" />)}
              {!latestTeamStories.length && latestRegional && <StoryTile career={career} entry={latestRegional} size="rail" eyebrow="Regional Spotlight" />}
              {latestTeamStories.length < 2 && latestNational && <StoryTile career={career} entry={latestNational} size="rail" eyebrow="National Spotlight" />}
            </div>
          </div>

          <section className="dhq-team-newsroom__latest">
            <div className="dhq-team-newsroom__section-heading">
              <div><span>Team Coverage</span><h2>Latest {profile.nickname} News</h2></div>
              <small>{teamEntries.length} published team {teamEntries.length === 1 ? 'story' : 'stories'}</small>
            </div>
            <div className="dhq-team-newsroom__card-grid">
              {latestTeamStories.map((entry) => <StoryTile key={`${entry.issue.id}-${entry.story.id}`} career={career} entry={entry} />)}
              {!latestTeamStories.length && <p className="dhq-team-newsroom__empty">The first team story is on the board. Each future played game can add another chapter here.</p>}
            </div>
          </section>

          <section className="dhq-team-newsroom__outside">
            <div className="dhq-team-newsroom__section-heading">
              <div><span>Outside Attention</span><h2>Around the Program</h2></div>
              <small>Regional and national coverage appears when earned</small>
            </div>
            <div className="dhq-team-newsroom__outside-grid">
              {latestOfficial ? <OfficialFeedCard article={latestOfficial} onOpen={(article) => { setSelectedOfficial(article); setActiveDesk('official'); }} /> : <div className="dhq-team-newsroom__outside-empty"><Radio size={22} /><strong>EA Sports Network</strong><span>Official in-game coverage appears here when captured.</span></div>}
              {latestRegional ? <StoryTile career={career} entry={latestRegional} eyebrow={profile.regionalOutletName} /> : <div className="dhq-team-newsroom__outside-empty"><BookOpen size={22} /><strong>Regional Desk</strong><span>No regional story has been called for yet.</span></div>}
              {latestNational ? <StoryTile career={career} entry={latestNational} eyebrow="National Spotlight" /> : <div className="dhq-team-newsroom__outside-empty"><Sparkles size={22} /><strong>National Spotlight</strong><span>National coverage appears when the career earns it.</span></div>}
            </div>
          </section>
        </>
      ) : activeDesk === 'team' ? (
        <section className="dhq-team-newsroom__latest dhq-team-newsroom__desk-page">
          <div className="dhq-team-newsroom__section-heading">
            <div><span>Team Coverage</span><h2>{profile.nickname} News</h2></div>
            <small>{teamEntries.length} published team {teamEntries.length === 1 ? 'story' : 'stories'}</small>
          </div>
          <div className="dhq-team-newsroom__card-grid">
            {teamEntries.map((entry) => <StoryTile key={`${entry.issue.id}-${entry.story.id}`} career={career} entry={entry} />)}
            {!teamEntries.length && <p className="dhq-team-newsroom__empty">No team stories have been published yet.</p>}
          </div>
        </section>
      ) : activeDesk === 'official' ? (
        selectedOfficial ? (
          <OfficialFeedReader career={career} article={selectedOfficial} onBack={() => setSelectedOfficial(null)} />
        ) : (
          <section className="dhq-team-newsroom__latest dhq-team-newsroom__desk-page dhq-team-newsroom__official-desk">
            <div className="dhq-team-newsroom__section-heading">
              <div><span>Official game-world wire service</span><h2>EA Sports Network</h2></div>
              <small>{officialEntries.length} preserved official {officialEntries.length === 1 ? 'story' : 'stories'}</small>
            </div>
            <p className="dhq-team-newsroom__official-intro">The in-game media record from College Football 27. DynastyHQ preserves these stories as the official layer and keeps its own reporting separate.</p>
            <div className="dhq-official-feed-grid">
              {officialEntries.map((article) => <OfficialFeedCard key={clean(article.publicationId || article.id) || `${article.season}-${article.week}-${article.headline}`} article={article} onOpen={setSelectedOfficial} />)}
              {!officialEntries.length && <p className="dhq-team-newsroom__empty">No EA SPORTS Network story has been captured yet. When one is included in Session Import, it will live here permanently.</p>}
            </div>
          </section>
        )
      ) : (
        <section className="dhq-team-newsroom__latest dhq-team-newsroom__desk-page">
          <div className="dhq-team-newsroom__section-heading">
            <div><span>{activeDesk === 'regional' ? profile.regionalOutletName : 'National Spotlight'}</span><h2>{activeDesk === 'regional' ? 'Regional Coverage' : 'National Coverage'}</h2></div>
            <small>{deskEntries.length} {deskEntries.length === 1 ? 'story' : 'stories'}</small>
          </div>
          <div className="dhq-team-newsroom__card-grid">
            {deskEntries.map((entry) => <StoryTile key={`${entry.issue.id}-${entry.story.id}`} career={career} entry={entry} />)}
            {!deskEntries.length && <p className="dhq-team-newsroom__empty">Nothing has been published on this desk yet. That is intentional—outside coverage is earned by the career.</p>}
          </div>
        </section>
      )}

      <div className="dhq-team-newsroom__utility-grid">
        <details className="dhq-team-newsroom__archive">
          <summary><Archive size={15} /> Career News Archive <ChevronDown size={14} /></summary>
          <div>
            {archiveGroups.map(([school, entries]) => (
              <details key={school}>
                <summary><strong>{school}</strong><span>{entries.length} team {entries.length === 1 ? 'story' : 'stories'}</span></summary>
                <div className="dhq-team-newsroom__archive-list">
                  {[...entries].reverse().map((entry) => <StoryRow key={`${entry.issue.id}-${entry.story.id}`} career={career} {...entry} compact />)}
                </div>
              </details>
            ))}
          </div>
        </details>

        <div className="dhq-team-newsroom__owner-tools">
          <button type="button" data-active={toolsOpen} onClick={() => setToolsOpen((value) => !value)}><Settings2 size={14} /> Newsroom Controls</button>
          <button type="button" data-active={libraryOpen} onClick={() => setLibraryOpen((value) => !value)}><ImageIcon size={14} /> Media Library</button>
        </div>
      </div>
    </section>,
    mount,
  );
};

export default NewsroomTeamHubPortal;
