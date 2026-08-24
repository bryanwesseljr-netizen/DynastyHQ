export const APP_VIEW_MODES = Object.freeze({
  OWNER: 'owner',
  PUBLIC_SHARE: 'public-share',
});

const cleanParam = (value) => String(value || '').trim();

export const resolveViewContext = (search = '') => {
  const params = new URLSearchParams(String(search || ''));
  const viewId = cleanParam(params.get('view'));
  const frontPageId = cleanParam(params.get('frontPage'));
  const isPublicShare = Boolean(viewId);

  return Object.freeze({
    mode: isPublicShare ? APP_VIEW_MODES.PUBLIC_SHARE : APP_VIEW_MODES.OWNER,
    viewId,
    frontPageId,
    isPublicShare,
    isReadOnly: isPublicShare,
    ownerEnhancementsAllowed: !isPublicShare,
  });
};

export const isPublicShareSearch = (search = '') => resolveViewContext(search).isPublicShare;
