import { Clock3, Share2 } from 'lucide-react';
import {
  buildEditorialExtras, presentationVariables, resolveNewsroomPresentation,
} from '../domain/newsroomPresentation';

const formatPublishedDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
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

  return (
    <article
      className="dhq-news-article"
      data-editorial-layout={presentation.layout}
      data-has-image={hasImage ? 'true' : 'false'}
      data-headline-size={headlineSize(story.headline)}
      data-story-importance={extras.importance}
      data-story-format={extras.storyFormat}
      style={presentationVariables(presentation)}
    >
      <header className="dhq-news-masthead">
        <div className="dhq-news-masthead__brand">{story.outletName}</div>
        <div className="dhq-news-masthead__meta">
          <span>{presentation.category}</span>
          <span aria-hidden="true">•</span>
          <span>{story.desk}</span>
        </div>
      </header>

      <div className="dhq-news-accent-rule" aria-hidden="true" />

      <div className="dhq-news-lead">
        <div className="dhq-news-intro">
          <div className="dhq-news-story-flags">
            <span className="dhq-news-kicker">{story.kicker || presentation.category}</span>
            <span className="dhq-news-impact-badge">{extras.importanceLabel}</span>
            <span className="dhq-news-format-badge">{extras.formatLabel}</span>
          </div>
          <h1>{story.headline}</h1>
          <p className="dhq-news-dek">{story.dek}</p>
          <div className="dhq-news-byline">
            <span>By {story.byline || `${story.outletName} Staff`}</span>
            {story.dateline && <span>{story.dateline}</span>}
            {publishedDate && <span>Published {publishedDate}</span>}
            <span className="dhq-news-read-time"><Clock3 size={13} /> {readingMinutes} min read</span>
          </div>
        </div>

        {hasImage && (
          <figure className="dhq-news-hero">
            <img src={featureImage} alt={`Feature coverage for ${story.headline}`} />
            {(photoCredit || currentMedia?.disclosure) && (
              <figcaption>
                <span>{photoCredit ? `Photo: ${photoCredit}` : ''}</span>
                {currentMedia?.disclosure && <span>{currentMedia.disclosure}</span>}
              </figcaption>
            )}
          </figure>
        )}
      </div>

      {extras.modules.length > 0 && (
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

      <div className={`dhq-news-content-grid${extras.sidebarsForAside.length ? '' : ' dhq-news-content-grid--wide'}`}>
        <div className="dhq-news-copy">
          {paragraphs.map((paragraph, index) => (
            <div key={`${story.id}-${index}`}>
              {sectionAt.has(index) && <h2>{sectionAt.get(index)}</h2>}
              <p>{paragraph}</p>
              {index === Math.min(2, paragraphs.length - 1) && extras.pullQuote && (
                <blockquote>
                  <span>Why it matters</span>
                  {extras.pullQuote}
                </blockquote>
              )}
            </div>
          ))}
        </div>

        {extras.sidebarsForAside.length > 0 && (
          <aside className="dhq-news-sidebar" aria-label="Article context">
            {extras.sidebarsForAside.map((section, sectionIndex) => (
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

      <footer className="dhq-news-footer">
        <span>{story.outletName}</span>
        <span>{presentation.strapline}</span>
        <span className="dhq-news-share"><Share2 size={13} /> Shareable digital edition</span>
      </footer>
    </article>
  );
};

export default NewsroomArticleReader;
