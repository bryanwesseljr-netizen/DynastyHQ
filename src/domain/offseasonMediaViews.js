// Offseason editorial remains in its own immutable publication lane.
// Adapt it for the native Newsroom and Podcast displays without copying
// content into game-week collections or modifying verified career facts.
const list = (value) => Array.isArray(value) ? value.filter(Boolean) : [];
const clean = (value) => String(value ?? '').trim();
const sortType = (type) => type === 'portal-entry' ? 1 : 0;

export const publishedOffseasonMedia = (state = {}, season = null) => (
  list(state?.offseasonEditions)
    .filter((edition) => Boolean(
      edition?.publishedAt
      && edition.id
      && edition.article?.headline
      && list(edition.article?.paragraphs).length
      && edition.podcast?.title
      && list(edition.podcast?.segments).length
      && (season === null || Number(edition.season) === Number(season))
    ))
    .sort((a,b) =>
      Number(a.season) - Number(b.season)
      || sortType(a.type) - sortType(b.type)
    )
);

export const offshoreArchiveEntry = (edition = {}) => ({
  id: clean(edition.id),
  publicationId: clean(edition.publicationId || edition.id),
  season: Number(edition.season) || 1,
  week: 999, // Places both specials after normal games in the season archive.
  offseasonEdition: edition,
  media: {
    newsroom: {
      headline: clean(edition.article?.headline),
      dek: clean(edition.article?.dek),
    },
  },
  summary: clean(edition.article?.dek),
});

export const offseasonPodcastView = (edition = {}) => {
  const podcast = edition.podcast || {};
  const segments = list(podcast.segments).map((segment,index) => ({
    id: `${edition.id}-segment-${index}`,
    speaker: clean(segment.speaker),
    text: clean(segment.text),
  }));
  return {
    episode: null,
    publicationId: clean(edition.publicationId || edition.id),
    title: clean(podcast.title),
    summary: clean(podcast.summary),
    chapters: list(podcast.chapters),
    segments,
    transcript: segments.map(segment => `${segment.speaker}: ${segment.text}`).join('\n\n'),
    sourceFacts: [],
    status: 'scripted',
    audioStatus: podcast.audioStatus || 'not-generated',
    audioReady: false, // Offseason master-audio publishing is not connected.
    audioEngine: '',
    masterAudioFileName: '',
    masterAudioSizeBytes: 0,
    duration: 'TRANSCRIPT READY',
    previous: [],
    archive: [],
  };
};

export const offseasonSpecialLabel = (edition) => (
  edition?.type === 'portal-entry' ? 'TRANSFER PORTAL SPECIAL' : 'SEASON RETROSPECTIVE'
);
