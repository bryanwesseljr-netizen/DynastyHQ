(() => {
  const byId = (id) => document.getElementById(id);
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const readMatch = (text, regex, fallback) => clean(text.match(regex)?.[1] || fallback);
  const metrics = [
    ['TAPE', /TAPE SCORE\s*([0-9,]+)/i, '0'],
    ['OFFERS', /VERIFIED OFFERS\s*([0-9,]+)/i, '0'],
    ['GAMES', /GAMES COMPLETED\s*([0-9]+\s*\/\s*[0-9]+)/i, '0/5'],
    ['NEXT', null, 'GAME 1'],
  ];
  let metricIndex = 0;

  const update = () => {
    const pulse = byId('dynasty-pulse-static');
    if (!pulse) return;
    const text = document.body?.innerText || '';
    const season = readMatch(text, /SEASON\s+(\d+)/i, '1');
    const week = readMatch(text, /WEEK\s+(\d+)/i, '1');
    const overall = readMatch(text, /(\d+)\s*OVR/i, '63');
    const stars = readMatch(text, /(\d)[-\s]?STAR\s+QB/i, '3');
    const games = readMatch(text, /GAMES COMPLETED\s*([0-9]+)\s*\/\s*5/i, '0');
    const metric = metrics[metricIndex % metrics.length];
    let value = metric[1] ? readMatch(text, metric[1], metric[2]) : `GAME ${Math.min(5, Number(games || 0) + 1)}`;

    byId('dynasty-pulse-season').textContent = `S${season} · W${week}`;
    byId('dynasty-pulse-summary').textContent = `${stars}★ QB · ${overall} OVR`;
    byId('dynasty-pulse-metric-label').textContent = metric[0];
    byId('dynasty-pulse-metric-value').textContent = value;

    const candidate = [...document.images].find((img) => /profile|headshot|bryan/i.test(`${img.alt || ''} ${img.src || ''}`) && img.naturalWidth > 20);
    const avatar = byId('dynasty-pulse-avatar');
    if (candidate && avatar && !avatar.querySelector('img')) {
      avatar.textContent = '';
      const copy = document.createElement('img');
      copy.src = candidate.src;
      copy.alt = '';
      avatar.appendChild(copy);
    }
  };

  const start = () => {
    update();
    window.setInterval(update, 1200);
    window.setInterval(() => { metricIndex = (metricIndex + 1) % metrics.length; update(); }, 4600);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
