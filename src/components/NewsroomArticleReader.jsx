import { Clock3, Share2 } from 'lucide-react';
import {
  buildEditorialExtras, presentationVariables, resolveNewsroomPresentation,
} from '../domain/newsroomPresentation';
import '../newsroom-v3.css';
import '../newsroom-local-bearcats.css';
import '../newsroom-regional-enquirer.css';
import '../newsroom-national-espn.css';

const LOCAL_OUTLET = 'Bearcats Insider';
const LOCAL_AUTHOR = 'Justin Williams';
const LOCAL_AUTHOR_ROLE = 'Senior Staff Writer, Bearcats Insider';
const REGIONAL_OUTLET = 'Cincinnati Enquirer';
const REGIONAL_AUTHOR = 'Alex Harrison';
const REGIONAL_AUTHOR_ROLE = 'Senior Sports Writer';
const NATIONAL_OUTLET = 'ESPN';

const dateFrom = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatPublishedDate = (value) => {
  const date = dateFrom(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const formatLocalPublishedDate = (value) => {
  const date = dateFrom(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
};

const formatRegionalPublishedDate = (value) => {
  const date = dateFrom(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  }).format(date);
};

const headingPositions = (paragraphCount, headingCount) => {
  if (paragraphCount < 2 || !headingCount) return [];
  return Array.from({ length: headingCount }, (_, index) => (
    Math.min(paragraphCount - 1, Math.max(1, Math.round(((index + 1) * paragraphCount) / (headingCount + 1))))
  ));
};

const headlineSize = (headline = '') => {
  const text = String(headline).trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (text.length > 86 || words > 13) return 'long';
  if (text.length > 62 || words > 9) return 'medium';
  return 'short';
};

const nationalSidebarParts = (item = '') => {
  const text = String(item).trim();
  const match = text.match(/(^|\s)(#?\d[\d,.]*(?:[-–]\d[\d,.]*)?%?)(?=\s|$|[,:;])/);
  if (!match) return { value: '', detail: text };
  const value = match[2];
  const start = match.index + match[1].length;
  const detail = `${text.slice(0, start)}${text.slice(start + value.length)}`
    .replace(/^[\s|:;—–-]+|[\s|:;—–-]+$/g, '')
    .replace(/\s{2,}/g, ' ');
  return { value, detail: detail || text };
};

const NewsroomArticleReader = ({ issue, story, featureImage, currentMedia }) => {
  const presentation = resolveNewsroomPresentation(story);
  const extras = buildEditorialExtras({ story, issue });
  const isLocal = extras.audience === 'local';
  const isRegional = extras.audience === 'regional';
  const isNational = extras.audience === 'national' || extras.audience === 'national-lead';
  const displayOutletName = isLocal
    ? LOCAL_OUTLET
    : isRegional
      ? REGIONAL_OUTLET
      : isNational
        ? NATIONAL_OUTLET
        : story.outletName;
  const paragraphs = Array.isArray(story.paragraphs) ? story.paragraphs : [];
  const sectionAt = new Map(headingPositions(paragraphs.length, extras.sectionHeadings.length)
    .map((position, index) => [position, extras.sectionHeadings[index]]));
  const dateValue = issue.publishedAt || issue.editorialGeneratedAt;
  const publishedDate = isLocal
    ? formatLocalPublishedDate(dateValue)
    : isRegional
      ? formatRegionalPublishedDate(dateValue)
      : formatPublishedDate(dateValue);
  const readingMinutes = story.readingMinutes
    || Math.max(2, Math.round(paragraphs.join(' ').split(/\s+/).filter(Boolean).length / 225));
  const hasImage = Boolean(featureImage);
  const photoCredit = currentMedia?.source === 'upload'
    ? 'Career Photo Library'
    : currentMedia?.source === 'ai-generated'
      ? 'AI editorial illustration'
      : '';
  const photoCaption = String(story.photoCaption || story.dek || '').trim();
  const localAsideSections = isLocal ? extras.sidebarsForAside.slice(0, 1) : extras.sidebarsForAside;
  const regionalAsideSections = isRegional ? extras.sidebarsForAside.slice(0, 1) : [];
  const nationalAsideSections = isNational ? extras.sidebars.slice(0, 2) : [];
  const regionalLeadCount = Math.min(2, paragraphs.length);
  const regionalLeadParagraphs = paragraphs.slice(0, regionalLeadCount);
  const regionalRemainingParagraphs = paragraphs.slice(regionalLeadCount);

  const shareDigitalEdition = async () => {
    if (typeof window === 'undefined') return;

    const ownerShareButton = [...document.querySelectorAll('header.no-print button')]
      .find((button) => /get share link/i.test(button.textContent || ''));
    if (ownerShareButton) {
      ownerShareButton.click();
      return;
    }

    const shareData = {
      title: `${story.headline} | ${displayOutletName}`,
      text: story.dek || story.headline,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') console.error('Unable to share digital edition', error);
    }
  };

  return (
    <article
      className="dhq-news-article"
      data-editorial-layout={presentation.layout}
      data-audience={extras.audience}
      data-has-image={hasImage ? 'true' : 'false'}
      data-headline-size={headlineSize(story.headline)}
      data-story-importance={extras.importance}
      data-story-format={extras.storyFormat}
      style={presentationVariables(presentation)}
    >
      {isLocal ? (
        <header className="dhq-news-masthead dhq-bearcats-masthead">
          <div className="dhq-bearcats-mark" aria-hidden="true">
            <span>C</span>
            <i />
          </div>
          <div className="dhq-news-masthead__identity dhq-bearcats-identity">
            <div className="dhq-bearcats-brand" aria-label="Bearcats Insider">
              <span>BEARCATS</span>
              <strong>INSIDER</strong>
            </div>
            <div className="dhq-news-masthead__strapline">YOUR SOURCE FOR CINCINNATI BEARCATS FOOTBALL</div>
          </div>
          <div className="dhq-bearcats-motto">
            <span>NEWS. ANALYSIS.</span>
            <strong>CINCINNATI TOUGH.</strong>
          </div>
        </header>
      ) : isRegional ? (
        <header className="dhq-enquirer-masthead">
          <div className="dhq-enquirer-masthead__top">
            <div className="dhq-enquirer-name">Cincinnati Enquirer</div>
            <div className="dhq-enquirer-sports">SPORTS</div>
            <div className="dhq-enquirer-beat"><strong>BEARCATS</strong><span>FOOTBALL</span></div>
          </div>
          <div className="dhq-enquirer-masthead__meta">
            {publishedDate && <time>{publishedDate.toUpperCase()}</time>}
            <div><span>CINCINNATI.COM</span><i aria-hidden="true" /> <b>1B</b></div>
          </div>
        </header>
      ) : isNational ? (
        <header className="dhq-espn-masthead">
          <div className="dhq-espn-globalbar">
            <strong className="dhq-espn-logo" aria-label="ESPN">ESPN</strong>
            <nav aria-label="National sports sections">
              <span>NFL</span><span>NBA</span><span>MLB</span><b>NCAAF</b><span>NCAAB</span><span>Soccer</span>
            </nav>
            <span className="dhq-espn-globalbar__utility">Search &nbsp; ● &nbsp; Scores</span>
          </div>
          <div className="dhq-espn-collegebar">
            <strong>◒ &nbsp; NCAAF</strong>
            <nav aria-label="College football sections">
              <span>Home</span><span>Scores</span><span>Rankings</span><span>Teams</span><span>Schedule</span><span>Standings</span><span>Stats</span>
            </nav>
          </div>
        </header>
      ) : (
        <header className="dhq-news-masthead">
          <div className="dhq-news-masthead__identity">
            <div className="dhq-news-masthead__brand">{displayOutletName}</div>
            <div className="dhq-news-masthead__strapline">{presentation.strapline}</div>
          </div>
          <div className="dhq-news-masthead__meta">
            <span>{extras.audienceLabel}</span>
            <span aria-hidden="true">•</span>
            <span>{story.desk}</span>
          </div>
        </header>
      )}

      {!isLocal && !isRegional && !isNational && <div className="dhq-news-accent-rule" aria-hidden="true" />}

      {isNational ? (
        <>
          {hasImage && (
            <figure className="dhq-espn-hero">
              <img src={featureImage} alt={`Feature coverage for ${story.headline}`} />
              {(photoCaption || photoCredit || currentMedia?.disclosure) && (
                <figcaption>
                  {photoCaption && <span>{photoCaption}</span>}
                  <small>
                    {photoCredit ? `Photo: ${photoCredit}` : ''}
                    {currentMedia?.disclosure ? `${photoCredit ? ' · ' : ''}${currentMedia.disclosure}` : ''}
                  </small>
                </figcaption>
              )}
            </figure>
          )}

          <section className="dhq-espn-headline-block">
            <p className="dhq-espn-kicker">NCAA FOOTBALL</p>
            <h1>{story.headline}</h1>
            {story.dek && <p className="dhq-espn-dek">{story.dek}</p>}
            <div className="dhq-espn-byline">
              <strong>By {story.byline || 'ESPN Staff Report'}</strong>
              {publishedDate && <span>{publishedDate}</span>}
              <span><Clock3 size={13} /> {readingMinutes} min read</span>
            </div>
          </section>

          <div className="dhq-espn-body-grid">
            <main className="dhq-espn-copy">
              {paragraphs.map((paragraph, index) => (
                <div key={`${story.id}-national-${index}`}>
                  {sectionAt.has(index) && <h2>{sectionAt.get(index)}</h2>}
                  <p>{paragraph}</p>
                </div>
              ))}
            </main>

            {nationalAsideSections.length > 0 && (
              <aside className="dhq-espn-rail" aria-label="National story statistics and context">
                {nationalAsideSections.map((section, sectionIndex) => (
                  <section key={`${section.title}-${sectionIndex}`}>
                    <h2>{section.title}</h2>
                    <ul>
                      {section.items.map((item, itemIndex) => {
                        const parts = nationalSidebarParts(item);
                        return (
                          <li key={`${item}-${itemIndex}`}>
                            {parts.value && <strong>{parts.value}</strong>}
                            <span>{parts.detail}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </aside>
            )}
          </div>
        </>
      ) : isRegional ? (
        <>
          <section className="dhq-enquirer-headline-block">
            <h1>{story.headline}</h1>
            {story.dek && <p>{story.dek}</p>}
          </section>
          <div className="dhq-enquirer-headline-rule" aria-hidden="true" />

          <section className="dhq-enquirer-main-grid">
            <div className="dhq-enquirer-lead-copy">
              <div className="dhq-enquirer-byline">
                <strong>By {REGIONAL_AUTHOR}</strong>
                <span>{REGIONAL_AUTHOR_ROLE}</span>
              </div>
              {regionalLeadParagraphs.map((paragraph, index) => (
                <div key={`${story.id}-regional-lead-${index}`}>
                  {sectionAt.has(index) && <h2>{sectionAt.get(index)}</h2>}
                  <p>{paragraph}</p>
                </div>
              ))}
            </div>

            {hasImage && (
              <figure className="dhq-enquirer-hero">
                <img src={featureImage} alt={`Feature coverage for ${story.headline}`} />
                {(photoCaption || photoCredit || currentMedia?.disclosure) && (
                  <figcaption>
                    {photoCaption && <span className="dhq-enquirer-photo-caption">{photoCaption}</span>}
                    <span className="dhq-enquirer-photo-credit">
                      {photoCredit ? photoCredit.toUpperCase() : ''}
                      {currentMedia?.disclosure ? `${photoCredit ? ' · ' : ''}${currentMedia.disclosure}` : ''}
                    </span>
                  </figcaption>
                )}
              </figure>
            )}

            {regionalAsideSections.length > 0 && (
              <aside className="dhq-enquirer-sidebar" aria-label="Article context">
                {regionalAsideSections.map((section, sectionIndex) => (
                  <section key={`${section.title}-${sectionIndex}`}>
                    <h2>{section.title || 'At a Glance'}</h2>
                    <ul>
                      {section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
                    </ul>
                  </section>
                ))}
              </aside>
            )}
          </section>

          {regionalRemainingParagraphs.length > 0 && (
            <section className="dhq-enquirer-lower-copy">
              {regionalRemainingParagraphs.map((paragraph, index) => {
                const originalIndex = index + regionalLeadCount;
                return (
                  <div key={`${story.id}-regional-rest-${originalIndex}`}>
                    {sectionAt.has(originalIndex) && <h2>{sectionAt.get(originalIndex)}</h2>}
                    <p>{paragraph}</p>
                  </div>
                );
              })}
            </section>
          )}
        </>
      ) : (
        <>
          <div className="dhq-news-lead">
            <div className="dhq-news-intro">
              {!isLocal && (
                <div className="dhq-news-story-flags">
                  <span className="dhq-news-kicker">{story.kicker || presentation.category}</span>
                  <span className="dhq-news-impact-badge">{extras.importanceLabel}</span>
                  <span className="dhq-news-format-badge">{extras.formatLabel}</span>
                </div>
              )}
              <h1>{story.headline}</h1>
              {!isLocal && <p className="dhq-news-dek">{story.dek}</p>}
              {isLocal ? (
                <div className="dhq-bearcats-byline-row">
                  <div className="dhq-bearcats-byline-copy">
                    <span>By</span>
                    <strong>{LOCAL_AUTHOR}</strong>
                    <i aria-hidden="true" />
                    <span>{LOCAL_AUTHOR_ROLE}</span>
                  </div>
                  {publishedDate && <time>{publishedDate}</time>}
                </div>
              ) : (
                <div className="dhq-news-byline">
                  <span>By {story.byline || `${displayOutletName} Staff`}</span>
                  {story.dateline && <span>{story.dateline}</span>}
                  {publishedDate && <span>Published {publishedDate}</span>}
                  <span className="dhq-news-read-time"><Clock3 size={13} /> {readingMinutes} min read</span>
                </div>
              )}
            </div>

            {hasImage && (
              <figure className="dhq-news-hero">
                <img src={featureImage} alt={`Feature coverage for ${story.headline}`} />
                {(photoCaption || photoCredit || currentMedia?.disclosure) && (
                  <figcaption>
                    {photoCaption && <span className="dhq-news-photo-caption">{photoCaption}</span>}
                    <span className="dhq-news-photo-credit">
                      {photoCredit ? `Photo: ${photoCredit}` : ''}
                      {currentMedia?.disclosure ? `${photoCredit ? ' · ' : ''}${currentMedia.disclosure}` : ''}
                    </span>
                  </figcaption>
                )}
              </figure>
            )}
          </div>

          {!isLocal && extras.modules.length > 0 && (
            <section className="dhq-news-module-deck" aria-label="Story context">
              {extras.modules.map((module, moduleIndex) => (
                <section className="dhq-news-module" key={`${module.title}-${moduleIndex}`}>
                  <p className="dhq-news-module__eyebrow">{module.eyebrow}</p>
                  <h2>{module.title}</h2>
                  <ul>
                    {module.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
                  </ul>
                </section>
              ))}
            </section>
          )}

          <div className={`dhq-news-content-grid${localAsideSections.length ? '' : ' dhq-news-content-grid--wide'}`}>
            <div className="dhq-news-copy">
              {paragraphs.map((paragraph, index) => (
                <div key={`${story.id}-${index}`}>
                  {sectionAt.has(index) && <h2>{sectionAt.get(index)}</h2>}
                  <p>{paragraph}</p>
                  {!isLocal && index === Math.min(2, paragraphs.length - 1) && extras.pullQuote && (
                    <blockquote>
                      <span>Why it matters</span>
                      {extras.pullQuote}
                    </blockquote>
                  )}
                </div>
              ))}
            </div>

            {localAsideSections.length > 0 && (
              <aside className="dhq-news-sidebar" aria-label="Article context">
                {localAsideSections.map((section, sectionIndex) => (
                  <section key={`${section.title}-${sectionIndex}`}>
                    <h2>{section.title}</h2>
                    <ul>
                      {section.items.map((item, itemIndex) => <li key={`${item}-${itemIndex}`}>{item}</li>)}
                    </ul>
                  </section>
                ))}
              </aside>
            )}
          </div>
        </>
      )}

      {isLocal ? (
        <footer className="dhq-bearcats-footer">
          <span className="dhq-bearcats-footer__left"><b aria-hidden="true">C</b> BEARCATS FOOTBALL</span>
          <span>CINCINNATI BEARCATS</span>
          <button type="button" onClick={shareDigitalEdition} title="Create or share the public DynastyHQ edition">GOBEARCATS.COM</button>
        </footer>
      ) : isRegional ? (
        <footer className="dhq-enquirer-footer">
          <span className="dhq-enquirer-footer__mark" aria-hidden="true">C</span>
          <strong>BEARCAT NATION:</strong>
          <span>For the latest on Cincinnati football, recruiting and more, visit</span>
          <button type="button" onClick={shareDigitalEdition} title="Create or share the public DynastyHQ edition">Cincinnati.com/bearcats</button>
        </footer>
      ) : isNational ? (
        <footer className="dhq-espn-footer">
          <strong>ESPN</strong><span>College Football</span>
          <button type="button" onClick={shareDigitalEdition} title="Create or share the public DynastyHQ edition">Share story</button>
        </footer>
      ) : (
        <footer className="dhq-news-footer">
          <span>{displayOutletName}</span>
          <span>{presentation.strapline}</span>
          <button type="button" className="dhq-news-share" onClick={shareDigitalEdition} title="Create or share the public DynastyHQ edition">
            <Share2 size={13} /> Shareable digital edition
          </button>
        </footer>
      )}
    </article>
  );
};

export default NewsroomArticleReader;
