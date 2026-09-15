import { useEffect } from 'react';
import { buildPublishedWeekEditorialPacket } from '../domain/publishedWeekEditorialPacket.js';
import { useOwnerCareer } from './OwnerCareerContext.jsx';

const clean = (value) => String(value ?? '').trim();
const publicationIdFor = (season, week) => `season-${Number(season) || 1}-week-${Number(week) || 1}`;

const selectedPublicationId = (career = {}) => {
  const select = document.querySelector('.dhq-game-hub__toolbar select');
  const selected = clean(select?.value);
  if (selected && selected !== 'current' && selected !== 'auto') return selected;
  const games = Array.isArray(career.gameLogs) ? career.gameLogs : [];
  const latest = [...games]
    .filter((game) => game && game.didPlay !== false && game.stage !== 'high-school' && !game.evaluation && clean(game.opponent))
    .sort((left, right) => ((Number(right.season) || 1) * 100 + (Number(right.week) || 0)) - ((Number(left.season) || 1) * 100 + (Number(left.week) || 0)))[0];
  return latest ? publicationIdFor(latest.season, latest.week) : '';
};

const bridgeOfficialMedia = (career = {}) => {
  const copy = document.querySelector('.dhq-game-hub .dhq-gh-official-copy');
  if (!copy) return;
  const publicationId = selectedPublicationId(career);
  if (!publicationId) return;

  let packet;
  try {
    packet = buildPublishedWeekEditorialPacket(career, publicationId);
  } catch {
    return;
  }
  if (!packet.officialMedia?.captured) return;

  const headline = clean(packet.officialMedia.headline) || 'EA SPORTS Network coverage captured for this game';
  const framing = (packet.officialMedia.framing || [])
    .map((entry) => clean(entry.value || entry.label))
    .filter(Boolean)
    .slice(0, 3);
  const summary = framing.join(' · ') || 'Official in-game media framing was captured with this published week.';

  if (copy.dataset.dhqOfficialPublicationId === publicationId
      && copy.querySelector('h2')?.textContent === headline) return;

  const heading = document.createElement('h2');
  heading.textContent = headline;
  const paragraph = document.createElement('p');
  paragraph.textContent = summary;
  copy.replaceChildren(heading, paragraph);
  copy.dataset.dhqOfficialPublicationId = publicationId;
  copy.closest('.dhq-gh-official-card')?.classList.add('has-captured-official-media');
};

const GameHubOfficialMediaBridgePortal = () => {
  const { career } = useOwnerCareer();

  useEffect(() => {
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      bridgeOfficialMedia(career || {});
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    };

    sync();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener('change', schedule, true);
    return () => {
      observer.disconnect();
      document.removeEventListener('change', schedule, true);
    };
  }, [career]);

  return null;
};

export default GameHubOfficialMediaBridgePortal;
