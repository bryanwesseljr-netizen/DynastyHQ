const waitForEvent = (target, eventName, timeoutMs = 12000) => new Promise((resolve, reject) => {
  let timer = null;
  const cleanup = () => {
    target.removeEventListener(eventName, onEvent);
    target.removeEventListener('error', onError);
    if (timer) clearTimeout(timer);
  };
  const onEvent = () => { cleanup(); resolve(); };
  const onError = () => { cleanup(); reject(new Error('The menu video could not be decoded in this browser.')); };
  target.addEventListener(eventName, onEvent, { once: true });
  target.addEventListener('error', onError, { once: true });
  timer = setTimeout(() => {
    cleanup();
    reject(new Error(`Timed out while waiting for video ${eventName}.`));
  }, timeoutMs);
});

const seekVideo = async (video, time) => {
  const safeTime = Math.max(0, Math.min(Number(video.duration) || 0, Number(time) || 0));
  if (Math.abs((Number(video.currentTime) || 0) - safeTime) < 0.015 && video.readyState >= 2) return;
  const pending = waitForEvent(video, 'seeked', 10000);
  video.currentTime = safeTime;
  await pending;
};

export const frameDifference = (left = [], right = []) => {
  if (!left.length || left.length !== right.length) return 1;
  let delta = 0;
  for (let index = 0; index < left.length; index += 1) delta += Math.abs(Number(left[index]) - Number(right[index]));
  return delta / (left.length * 255);
};

export const shouldKeepMenuFrame = ({
  isFirst = false,
  difference = 0,
  secondsSinceLastKeep = 0,
  differenceThreshold = 0.045,
  forceKeepAfterSeconds = 2.4,
} = {}) => Boolean(
  isFirst
  || Number(difference) >= Number(differenceThreshold)
  || Number(secondsSinceLastKeep) >= Number(forceKeepAfterSeconds)
);

const createSignature = (video, canvas, context) => {
  const width = 32;
  const height = 18;
  canvas.width = width;
  canvas.height = height;
  context.drawImage(video, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const signature = new Uint8Array(width * height);
  for (let source = 0, target = 0; source < pixels.length; source += 4, target += 1) {
    signature[target] = Math.round((pixels[source] * 0.299) + (pixels[source + 1] * 0.587) + (pixels[source + 2] * 0.114));
  }
  return signature;
};

const canvasToJpegFile = (canvas, name, quality = 0.9) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (!blob) {
      reject(new Error('DynastyHQ could not create an image from one of the video frames.'));
      return;
    }
    resolve(new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() }));
  }, 'image/jpeg', quality);
});

const captureFrame = async (video, time, index, maxWidth = 1800) => {
  const sourceWidth = Math.max(1, Number(video.videoWidth) || 1920);
  const sourceHeight = Math.max(1, Number(video.videoHeight) || 1080);
  const scale = Math.min(1, maxWidth / sourceWidth);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('This browser cannot create video-frame previews.');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const stamp = String(Math.round(time * 10) / 10).replace('.', '_');
  return canvasToJpegFile(canvas, `menu-video-frame-${String(index + 1).padStart(2, '0')}-${stamp}s.jpg`);
};

export const extractMenuVideoFrames = async (file, {
  sampleIntervalSeconds = 0.8,
  maxFrames = 14,
  maxDurationSeconds = 120,
  differenceThreshold = 0.045,
  forceKeepAfterSeconds = 2.4,
  onProgress = () => {},
} = {}) => {
  if (!file) throw new Error('Choose a menu screen recording first.');
  const looksLikeVideo = String(file.type || '').startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(String(file.name || ''));
  if (!looksLikeVideo) throw new Error('Use an MP4, MOV, M4V, or WebM menu screen recording.');
  if (typeof document === 'undefined' || typeof URL === 'undefined') throw new Error('Menu Video Import requires a browser.');

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  try {
    if (video.readyState < 1) await waitForEvent(video, 'loadedmetadata');
    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) throw new Error('DynastyHQ could not read the menu video duration.');
    if (duration > maxDurationSeconds) throw new Error(`Keep Menu Video Import under ${maxDurationSeconds} seconds. Short menu recordings scan faster and cost less.`);
    if (video.readyState < 2) await waitForEvent(video, 'loadeddata');

    const signatureCanvas = document.createElement('canvas');
    const signatureContext = signatureCanvas.getContext('2d', { willReadFrequently: true, alpha: false });
    if (!signatureContext) throw new Error('This browser cannot compare menu video frames.');

    const start = Math.min(0.35, duration * 0.08);
    const end = Math.max(start, duration - 0.08);
    const sampleCount = Math.max(1, Math.ceil((end - start) / sampleIntervalSeconds) + 1);
    const frames = [];
    let previousSignature = null;
    let lastKeptTime = -Infinity;

    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const time = Math.min(end, start + (sampleIndex * sampleIntervalSeconds));
      await seekVideo(video, time);
      const signature = createSignature(video, signatureCanvas, signatureContext);
      const difference = previousSignature ? frameDifference(signature, previousSignature) : 1;
      const keep = shouldKeepMenuFrame({
        isFirst: frames.length === 0,
        difference,
        secondsSinceLastKeep: time - lastKeptTime,
        differenceThreshold,
        forceKeepAfterSeconds,
      });

      if (keep) {
        frames.push(await captureFrame(video, time, frames.length));
        lastKeptTime = time;
        if (frames.length >= maxFrames) break;
      }
      previousSignature = signature;
      onProgress({
        phase: 'extracting',
        percent: Math.min(100, Math.round(((sampleIndex + 1) / sampleCount) * 100)),
        frames: frames.length,
        time,
        duration,
      });
    }

    if (!frames.length) {
      await seekVideo(video, Math.min(duration / 2, end));
      frames.push(await captureFrame(video, video.currentTime, 0));
    }

    onProgress({ phase: 'complete', percent: 100, frames: frames.length, duration });
    return frames;
  } finally {
    video.removeAttribute('src');
    try { video.load(); } catch { /* no-op */ }
    URL.revokeObjectURL(objectUrl);
  }
};
