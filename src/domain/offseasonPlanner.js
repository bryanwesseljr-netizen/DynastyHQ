import { CAREER_STAGES, deriveCareerStage } from './commandCenter.js';

export const POSITION_GROUPS = Object.freeze([
  { key: 'qb', label: 'QB', side: 'offense' },
  { key: 'rb', label: 'RB', side: 'offense' },
  { key: 'wr', label: 'WR', side: 'offense' },
  { key: 'te', label: 'TE', side: 'offense' },
  { key: 'ol', label: 'OL', side: 'offense' },
  { key: 'dl', label: 'DL', side: 'defense' },
  { key: 'lb', label: 'LB', side: 'defense' },
  { key: 'cb', label: 'CB', side: 'defense' },
  { key: 's', label: 'S', side: 'defense' },
  { key: 'st', label: 'K/P', side: 'special-teams' },
]);

const OFFENSIVE_POSITIONS = new Set(['QB', 'RB', 'HB', 'FB', 'WR', 'TE', 'LT', 'LG', 'C', 'RG', 'RT', 'OL', 'ATH']);

const clean = (value) => String(value ?? '').trim();
const numeric = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const latestFact = (ledger, key) => [...(ledger || [])]
  .reverse()
  .find((entry) => entry.verified && entry.key === key) || null;

const verifiedValue = (ledger, key) => {
  const fact = latestFact(ledger, key);
  return { value: fact ? fact.value : null, fact };
};

const verifiedNumber = (ledger, key) => {
  const result = verifiedValue(ledger, key);
  return { ...result, value: result.fact ? numeric(result.fact.value) : null };
};

const positionGroupFor = (position) => {
  const normalized = clean(position).toUpperCase();
  if (['HB', 'FB'].includes(normalized)) return 'rb';
  if (['LT', 'LG', 'C', 'RG', 'RT'].includes(normalized)) return 'ol';
  if (['DE', 'DT', 'LE', 'RE'].includes(normalized)) return 'dl';
  if (['MLB', 'OLB', 'LOLB', 'ROLB'].includes(normalized)) return 'lb';
  if (['FS', 'SS'].includes(normalized)) return 's';
  if (['K', 'P', 'LS'].includes(normalized)) return 'st';
  return normalized.toLowerCase();
};

const isOffensive = (entry) => entry.assignedTo === 'OC' || OFFENSIVE_POSITIONS.has(clean(entry.position).toUpperCase());

const classifyTarget = (status) => {
  const normalized = clean(status).toLowerCase();
  if (/(commit|signed|enrolled)/.test(normalized)) return 'commit';
  if (/(portal|transfer)/.test(normalized)) return 'portal';
  return 'recruit';
};

const distribute = (total, rows, weightFor) => {
  const amount = numeric(total);
  if (amount === null || amount < 0 || !rows.length) return [];
  const weighted = rows.map((row) => ({ row, weight: Math.max(0, Number(weightFor(row)) || 0) }));
  const weightTotal = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!weightTotal) return [];
  let assigned = 0;
  return weighted.map((entry, index) => {
    const allocation = index === weighted.length - 1
      ? amount - assigned
      : Math.floor((amount * entry.weight) / weightTotal);
    assigned += allocation;
    return { ...entry.row, suggestedPoints: allocation, planningWeight: entry.weight };
  });
};

const verifiedTarget = (state, entry) => {
  const ledger = state.factLedger || [];
  const prefix = `recruiting.${entry.id}`;
  const interest = verifiedNumber(ledger, `${prefix}.interest`);
  const stars = verifiedNumber(ledger, `${prefix}.stars`);
  const position = verifiedValue(ledger, `${prefix}.position`);
  const status = verifiedValue(ledger, `${prefix}.status`);
  const offer = verifiedValue(ledger, `${prefix}.offer`);
  const hasVerifiedFact = [interest.fact, stars.fact, position.fact, status.fact, offer.fact].some(Boolean);
  return {
    ...entry,
    interest: interest.fact ? interest.value : numeric(entry.interest),
    stars: stars.fact ? stars.value : numeric(entry.stars),
    position: clean(position.fact ? position.value : entry.position).toUpperCase(),
    status: clean(status.fact ? status.value : (entry.status || entry.level)),
    offered: offer.fact ? Boolean(offer.value) : Boolean(entry.offered),
    verified: hasVerifiedFact,
    targetType: classifyTarget(status.fact ? status.value : entry.status),
  };
};

const verifiedRetentionPlayer = (state, entry) => {
  const ledger = state.factLedger || [];
  const prefix = `retention.${entry.id}`;
  const position = verifiedValue(ledger, `${prefix}.position`);
  const overall = verifiedNumber(ledger, `${prefix}.overall`);
  const risk = verifiedValue(ledger, `${prefix}.risk`);
  const status = verifiedValue(ledger, `${prefix}.status`);
  const nilDemand = verifiedNumber(ledger, `${prefix}.nilDemand`);
  return {
    ...entry,
    position: clean(position.fact ? position.value : entry.position).toUpperCase(),
    overall: overall.fact ? overall.value : numeric(entry.overall),
    risk: clean(risk.fact ? risk.value : entry.risk),
    status: clean(status.fact ? status.value : entry.status),
    nilDemand: nilDemand.fact ? nilDemand.value : numeric(entry.nilDemand),
    verified: [position.fact, overall.fact, risk.fact, status.fact, nilDemand.fact].some(Boolean),
  };
};

const riskWeight = (risk) => {
  const normalized = clean(risk).toLowerCase();
  if (normalized.includes('high')) return 4;
  if (normalized.includes('medium')) return 2;
  if (normalized.includes('low')) return 1;
  return 0;
};

export const buildOffseasonPlanner = (state = {}) => {
  const stage = deriveCareerStage(state);
  const isOC = stage === CAREER_STAGES.OC;
  const isHC = stage === CAREER_STAGES.HC;
  const isRetired = stage === CAREER_STAGES.RETIRED;
  const hasOffice = isOC || isHC || isRetired;
  const ledger = state.factLedger || [];

  const positionNeeds = POSITION_GROUPS.map((position) => ({
    ...position,
    count: verifiedNumber(ledger, `roster.${position.key}.count`),
    need: verifiedNumber(ledger, `roster.${position.key}.need`),
  }))
    .filter((entry) => entry.count.fact || entry.need.fact)
    .filter((entry) => !isOC || entry.side === 'offense')
    .sort((left, right) => (right.need.value ?? -1) - (left.need.value ?? -1));

  const allTargets = (state.recruiting || [])
    .map((entry) => verifiedTarget(state, entry))
    .filter((entry) => clean(entry.name) && entry.verified);
  const targets = (isOC ? allTargets.filter(isOffensive) : allTargets);
  const commitments = targets.filter((entry) => entry.targetType === 'commit');
  const portalTargets = targets.filter((entry) => entry.targetType === 'portal');
  const prepTargets = targets.filter((entry) => entry.targetType === 'recruit');

  const retentionPlayers = (state.retentionBoard || [])
    .map((entry) => verifiedRetentionPlayer(state, entry))
    .filter((entry) => clean(entry.name) && entry.verified)
    .filter((entry) => !isOC || isOffensive(entry))
    .sort((left, right) => (
      riskWeight(right.risk) - riskWeight(left.risk)
      || (right.overall ?? 0) - (left.overall ?? 0)
    ));
  const atRiskPlayers = retentionPlayers.filter((entry) => riskWeight(entry.risk) > 0 && !/(return|stay|retained)/i.test(entry.status));

  const recruitingBudget = verifiedNumber(ledger, 'coach.recruitingNIL');
  const retentionBudget = verifiedNumber(ledger, 'coach.rosterNIL');
  const openScholarships = verifiedNumber(ledger, 'coach.openScholarships');
  const classCommits = verifiedNumber(ledger, 'coach.classCommits');
  const portalAdditions = verifiedNumber(ledger, 'coach.portalAdditions');

  const actionableNeeds = positionNeeds.filter((entry) => (entry.need.value ?? 0) > 0);
  const recruitingAllocation = distribute(recruitingBudget.value, actionableNeeds, (entry) => {
    const targetDepth = targets.filter((target) => positionGroupFor(target.position) === entry.key).length;
    return (entry.need.value || 0) * 3 + targetDepth;
  });
  const retentionAllocation = distribute(retentionBudget.value, atRiskPlayers, (entry) => (
    riskWeight(entry.risk) * 10 + Math.max(0, (entry.overall || 60) - 60)
  ));

  const alerts = [];
  const addAlert = (tone, title, text) => alerts.push({ tone, title, text });
  if (!hasOffice) {
    addAlert('info', 'Planner locked', 'The offseason planner unlocks after the verified offensive-coordinator hiring milestone.');
  } else if (isRetired) {
    addAlert('info', 'Historical plan', 'The retired career can review its last verified offseason plan, but cannot make program decisions.');
  } else {
    if (!positionNeeds.length) addAlert('info', 'Roster breakdown needed', 'Upload the roster overview or position-needs screen before setting offseason priorities.');
    else if (!actionableNeeds.length) addAlert('warning', 'No verified needs shown', 'Position counts are visible, but no positive position-need values are verified.');
    else addAlert('success', 'Needs board ready', `${actionableNeeds.length} verified position need${actionableNeeds.length === 1 ? '' : 's'} can drive the class plan.`);

    if (!retentionPlayers.length) addAlert('info', 'Retention screen needed', 'Upload roster-retention or player-decision screens to build the stay-or-go board.');
    else if (atRiskPlayers.length) addAlert('warning', 'Retention decisions pending', `${atRiskPlayers.length} verified player${atRiskPlayers.length === 1 ? '' : 's'} require retention review.`);
    else addAlert('success', 'Retention board stable', 'No unresolved transfer risk is visible in the verified retention board.');

    if (!targets.length) addAlert('info', 'Class and portal boards needed', 'Upload recruiting-class and transfer-portal screens before matching targets to roster needs.');
    if (isOC) addAlert('info', 'Coordinator scope', 'The planner shows offensive and assigned decisions only. Final roster cuts, offers, and spending remain with the head coach.');
  }

  return {
    stage,
    hasOffice,
    readOnly: !isHC,
    roleLabel: isOC ? 'Offensive Coordinator' : (isHC ? 'Head Coach' : (isRetired ? 'Retired Head Coach' : 'Player')),
    authorityLabel: isHC ? 'Final offseason authority' : (isOC ? 'Offensive advisory view' : (isRetired ? 'Historical view only' : 'Office locked')),
    positionNeeds,
    actionableNeeds,
    retentionPlayers,
    atRiskPlayers,
    targets,
    portalTargets,
    prepTargets,
    commitments,
    recruitingBudget,
    retentionBudget,
    recruitingAllocation,
    retentionAllocation,
    classSummary: { openScholarships, classCommits, portalAdditions },
    alerts,
  };
};
