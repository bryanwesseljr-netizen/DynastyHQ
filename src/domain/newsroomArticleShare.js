export const readNewsroomArticleDeepLink = (search = '') => {
  const params = new URLSearchParams(String(search || ''));
  return {
    publicationId: params.get('frontPage') || '',
    articleId: params.get('article') || '',
  };
};

export const buildNewsroomArticleShareUrl = ({ publicUrl, publicationId, articleId }) => {
  if (!publicUrl || !publicationId || !articleId) return '';
  const url = new URL(publicUrl);
  url.searchParams.set('frontPage', publicationId);
  url.searchParams.set('article', articleId);
  return url.toString();
};
