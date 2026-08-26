import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Archive, ArrowRight, BookOpen, ChevronDown, Flame, Globe2, Image as ImageIcon,
  MapPin, Newspaper, Settings2, Sparkles,
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

const NewsroomTeamHubPortal = () => {
  const { career } = useOwnerCareer();
  const [mount, setMount] = useState(null);
  const [isHome, setIsHome] = useState(false);
  const [activeDesk, setActiveDesk] = useState('team');
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
      archiveGroups: [...allStops.entries()].reverse(),
    };
  }, [career]);

  if (!mount || !isHome || !career || !data || !data.currentIssues.length) return null;

  const { currentProfile: profile, teamEntries, regionalEntries, nationalEntries, archiveGroups } = data;
  const deskEntries = activeDesk === 'regional' ? regionalEntries : activeDesk === 'national' ? nationalEntries : teamEntries;
  const featured = teamEntries[0];
  const featuredMedia = featured ? resolveCardMedia(career, featured.issue, featured.story) : null;
  const latestRegional = regionalEntries[0];
  const latestNational = nationalEntries[0];
  const trending = teamEntries.slice(0, 3);
  const latestTeamStories = teamEntries.slice(1);
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
          <p className="dhq-team-newsroom__eyebrow">DynastyHQ Team Desk</p>
          <h1>{profile.nickname}</h1>
          <h2>Football</h2>
          <p>{profile.teamNewsTagline}</p>
          <div className="dhq-team-newsroom__masthead-badges"><span>{profile.localOutletName}</span><span>{profile.localMotto}</span></div>
        </div>
      </header>

      <nav className="dhq-team-newsroom__desks" aria-label="Newsroom desks">
        <button type="button" data-active={activeDesk === 'team'} onClick={() => setActiveDesk('team')}><Newspaper size={15} /> Team News <span>{teamEntries.length}</span></button>
        <button type="button" data-active={activeDesk === 'regional'} onClick={() => setActiveDesk('regional')}><BookOpen size={15} /> Regional <span>{regionalEntries.length}</span></button>
        <button type="button" data-active={activeDesk === 'national'} onClick={() => setActiveDesk('national')}><Globe2 size={15} /> National <span>{nationalEntries.length}</span></button>
      </nav>

      {activeDesk === 'team' && featured ? (
        <>
          <div className="dhq-team-newsroom__trending">
            <div className="dhq-team-newsroom__trending-label"><Flame size={14} /> Trending</div>
            <div className="dhq-team-newsroom__trending-track">
              {trending.map((entry, index) => (
                <button key={`${entry.issue.id}-${entry.story.id}`} type="button" onClick={() => openSavedStory(entry.issue, entry.story)}><span>0{index + 1}</span>{entry.story.headline}</button>
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
              {latestRegional ? <StoryTile career={career} entry={latestRegional} eyebrow={profile.regionalOutletName} /> : <div className="dhq-team-newsroom__outside-empty"><BookOpen size={22} /><strong>Regional Desk</strong><span>No regional story has been called for yet.</span></div>}
              {latestNational ? <StoryTile career={career} entry={latestNational} eyebrow="National Spotlight" /> : <div className="dhq-team-newsroom__outside-empty"><Sparkles size={22} /><strong>National Spotlight</strong><span>National coverage appears when the career earns it.</span></div>}
            </div>
          </section>
        </>
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
