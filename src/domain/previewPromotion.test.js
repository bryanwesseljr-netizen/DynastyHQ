import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PREVIEW_DATA_APP_ID,
  PREVIEW_PROMOTION_ID,
  buildPromotedProductionState,
  hasAppliedPreviewPromotion,
  previewPromotionBackupId,
  safePreviewPodcastEpisodeId,
} from './previewPromotion.js';

test('preview promotion keeps preview career data but removes preview-only marker', () => {
  const promoted = buildPromotedProductionState({
    previewState: {
      player: { name: 'Sam Jones' },
      _preview: { isolated: true },
      _sync: { revision: 42, updatedAt: '2026-09-19T19:00:00.000Z' },
    },
    productionState: {
      _sync: { revision: 7, updatedAt: '2026-09-18T20:00:00.000Z' },
    },
    now: '2026-09-19T20:30:00.000Z',
  });

  assert.equal(promoted.player.name, 'Sam Jones');
  assert.equal(promoted._preview, undefined);
  assert.equal(promoted._sync.revision, 43);
  assert.equal(promoted._sync.updatedAt, '2026-09-19T20:30:00.000Z');
  assert.equal(promoted._previewPromotion.id, PREVIEW_PROMOTION_ID);
  assert.equal(promoted._previewPromotion.sourceAppId, PREVIEW_DATA_APP_ID);
  assert.equal(hasAppliedPreviewPromotion(promoted), true);
});

test('preview promotion creates stable safe backup and podcast ids', () => {
  assert.match(previewPromotionBackupId(), /^before_preview-to-live-2026-09-20-v2$/);
  assert.equal(safePreviewPodcastEpisodeId('week/2/recap'), 'week-2-recap');
});
