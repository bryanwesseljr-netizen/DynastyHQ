import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, FileImage, Radio, X } from 'lucide-react';
import { officialCoverageForWeek } from '../domain/officialCoverageCapture.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';
import './official-coverage-reader.css';

const clean = (value) => String(value ?? '').trim();
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];

const openOfficialInNewsroom = (request = {}) => {
  window.dispatchEvent(new CustomEvent('dynastyhq:newsroom-official-focus', { detail: request }));
  const buttons = [...document.querySelectorAll('.dhq-primary-nav button, #mobile-primary-navigation button')];
  const newsroom = buttons.find((button) => /^(?:the )?newsroom$/i.test(clean(button.textContent)) && button.offsetParent !== null)
    || buttons.find((button) => /^(?:the )?newsroom$/i.test(clean(button.textContent)));
  newsroom?.click();
};

const currentGameHubContext = () => {
  const hub = document.querySelector('.dhq-game-hub');
  if (!hub) return null;
  const label = clean(hub.querySelector('.dhq-game-hub__toolbar strong')?.textContent);
  const match = label.match(/season\s+(\d+)\s*[·•-]?\s*week\s+(\d+)/i);
  return match ? { season: Number(match[1]), week: Number(match[2]) } : null;
};

const articlePages = (article = {}) => list(article.pages)
  .filter((page) => clean(page.sourceImageUrl) || clean(page.body) || clean(page.summary) || clean(page.headline));

const canRead = (article = {}) => Boolean(
  clean(article.headline)
  || clean(article.dek)
  || clean(article.body)
  || clean(article.summary)
  || articlePages(article).length,
);

const officialArticlePool = (career = {}) => [
  ...list(career.eaSportsNetworkArticles),
  ...list(career.eaSportsNetwork),
  ...list(career.officialCoverage),
];

const findArticleByHeadline = (career = {}, headline = '') => {
  const wanted = clean(headline).toLowerCase();
  if (!wanted) return null;
  return officialArticlePool(career).find((entry) => clean(entry.headline || entry.title).toLowerCase() === wanted) || null;
};

const findArticleForRequest = (career = {}, request = {}) => {
  const headline = clean(request.headline);
  const season = Number(request.season);
  const week = Number(request.week);
  const candidates = officialArticlePool(career).filter((entry) => {
    if (headline && clean(entry.headline || entry.title).toLowerCase() !== headline.toLowerCase()) return false;
    if (Number.isFinite(season) && season > 0 && Number(entry.season || 1) !== season) return false;
    if (Number.isFinite(week) && week >= 0 && Number(entry.week ?? 0) !== week) return false;
    return true;
  });
  if (candidates[0]) return candidates[0];

  if (Number.isFinite(season) && season > 0 && Number.isFinite(week) && week >= 0) {
    const resolved = officialCoverageForWeek(career, season, week);
    if (['official', 'source'].includes(resolved.kind) && resolved.entry) return resolved.entry;
  }

  return headline ? findArticleByHeadline(career, headline) : null;
};

const articleParagraphs = (article = {}) => clean(article.body)
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean);

const Reader = ({ article, onClose }) => {
  const pages = articlePages(article);
  const paragraphs = articleParagraphs(article);
  const standfirst = clean(article.dek || article.summary);
  return createPortal(
    <div className="dhq-official-reader" role="dialog" aria-modal="true" aria-labelledby="dhq-official-reader-title" onClick={onClose}>
      <article className="dhq-official-reader__sheet" onClick={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span><Radio size={14} /> OFFICIAL IN-GAME COVERAGE</span>
            <small>EA SPORTS NETWORK · SEASON {article.season || '—'} · WEEK {article.week ?? '—'}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="Close official article"><X size={19} /></button>
        </header>

        <div className="dhq-official-reader__story">
          <div className="dhq-official-reader__masthead">EA <b>SPORTS</b> NETWORK</div>
          <h1 id="dhq-official-reader-title">{article.headline || 'Official game coverage'}</h1>
          {standfirst ? <p className="dhq-official-reader__summary">{standfirst}</p> : null}
          {clean(article.byline) ? <p className="dhq-official-reader__byline">{clean(article.byline)}</p> : null}
          {paragraphs.length ? (
            <div className="dhq-official-reader__body">
              {paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>)}
            </div>
          ) : null}
          <div className="dhq-official-reader__meta">
            <span><FileImage size={13} /> {pages.length || article.sourceFiles?.length || 1} captured page{(pages.length || article.sourceFiles?.length || 1) === 1 ? '' : 's'}</span>
            <span>Preserved from College Football 27</span>
          </div>
        </div>

        {pages.length ? (
          <section className="dhq-official-reader__pages" aria-label="Captured EA Sports Network source pages">
            <div className="dhq-official-reader__pages-title">
              <span>SOURCE PAGES</span>
              <strong>The original in-game article capture</strong>
            </div>
            {pages.map((page, index) => (
              <figure key={`${page.sourceFileName || 'page'}-${index}`}>
                <figcaption>
                  <span>{page.pageLabel || `PAGE ${index + 1}`}</span>
                  <small>{page.sourceFileName || 'CFB 27 capture'}</small>
                </figcaption>
                {page.sourceImageUrl ? <img src={page.sourceImageUrl} alt={`EA SPORTS Network source page ${index + 1}`} loading="lazy" /> : null}
                {!page.sourceImageUrl && page.body ? <p>{page.body}</p> : null}
                {!page.sourceImageUrl && !page.body && page.summary ? <p>{page.summary}</p> : null}
              </figure>
            ))}
          </section>
        ) : (
          <section className="dhq-official-reader__legacy">
            <ExternalLink size={16} />
            <div><strong>OFFICIAL WIRE BRIEF</strong><p>Only the original headline and story brief were preserved from this edition. No additional copy is shown here.</p></div>
          </section>
        )}
      </article>
    </div>,
    document.body,
  );
};

const OfficialCoverageReaderPortal = () => {
  const { career } = useOwnerCareer();
  const [article, setArticle] = useState(null);
  const articles = useMemo(() => officialArticlePool(career || {}), [
    career?.eaSportsNetworkArticles,
    career?.eaSportsNetwork,
    career?.officialCoverage,
  ]);

  useEffect(() => {
    if (!career) return undefined;
    const root = document.getElementById('root') || document.body;

    const wire = () => {
      const coverageCards = [...document.querySelectorAll('.dhq-v3-coverage-experience__grid article')];
      coverageCards.forEach((card) => {
        if (!/ea sports network/i.test(clean(card.textContent))) return;
        if (card.querySelector('[data-open-official-reader]')) return;
        const context = currentGameHubContext();
        if (!context) return;
        const resolved = officialCoverageForWeek(career, context.season, context.week);
        if (resolved.kind !== 'official' || !canRead(resolved.entry)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.openOfficialReader = 'game-hub';
        button.className = 'dhq-official-reader-trigger';
        button.textContent = articlePages(resolved.entry).length ? 'READ OFFICIAL ARTICLE' : 'VIEW OFFICIAL COVERAGE';
        button.addEventListener('click', () => openOfficialInNewsroom({
          headline: resolved.entry?.headline || '',
          season: context.season,
          week: context.week,
          source: 'game-hub-official-button',
        }));
        card.appendChild(button);
      });

      const memoryCards = [...document.querySelectorAll('.dhq-chronicle-v2__artifact-stack article')];
      memoryCards.forEach((card) => {
        if (!/official in-game coverage/i.test(clean(card.textContent))) return;
        if (card.querySelector('[data-open-official-reader]')) return;
        const headline = clean(card.querySelector('strong')?.textContent);
        const matched = findArticleByHeadline(career, headline);
        if (!matched || !canRead(matched)) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.openOfficialReader = 'chronicle';
        button.className = 'dhq-official-reader-trigger';
        button.textContent = articlePages(matched).length ? 'OPEN ORIGINAL ARTICLE' : 'VIEW OFFICIAL COVERAGE';
        button.addEventListener('click', () => openOfficialInNewsroom({
          headline: matched?.headline || headline,
          season: matched?.season,
          week: matched?.week,
          source: 'chronicle-official-button',
        }));
        card.appendChild(button);
      });
    };

    wire();
    const observer = new MutationObserver(wire);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [career, articles]);

  useEffect(() => {
    if (!career) return undefined;
    const onOpenOfficial = (event) => {
      const request = event.detail || {};
      const matched = findArticleForRequest(career, request);
      if (!matched || !canRead(matched)) return;
      if (request.presentation === 'modal') {
        setArticle(matched);
        return;
      }
      openOfficialInNewsroom({
        headline: matched.headline || request.headline || '',
        season: matched.season ?? request.season,
        week: matched.week ?? request.week,
        source: request.source || 'official-reader-route',
      });
    };
    window.addEventListener('dynastyhq:open-official-coverage', onOpenOfficial);
    return () => window.removeEventListener('dynastyhq:open-official-coverage', onOpenOfficial);
  }, [career, articles]);

    useEffect(() => {
    if (!article) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setArticle(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [article]);

  return article ? <Reader article={article} onClose={() => setArticle(null)} /> : null;
};

export default OfficialCoverageReaderPortal;
