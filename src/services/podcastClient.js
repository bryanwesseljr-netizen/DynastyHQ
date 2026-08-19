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
  if (!response.ok) throw new Error(payload.error || 'The podcast service did not respond.');
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
  return 'neutral';
};

export const generatePodcastScript = ({ idToken, payload }) => (
  request('/api/generate-podcast', { idToken, body: payload })
);

export const synthesizePodcastSegment = ({ idToken, hostId, text, deliveryStyle = '' }) => {
  const delivery = DELIVERY_STYLES.has(deliveryStyle) ? deliveryStyle : inferDeliveryStyle(text);
  return request('/api/synthesize-podcast', { idToken, body: { hostId, text, delivery } });
};
