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

const issueFor = (career, publicationId) => (career.newsroomIssues || []).find((issue) => (
  issue?.publicationId === publicationId || issue?.id === publicationId || issue?.weekKey === publicationId
));

const comparisonStory = (packet = {}) => {
  const comparison = packet.game?.comparison || {};
  const candidates = [
    ['rushing yards', comparison.rushingYards],
    ['total offense', comparison.totalYards],
    ['passing yards', comparison.passingYards],
    ['first downs', comparison.firstDowns],
  ].map(([label, pair]) => {
    const team = Number(pair?.team);
    const opponent = Number(pair?.opponent);
    if (!Number.isFinite(team) || !Number.isFinite(opponent)) return null;
    return { label, team, opponent, gap: Math.abs(team - opponent) };
  }).filter(Boolean).sort((left, right) => right.gap - left.gap);

  const best = candidates[0];
  if (best && best.gap > 0) {
    const winner = best.team > best.opponent ? packet.team : packet.opponent;
    return `${winner} held the edge in ${best.label}, ${Math.max(best.team, best.opponent)}–${Math.min(best.team, best.opponent)}`;
  }

  const turnovers = comparison.turnovers;
  if (Number.isFinite(Number(turnovers?.team)) && Number.isFinite(Number(turnovers?.opponent)) && Number(turnovers.team) !== Number(turnovers.opponent)) {
    return `Turnover margin: ${packet.team} ${turnovers.team}, ${packet.opponent} ${turnovers.opponent}`;
  }

  const performer = packet.playerStats?.[0];
  if (performer) return `${performer.label}: ${performer.value}`;
  return packet.officialMedia?.headline || 'Published-week evidence preserved with the game';
};

const coverageLevelFor = (issue = {}, packet = {}) => {
  const tier = clean(issue.coverageDecision?.tier || issue.coverageTier).toLowerCase();
  if (tier === 'career-defining') return 'Career-defining package';
  if (tier === 'major') return 'Major feature package';
  if (tier === 'brief') return 'Brief package';
  if (packet.evidence?.hasPlayerStats && packet.evidence?.hasScoringSummary) return 'Full game package';
  return 'Standard package';
};

const bridgeStoryDirector = (career = {}) => {
  const card = document.querySelector('.dhq-game-hub .dhq-gh-story-director');
  if (!card) return;
  const publicationId = selectedPublicationId(career);
  if (!publicationId) return;

  let packet;
  try {
    packet = buildPublishedWeekEditorialPacket(career, publicationId);
  } catch {
    return;
  }
  const issue = issueFor(career, publicationId) || {};
  const article = (issue.articles || [])[0];
  const lead = clean(article?.headline) || `${packet.team || 'Team'} ${packet.result || 'result'} vs. ${packet.opponent || 'opponent'}, ${packet.score || 'final'}`;
  const secondary = comparisonStory(packet);
  const level = coverageLevelFor(issue, packet);
  const rows = [...card.querySelectorAll(':scope > div')].filter((row) => row.querySelector('small') && row.querySelector('strong'));
  const byLabel = new Map(rows.map((row) => [clean(row.querySelector('small')?.textContent).toUpperCase(), row.querySelector('strong')]));

  if (byLabel.get('LEAD STORY')) byLabel.get('LEAD STORY').textContent = lead;
  if (byLabel.get('SECONDARY')) byLabel.get('SECONDARY').textContent = secondary;
  if (byLabel.get('COVERAGE LEVEL')) byLabel.get('COVERAGE LEVEL').textContent = level;
  const note = card.querySelector('p');
  if (note) note.textContent = 'Story priority is built from the published game, team comparison, individual performers, scoring evidence, progression, milestones and official in-game media available for this week.';
  card.dataset.dhqEditorialPublicationId = publicationId;
};

const GameHubStoryDirectorBridgePortal = () => {
  const { career } = useOwnerCareer();

  useEffect(() => {
    let scheduled = false;
    const sync = () => {
      scheduled = false;
      bridgeStoryDirector(career || {});
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

export default GameHubStoryDirectorBridgePortal;
