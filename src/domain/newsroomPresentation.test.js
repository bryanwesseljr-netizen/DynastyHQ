import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildEditorialExtras, presentationVariables, resolveNewsroomPresentation,
} from './newsroomPresentation.js';

test('assigns distinct editorial layouts and color identities by article beat', () => {
  const local = resolveNewsroomPresentation({ outletId: 'local', theme: 'local' });
  const recruiting = resolveNewsroomPresentation({ outletId: 'recruiting', theme: 'on3' });
  const filmroom = resolveNewsroomPresentation({ outletId: 'filmroom', theme: 'filmroom' });
  const national = resolveNewsroomPresentation({ outletId: 'national', theme: 'network' });

  assert.equal(local.layout, 'community');
  assert.equal(recruiting.layout, 'insider');
  assert.equal(filmroom.layout, 'analysis');
  assert.equal(national.layout, 'network');
  assert.equal(new Set([local.accent, recruiting.accent, filmroom.accent, national.accent]).size, 4);
  assert.equal(presentationVariables(recruiting)['--news-accent'], recruiting.accent);
});

test('builds safe editorial modules for legacy articles without presentation fields', () => {
  const story = {
    id: 'recruiting', theme: 'on3', desk: 'Recruiting Desk', dek: 'The opening list creates a regional race.',
    paragraphs: [
      'The first list puts Eastern Michigan at the front of the personal preference order.',
      'Western Michigan and Central Michigan follow, keeping the early board close to home.',
      'Five evaluation games remain capable of changing the direction of the recruitment.',
      'The next update will add another piece to the evaluation.',
    ],
  };
  const extras = buildEditorialExtras({ story, issue: { season: 1, week: 0 } });

  assert.equal(extras.sectionHeadings.length, 2);
  assert.match(extras.pullQuote, /Five evaluation games/);
  assert.equal(extras.sidebars.length, 2);
  assert.match(extras.sidebars[0].items.join(' '), /Season 1/);
});

test('preserves generated headings, pull quote, and grounded sidebar modules', () => {
  const story = {
    theme: 'filmroom',
    sectionHeadings: ['The statistical shape', 'The next test'],
    pullQuote: 'The production creates a baseline for the next evaluation.',
    sidebars: [
      { title: 'By the numbers', items: ['Two total touchdowns', 'No interceptions'] },
      { title: 'Next evaluation', items: ['Watch the next recorded performance', 'Compare the weekly production'] },
    ],
    paragraphs: ['One.', 'Two.', 'Three.', 'Four.'],
  };
  const extras = buildEditorialExtras({ story, issue: {} });

  assert.deepEqual(extras.sectionHeadings, story.sectionHeadings);
  assert.equal(extras.pullQuote, story.pullQuote);
  assert.deepEqual(extras.sidebars, story.sidebars);
});

