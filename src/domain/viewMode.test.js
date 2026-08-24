import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_VIEW_MODES, isPublicShareSearch, resolveViewContext } from './viewMode.js';

test('owner mode is the default without a shared view id', () => {
  const context = resolveViewContext('');
  assert.equal(context.mode, APP_VIEW_MODES.OWNER);
  assert.equal(context.isPublicShare, false);
  assert.equal(context.isReadOnly, false);
  assert.equal(context.ownerEnhancementsAllowed, true);
  assert.equal(context.viewId, '');
});

test('a real view id creates an auth-independent read-only share context', () => {
  const context = resolveViewContext('?view=career-123');
  assert.equal(context.mode, APP_VIEW_MODES.PUBLIC_SHARE);
  assert.equal(context.isPublicShare, true);
  assert.equal(context.isReadOnly, true);
  assert.equal(context.ownerEnhancementsAllowed, false);
  assert.equal(context.viewId, 'career-123');
  assert.equal(isPublicShareSearch('?view=career-123'), true);
});

test('empty or whitespace view params do not create a half-public session', () => {
  assert.equal(resolveViewContext('?view=').isPublicShare, false);
  assert.equal(resolveViewContext('?view=%20%20').isPublicShare, false);
  assert.equal(isPublicShareSearch('?view='), false);
});

test('front-page targeting survives in both owner and shared links', () => {
  const owner = resolveViewContext('?frontPage=week-6');
  const shared = resolveViewContext('?view=career-123&frontPage=week-6');
  assert.equal(owner.frontPageId, 'week-6');
  assert.equal(shared.frontPageId, 'week-6');
  assert.equal(shared.viewId, 'career-123');
});

test('view ids are decoded and trimmed before mode is decided', () => {
  const context = resolveViewContext('?view=%20Bryan%20Wessel%20');
  assert.equal(context.viewId, 'Bryan Wessel');
  assert.equal(context.isPublicShare, true);
});
