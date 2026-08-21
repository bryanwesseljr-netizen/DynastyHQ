const request = async (url, { idToken, body }) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'The podcast service did not respond.');
    error.status = response.status;
    throw error;
  }
  return payload;
};

const DELIVERY_STYLES = new Set([
  'neutral', 'curious', 'reflective', 'skeptical', 'emphatic', 'amused', 'quick-agreement', 'analytical',
]);

const inferDeliveryStyle = (value) => {
  const text = String(value || '').trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!text) return 'neutral';
  if (/\?$/.test(text) || /\b(what do you|how do you|do you think|is that|is this|where does|why does|what's the|what is the)\b/i.test(text)) return 'curious';
  if (words <= 45 && /^(yeah|right|exactly|absolutely|i'm with you|that's fair|fair|for sure|no question|100 percent)\b/i.test(text)) return 'quick-agreement';
  if (/\b(i don't know if|i'm not sure|but here's|but i think|i'd push back|i wouldn't go|not so fast|hold on|the problem with that)\b/i.test(text)) return 'skeptical';
  if (/\b(that's the key|that's the thing|this matters|the big thing|make no mistake|that's huge|that's important|you can't ignore)\b/i.test(text)) return 'emphatic';
  if (/\b(by the numbers|yard|yards|touchdown|turnover|first down|possession|percentage|record|streak|margin|interception)\b/i.test(text)) return 'analytical';
  if (/\b(i keep coming back to|when you think about|step back|bigger picture|long view|for me, the question|what stands out)\b/i.test(text)) return 'reflective';
  if (words <= 55 && /\b(look,|come on|that's funny|you've got to love|i mean,)\b/i.test(text)) return 'amused';
  return lower ? 'neutral' : 'neutral';
};

let pendingHumanizedMix = null;

const wordCount = (value) => String(value || '').trim().split(/\s+/).filter(Boolean).length;
const MIN_SCRIPT_TURNS = 10;
const MIN_SCRIPT_WORDS = 450;
const MAX_SCRIPT_WORDS = 950;

const inspectGeneratedScript = (episode) => {
  const segments = Array.isArray(episode?.segments) ? episode.segments.filter((segment) => String(segment?.text || '').trim()) : [];
  const words = segments.reduce((total, segment) => total + wordCount(segment.text), 0);
  const hostIds = new Set(segments.map((segment) => String(segment?.hostId || '').trim()).filter(Boolean));
  return {
    valid: segments.length >= MIN_SCRIPT_TURNS && hostIds.size >= 2 && words >= MIN_SCRIPT_WORDS && words <= MAX_SCRIPT_WORDS,
    segments: segments.length,
    words,
    hosts: hostIds.size,
  };
};

const incompleteScriptMessage = (inspection = {}) => {
  const reasons = [];
  if ((inspection.segments || 0) < MIN_SCRIPT_TURNS) reasons.push(`${inspection.segments || 0} turns; at least ${MIN_SCRIPT_TURNS} required`);
  if ((inspection.hosts || 0) < 2) reasons.push('both Mark and Sarah were not present');
  if ((inspection.words || 0) < MIN_SCRIPT_WORDS) reasons.push(`${inspection.words || 0} words; at least ${MIN_SCRIPT_WORDS} required`);
  if ((inspection.words || 0) > MAX_SCRIPT_WORDS) reasons.push(`${inspection.words || 0} words; maximum ${MAX_SCRIPT_WORDS}`);
  return `The podcast script was incomplete (${reasons.join('; ') || 'unknown validation issue'}). Please try generating it again.`;
};

const base64ToBytes = (base64) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const mp3FrameLength = (bytes, offset) => {
  if (offset + 4 > bytes.length) return 0;
  const b0 = bytes[offset];
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return 0;

  const versionBits = (b1 >> 3) & 0x03;
  const layerBits = (b1 >> 1) & 0x03;
  const bitrateIndex = (b2 >> 4) & 0x0f;
  const sampleRateIndex = (b2 >> 2) & 0x03;
  const padding = (b2 >> 1) & 0x01;
  if (versionBits === 1 || layerBits !== 1 || bitrateIndex === 0 || bitrateIndex === 15 || sampleRateIndex === 3) return 0;

  const mpeg1Bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
  const mpeg2Bitrates = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
  const sampleRates = {
    3: [44100, 48000, 32000],
    2: [22050, 24000, 16000],
    0: [11025, 12000, 8000],
  };
  const bitrate = (versionBits === 3 ? mpeg1Bitrates : mpeg2Bitrates)[bitrateIndex];
  const sampleRate = sampleRates[versionBits]?.[sampleRateIndex];
  if (!bitrate || !sampleRate) return 0;
  return Math.floor(((versionBits === 3 ? 144000 : 72000) * bitrate) / sampleRate) + padding;
};

const findMp3Frames = (bytes) => {
  const frames = [];
  let offset = 0;
  if (bytes.length >= 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    const tagSize = ((bytes[6] & 0x7f) << 21)
      | ((bytes[7] & 0x7f) << 14)
      | ((bytes[8] & 0x7f) << 7)
      | (bytes[9] & 0x7f);
    offset = Math.min(bytes.length, 10 + tagSize);
  }

  while (offset + 4 <= bytes.length) {
    const length = mp3FrameLength(bytes, offset);
    if (length > 0 && offset + length <= bytes.length) {
      frames.push({ start: offset, end: offset + length });
      offset += length;
    } else {
      offset += 1;
    }
  }
  return frames;
};

const splitHumanizedMp3 = ({ audioBase64, segments }) => {
  const bytes = base64ToBytes(audioBase64);
  const frames = findMp3Frames(bytes);
  if (frames.length < Math.max(segments.length * 8, 100)) {
    throw new Error('The humanized podcast mix could not be divided into playable turns.');
  }

  const weights = segments.map((segment) => Math.max(1, wordCount(segment?.text)));
  const totalWeight = weights.reduce((total, value) => total + value, 0);
  const boundaries = [0];
  let cumulativeWeight = 0;
  for (let index = 0; index < segments.length - 1; index += 1) {
    cumulativeWeight += weights[index];
    const ideal = Math.round((cumulativeWeight / totalWeight) * frames.length);
    const minBoundary = boundaries[boundaries.length - 1] + 1;
    const maxBoundary = frames.length - (segments.length - index - 1);
    boundaries.push(Math.max(minBoundary, Math.min(ideal, maxBoundary)));
  }
  boundaries.push(frames.length);

  return segments.map((segment, index) => {
    const startFrame = boundaries[index];
    const endFrame = boundaries[index + 1];
    const startByte = index === 0 ? 0 : frames[startFrame].start;
    const endByte = index === segments.length - 1 ? bytes.length : frames[endFrame].start;
    return {
      index,
      data: bytesToBase64(bytes.subarray(startByte, endByte)),
      mimeType: 'audio/mpeg',
      hostId: segment.hostId,
    };
  });
};

const prepareHumanizedMix = async ({ idToken, episode }) => {
  const segments = Array.isArray(episode?.segments) ? episode.segments : [];
  if (!segments.length) throw new Error('The podcast transcript is incomplete.');
  const rendered = await request('/api/synthesize-podcast-conversation', {
    idToken,
    body: {
      title: episode?.title || '',
      segments: segments.map((segment) => ({
        id: segment.id,
        hostId: segment.hostId,
        text: segment.text,
        deliveryStyle: DELIVERY_STYLES.has(segment.deliveryStyle)
          ? segment.deliveryStyle
          : inferDeliveryStyle(segment.text),
      })),
    },
  });
  if (!/^audio\/(?:mp3|mpeg)$/i.test(rendered.mimeType || '')) {
    throw new Error('The humanized podcast renderer returned an unsupported audio format.');
  }
  const pieces = splitHumanizedMp3({ audioBase64: rendered.audioBase64, segments });
  pendingHumanizedMix = {
    pieces,
    cursor: 0,
    model: rendered.model || 'gemini-multispeaker',
    engine: rendered.engine || 'gemini-multispeaker-v3',
  };
  return rendered;
};

export const generatePodcastScript = async ({ idToken, payload, prepareAudio = true }) => {
  pendingHumanizedMix = null;
  let generated = null;
  let inspection = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    generated = await request('/api/generate-podcast', { idToken, body: payload });
    inspection = inspectGeneratedScript(generated?.episode);
    if (inspection.valid) break;
  }

  if (!inspection?.valid) {
    throw new Error(incompleteScriptMessage(inspection));
  }

  if (prepareAudio) await prepareHumanizedMix({ idToken, episode: generated.episode });
  return generated;
};

export const synthesizePodcastSegment = ({ idToken, hostId, text, deliveryStyle = '' }) => {
  if (pendingHumanizedMix?.pieces?.length && pendingHumanizedMix.cursor < pendingHumanizedMix.pieces.length) {
    const piece = pendingHumanizedMix.pieces[pendingHumanizedMix.cursor];
    pendingHumanizedMix.cursor += 1;
    const model = pendingHumanizedMix.model;
    const engine = pendingHumanizedMix.engine;
    if (pendingHumanizedMix.cursor >= pendingHumanizedMix.pieces.length) pendingHumanizedMix = null;
    return Promise.resolve({
      audioBase64: piece.data,
      mimeType: piece.mimeType,
      model,
      engine,
      voice: 'Mark + Sarah',
    });
  }

  const delivery = DELIVERY_STYLES.has(deliveryStyle) ? deliveryStyle : inferDeliveryStyle(text);
  return request('/api/synthesize-podcast', { idToken, body: { hostId, text, delivery } });
};

export const generateHumanizedPodcastMix = async ({ idToken, episode }) => {
  pendingHumanizedMix = null;
  const rendered = await prepareHumanizedMix({ idToken, episode });
  const pieces = pendingHumanizedMix?.pieces ? [...pendingHumanizedMix.pieces] : [];
  pendingHumanizedMix = null;
  return { ...rendered, pieces };
};