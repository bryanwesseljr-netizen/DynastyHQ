import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const routingUrl = new URL('../components/WeekHubRoutingPortal.jsx', import.meta.url);
const ownerUrl = new URL('../components/OwnerEnhancements.jsx', import.meta.url);
const dashboardUrl = new URL('../components/BroadcastDashboard.jsx', import.meta.url);

test('homepage View Week Hub is bridged to the new Game Hub instead of legacy Weekly Agenda', async () => {
  const [routing, owner, dashboard] = await Promise.all([
    readFile(routingUrl, 'utf8'),
    readFile(ownerUrl, 'utf8'),
    readFile(dashboardUrl, 'utf8'),
  ]);

  assert.match(owner, /import WeekHubRoutingPortal from '\.\/WeekHubRoutingPortal\.jsx';/);
  assert.match(owner, /<WeekHubRoutingPortal \/>/);
  assert.match(dashboard, /VIEW WEEK HUB/);
  assert.match(routing, /VIEW WEEK HUB/);
  assert.match(routing, /\.dhq-primary-nav button, #mobile-primary-navigation button/);
  assert.match(routing, /button\.click\(\)/);
  assert.match(routing, /stopImmediatePropagation/);
});
