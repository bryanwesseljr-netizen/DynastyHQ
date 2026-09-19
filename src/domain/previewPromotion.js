export const PREVIEW_DATA_APP_ID = 'dynasty-hq-preview';
export const PREVIEW_PROMOTION_ID = 'preview-to-live-2026-09-19';

export const previewPromotionBackupId = (promotionId = PREVIEW_PROMOTION_ID) => (
  `before_${String(promotionId || PREVIEW_PROMOTION_ID).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120)}`
);

export const safePreviewPodcastEpisodeId = (episodeId) => (
  String(episodeId || '').replaceAll('/', '-').slice(0, 180)
);

export const buildPromotedProductionState = ({
  previewState = {},
  productionState = {},
  now = new Date().toISOString(),
  deviceId = 'preview-promotion',
  promotionId = PREVIEW_PROMOTION_ID,
} = {}) => {
  const previewRevision = Number(previewState?._sync?.revision) || 0;
  const productionRevision = Number(productionState?._sync?.revision) || 0;
  const promoted = {
    ...previewState,
    _sync: {
      revision: Math.max(previewRevision, productionRevision) + 1,
      deviceId,
      updatedAt: now,
    },
    _previewPromotion: {
      id: promotionId,
      sourceAppId: PREVIEW_DATA_APP_ID,
      importedAt: now,
      sourceUpdatedAt: previewState?._sync?.updatedAt || '',
      previousProductionUpdatedAt: productionState?._sync?.updatedAt || '',
    },
  };
  delete promoted._preview;
  return promoted;
};

export const hasAppliedPreviewPromotion = (
  productionState,
  promotionId = PREVIEW_PROMOTION_ID,
) => productionState?._previewPromotion?.id === promotionId;
