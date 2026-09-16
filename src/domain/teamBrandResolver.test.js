import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogTeamBrand, STATIC_ESPN_TEAM_IDS } from './teamBrandResolver.js';

test('Baylor and Oregon historical matchup brands have deterministic logos without the live directory', () => {
  const oregon = catalogTeamBrand('Oregon');
  const baylor = catalogTeamBrand('Baylor');

  assert.equal(STATIC_ESPN_TEAM_IDS.Oregon, '2483');
  assert.equal(STATIC_ESPN_TEAM_IDS.Baylor, '239');
  assert.match(oregon.logo, /\/2483\.png$/);
  assert.match(baylor.logo, /\/239\.png$/);
  assert.match(oregon.source, /^fbs-2026/);
  assert.match(baylor.source, /^fbs-2026/);
});
