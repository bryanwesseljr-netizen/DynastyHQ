import { useEffect } from 'react';

const ENHANCED_ATTR = 'data-dhq-podcast-seek';
const RANGE_STEPS = 1000;
const SEEK_SECONDS = 15;

const isContinuousPlayer = (container) => (
  /continuous episode/i.test(String(container?.textContent || ''))
);

const findPlayerContainer = (audio) => {
  let node = audio?.parentElement || null;
  while (node && node !== document.body) {
    const hasPlaybackButton = Boolean(node.querySelector?.('button[aria-label="Play episode"], button[aria-label="Pause episode"]'));
    if (hasPlaybackButton) return node;
    node = node.parentElement;
  }
  return null;
};

const findProgressTrack = (container) => [...(container?.querySelectorAll?.('div') || [])].find((node) => (
  node.classList.contains('mt-3')
  && node.classList.contains('h-1.5')
  && node.classList.contains('bg-slate-800')
  && node.firstElementChild
));

const clampTime = (audio, value) => {
  const duration = Number(audio?.duration) || 0;
  if (!duration) return 0;
  return Math.max(0, Math.min(duration, Number(value) || 0));
};

const enhanceAudio = (audio) => {
  if (!audio || audio.dataset.dhqSeekAudio === 'true') return;
  const container = findPlayerContainer(audio);
  if (!container || !isContinuousPlayer(container)) return;
  const track = findProgressTrack(container);
  if (!track || track.getAttribute(ENHANCED_ATTR) === 'true') return;

  const fill = track.firstElementChild;
  track.setAttribute(ENHANCED_ATTR, 'true');
  track.classList.add('dhq-podcast-seek-track');

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = String(RANGE_STEPS);
  range.step = '1';
  range.value = '0';
  range.className = 'dhq-podcast-seek-range';
  range.setAttribute('aria-label', 'Seek through podcast episode');
  range.title = 'Drag to seek through this episode';
  track.appendChild(range);

  const actions = document.createElement('div');
  actions.className = 'dhq-podcast-seek-actions';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'dhq-podcast-seek-jump';
  back.textContent = '−15s';
  back.setAttribute('aria-label', 'Go back 15 seconds');

  const hint = document.createElement('span');
  hint.className = 'dhq-podcast-seek-hint';
  hint.textContent = 'Drag the timeline to seek';

  const forward = document.createElement('button');
  forward.type = 'button';
  forward.className = 'dhq-podcast-seek-jump';
  forward.textContent = '+15s';
  forward.setAttribute('aria-label', 'Go forward 15 seconds');

  actions.append(back, hint, forward);
  track.insertAdjacentElement('afterend', actions);

  const sync = () => {
    const duration = Number(audio.duration) || 0;
    const currentTime = Number(audio.currentTime) || 0;
    const ratio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
    range.value = String(Math.round(ratio * RANGE_STEPS));
    range.setAttribute('aria-valuetext', duration > 0
      ? `${Math.floor(currentTime)} seconds of ${Math.floor(duration)} seconds`
      : 'Audio duration loading');
    if (fill) fill.style.width = `${ratio * 100}%`;
  };

  range.addEventListener('input', () => {
    const duration = Number(audio.duration) || 0;
    if (!duration) return;
    audio.currentTime = clampTime(audio, duration * (Number(range.value) / RANGE_STEPS));
    sync();
  });

  back.addEventListener('click', () => {
    audio.currentTime = clampTime(audio, (Number(audio.currentTime) || 0) - SEEK_SECONDS);
    sync();
  });

  forward.addEventListener('click', () => {
    audio.currentTime = clampTime(audio, (Number(audio.currentTime) || 0) + SEEK_SECONDS);
    sync();
  });

  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'ended'].forEach((eventName) => {
    audio.addEventListener(eventName, sync);
  });

  audio.dataset.dhqSeekAudio = 'true';
  sync();
};

const PodcastSeekControlsPortal = () => {
  useEffect(() => {
    let scheduled = false;
    const enhance = () => {
      scheduled = false;
      document.querySelectorAll('audio').forEach(enhanceAudio);
    };
    const scheduleEnhance = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(enhance);
    };

    enhance();
    const observer = new MutationObserver(scheduleEnhance);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  return null;
};

export default PodcastSeekControlsPortal;
