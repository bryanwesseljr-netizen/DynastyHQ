import test from 'node:test';
import assert from 'node:assert/strict';

import { satisfiesSchemaShape } from '../server/editorialTextRouter.js';

const schema = {
  type: 'object',
  required: ['articles'],
  properties: {
    articles: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        required: ['outletId', 'headline'],
        properties: {
          outletId: { type: 'string', enum: ['college-local', 'college-regional'] },
          headline: { type: 'string' },
        },
      },
    },
  },
};

test('editorial schema accepts every requested newsroom outlet exactly once', () => {
  assert.equal(satisfiesSchemaShape({
    articles: [
      { outletId: 'college-local', headline: 'Local angle' },
      { outletId: 'college-regional', headline: 'Regional angle' },
    ],
  }, schema), true);
});

test('editorial schema rejects duplicate outlet IDs even when article count is correct', () => {
  assert.equal(satisfiesSchemaShape({
    articles: [
      { outletId: 'college-local', headline: 'Local angle one' },
      { outletId: 'college-local', headline: 'Local angle two' },
    ],
  }, schema), false);
});
