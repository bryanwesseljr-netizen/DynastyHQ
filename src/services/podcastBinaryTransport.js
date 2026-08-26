const AUDIO_PATH = '/api/synthesize-podcast-conversation';
const PATCH_FLAG = '__dynastyhqPodcastBinaryTransportInstalled';

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const requestPath = (input) => {
  try {
    const raw = typeof input === 'string' || input instanceof URL
      ? String(input)
      : String(input?.url || '');
    if (!raw) return '';
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return '';
    return url.pathname;
  } catch {
    return '';
  }
};

if (typeof window !== 'undefined' && typeof window.fetch === 'function' && !window[PATCH_FLAG]) {
  const baseFetch = window.fetch.bind(window);
  window[PATCH_FLAG] = true;

  window.fetch = async (input, init) => {
    if (requestPath(input) !== AUDIO_PATH) return baseFetch(input, init);

    const response = await baseFetch(input, init);
    if (!response.ok) return response;

    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('audio/')) return response;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length) {
      return new Response(JSON.stringify({ error: 'The humanized audio renderer returned an empty MP3.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    const payload = {
      audioBase64: bytesToBase64(bytes),
      mimeType: contentType.split(';')[0] || 'audio/mpeg',
      model: response.headers.get('x-dynastyhq-model') || 'gemini-multispeaker',
      engine: response.headers.get('x-dynastyhq-engine') || 'gemini-multispeaker-v3',
      transcriptWords: Number(response.headers.get('x-dynastyhq-transcript-words')) || 0,
      performanceSections: Number(response.headers.get('x-dynastyhq-performance-sections')) || 0,
      responseBytes: bytes.length,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  };
}
