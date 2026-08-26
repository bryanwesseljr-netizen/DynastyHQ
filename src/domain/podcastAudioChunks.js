export const FIRESTORE_AUDIO_DATA_MAX_CHARS = 360_000;

const normalizedChunkSize = (maxDataChars = FIRESTORE_AUDIO_DATA_MAX_CHARS) => {
  const numeric = Math.max(4, Number(maxDataChars) || FIRESTORE_AUDIO_DATA_MAX_CHARS);
  return Math.max(4, Math.floor(numeric / 4) * 4);
};

const splitBase64 = (data, maxDataChars) => {
  const value = String(data || '');
  const chunkSize = normalizedChunkSize(maxDataChars);
  if (!value || value.length <= chunkSize) return [value];
  const chunks = [];
  for (let offset = 0; offset < value.length; offset += chunkSize) {
    chunks.push(value.slice(offset, offset + chunkSize));
  }
  return chunks;
};

export const chunkPodcastAudioForStorage = (
  segments = [],
  maxDataChars = FIRESTORE_AUDIO_DATA_MAX_CHARS,
) => {
  const stored = [];
  (Array.isArray(segments) ? segments : []).forEach((segment, segmentIndex) => {
    const chunks = splitBase64(segment?.data, maxDataChars);
    chunks.forEach((data, chunkIndex) => {
      stored.push({
        index: stored.length,
        segmentIndex,
        chunkIndex,
        chunkCount: chunks.length,
        data,
        mimeType: segment?.mimeType || 'audio/mpeg',
        hostId: segment?.hostId || '',
        continuous: Boolean(segment?.continuous),
      });
    });
  });
  return stored;
};

const legacyEntry = (entry, index) => ({
  index: Number.isFinite(Number(entry?.index)) ? Number(entry.index) : index,
  data: String(entry?.data || ''),
  mimeType: entry?.mimeType || 'audio/mpeg',
  hostId: entry?.hostId || '',
  continuous: Boolean(entry?.continuous),
});

export const reassemblePodcastAudioFromStorage = (entries = []) => {
  const sorted = (Array.isArray(entries) ? entries : [])
    .map((entry, index) => ({ ...entry, _fallbackIndex: index }))
    .sort((a, b) => (Number(a.index) || 0) - (Number(b.index) || 0));
  if (!sorted.length) return [];

  const hasChunkMetadata = sorted.some((entry) => Number.isFinite(Number(entry?.segmentIndex)));
  if (!hasChunkMetadata) return sorted.map(legacyEntry);

  const groups = new Map();
  sorted.forEach((entry) => {
    const segmentIndex = Number.isFinite(Number(entry?.segmentIndex))
      ? Number(entry.segmentIndex)
      : Number(entry.index) || entry._fallbackIndex;
    if (!groups.has(segmentIndex)) groups.set(segmentIndex, []);
    groups.get(segmentIndex).push(entry);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([segmentIndex, chunks]) => {
      const ordered = [...chunks].sort((a, b) => (Number(a.chunkIndex) || 0) - (Number(b.chunkIndex) || 0));
      const first = ordered[0] || {};
      return {
        index: segmentIndex,
        data: ordered.map((entry) => String(entry?.data || '')).join(''),
        mimeType: first.mimeType || 'audio/mpeg',
        hostId: first.hostId || '',
        continuous: Boolean(first.continuous),
      };
    });
};