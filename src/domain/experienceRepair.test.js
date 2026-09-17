import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

test('experience repair layer is mounted and owns broken high-level actions', async () => {
  const [owner, repair] = await Promise.all([
    readSource('../components/OwnerEnhancements.jsx'),
    readSource('../components/ExperienceRepairPortal.jsx'),
  ]);

  assert.ok(owner.includes("import ExperienceRepairPortal from './ExperienceRepairPortal.jsx'"));
  assert.ok(owner.includes('<ExperienceRepairPortal />'));
  assert.ok(repair.includes("text.includes('CONTINUE WRAP-UP')"));
  assert.ok(repair.includes("openNav('Game Hub')"));
  assert.ok(repair.includes("text.includes('OPEN COVERAGE')"));
  assert.ok(repair.includes("openNav(['The Newsroom', 'Newsroom'])"));
});

test('header controls now expose useful notifications and a quick menu', async () => {
  const repair = await readSource('../components/ExperienceRepairPortal.jsx');
  assert.ok(repair.includes('LATEST AROUND YOUR CAREER'));
  assert.ok(repair.includes('NEXT UP'));
  assert.ok(repair.includes('NEWSROOM'));
  assert.ok(repair.includes('THE HUDDLE'));
  assert.ok(repair.includes('QUICK MENU'));
  assert.ok(repair.includes('Open DynastyHQ quick menu'));
});

test('season schedule rows receive opponent team marks and Game Story gains useful destinations', async () => {
  const repair = await readSource('../components/ExperienceRepairPortal.jsx');
  assert.ok(repair.includes('resolveCollegeTeamBrand'));
  assert.ok(repair.includes('dhq-schedule-team-logo'));
  assert.ok(repair.includes('READ NEWSROOM'));
  assert.ok(repair.includes('PLAY THE HUDDLE'));
  assert.ok(repair.includes('CAREER TIMELINE'));
});

test('team media profiles can no longer rename the universal podcast', async () => {
  const mediaProfile = await readSource('./teamMediaProfile.js');
  assert.ok(mediaProfile.includes("const podcastName = 'The Huddle Podcast'"));
});
