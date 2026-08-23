import { Clock3, Share2 } from 'lucide-react';
import {
  buildEditorialExtras, presentationVariables, resolveNewsroomPresentation,
} from '../domain/newsroomPresentation';
import '../newsroom-v3.css';
import '../newsroom-local-bearcats.css';

const LOCAL_OUTLET = 'Bearcats Insider';
const LOCAL_AUTHOR = 'Justin Williams';
const LOCAL_AUTHOR_ROLE = 'Senior Staff Writer, Bearcats Insider';

const formatPublishedDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
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

const NewsroomArticleReader = ({ issue, story, featureImage, currentMedia }) => {
  const presentation = resolveNewsroomPresentation(story);
  const extras = buildEditorialExtras({ story, issue });
  const isLocal = extras.audience === 'local';
  const displayOutletName = isLocal ? LOCAL_OUTLET : story.outletName;
  const paragraphs = Array.isArray(story.paragraphs) ? story.paragraphs : [];
  const sectionAt = new Map(headingPositions(paragraphs.length, extras.sectionHeadings.length)
    .map((position, index) => [position, extras.sectionHeadings[index]]));
  const publishedDate = formatPublishedDate(issue.publishedAt || issue.editorialGeneratedAt);
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

      {!isLocal && <div className="dhq-news-accent-rule" aria-hidden="true" />}

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

      {isLocal ? (
        <footer className="dhq-bearcats-footer">
          <span className="dhq-bearcats-footer__left"><b aria-hidden="true">C</b> BEARCATS FOOTBALL</span>
          <span>CINCINNATI BEARCATS</span>
          <button type="button" onClick={shareDigitalEdition} title="Create or share the public DynastyHQ edition">GOBEARCATS.COM</button>
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
