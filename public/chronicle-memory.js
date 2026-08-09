(() => {
  const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
  const meaningful = (value) => {
    const text = clean(value).toLowerCase();
    return !!text && !['empty', '—', 'none', 'null', 'undefined'].includes(text);
  };
  const titleCase = (value) => clean(value)
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  const esc = (value) => clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  const readFacts = (ledger) => {
    const seen = new Set();
    return [...ledger.querySelectorAll('[class*="font-mono"]')].map((keyNode) => {
      const key = clean(keyNode.textContent);
      if (!key || seen.has(key)) return null;
      seen.add(key);
      const card = keyNode.closest('.rounded-lg');
      const contentRow = keyNode.previousElementSibling;
      const pair = contentRow?.firstElementChild;
      const label = clean(pair?.children?.[0]?.textContent || 'Verified fact');
      const value = clean(pair?.children?.[1]?.textContent || '—');
      return { key, label, value, card };
    }).filter(Boolean);
  };

  const recruitingBoard = (facts) => facts.map((fact) => {
    const match = fact.key.match(/recruiting\.school-([^.]+)\.preferenceRank/i);
    if (!match || !Number.isFinite(Number(fact.value))) return null;
    return { school: titleCase(match[1]), rank: Number(fact.value) };
  }).filter(Boolean).sort((a, b) => a.rank - b.rank).slice(0, 10);

  const buildDevelopments = (facts, board, article) => {
    const items = [];
    const tape = facts.find((fact) => /tape score/i.test(fact.label) && meaningful(fact.value));
    const selected = facts.find((fact) => /top schools selected/i.test(fact.label) && meaningful(fact.value));
    const progress = facts.filter((fact) => /recruiting progress/i.test(fact.label) && meaningful(fact.value));
    const player = facts.find((fact) => /^player$/i.test(fact.label) && meaningful(fact.value));
    if (board[0]) items.push({ label: 'Recruiting leader', value: `${board[0].school} · #${board[0].rank}`, detail: 'Current verified preference board' });
    if (tape) items.push({ label: 'Tape & development', value: `Tape Score ${tape.value}`, detail: 'Verified evaluation checkpoint' });
    if (selected) items.push({ label: 'Board status', value: `${selected.value} schools selected`, detail: 'Top Schools board locked for this moment' });
    progress.slice(0, 1).forEach((fact) => {
      const school = fact.key.match(/recruiting\.school-([^.]+)/i)?.[1];
      items.push({ label: 'Recruiting development', value: fact.value, detail: school ? titleCase(school) : 'Verified recruiting update' });
    });
    if (!items.length && player) items.push({ label: 'Career checkpoint', value: player.value, detail: 'Verified player identity attached to this entry' });
    if (!items.length) {
      const title = clean(article.querySelector('h2')?.textContent || 'Verified career update');
      items.push({ label: 'Verified checkpoint', value: title, detail: `${facts.length} source facts attached` });
    }
    return items.slice(0, 4);
  };

  const buildWhy = (facts, board, article) => {
    const title = clean(article.querySelector('h2')?.textContent || 'This career checkpoint');
    const tape = facts.find((fact) => /tape score/i.test(fact.label) && meaningful(fact.value));
    if (board.length) {
      return `This snapshot preserves the recruiting board at a specific moment in the journey, with ${board[0].school} sitting at #${board[0].rank}. Future movement can now be viewed against a real historical checkpoint instead of a raw data dump.`;
    }
    if (tape) return `This moment preserves a verified evaluation checkpoint at Tape Score ${tape.value}, giving later recruiting and development changes a clear point of comparison.`;
    return `${title} is preserved here as part of the permanent career story, with the supporting source facts available whenever you want to audit the record.`;
  };

  const buildTags = (facts, board, article) => {
    const tags = [];
    if (board.length) tags.push('Recruiting Board');
    if (facts.some((fact) => /tape score/i.test(fact.label) && meaningful(fact.value))) tags.push('Tape Evaluation');
    if (facts.some((fact) => /recruiting progress/i.test(fact.label) && meaningful(fact.value))) tags.push('Recruiting Movement');
    if ([...article.querySelectorAll('button')].some((button) => /open news edition/i.test(clean(button.textContent)))) tags.push('Media Coverage');
    if (!tags.length) tags.push('Verified Checkpoint');
    return tags.slice(0, 5);
  };

  const itemHtml = (item) => `
    <div class="dhq-career-memory__item">
      <div class="dhq-career-memory__item-label">${esc(item.label)}</div>
      <div class="dhq-career-memory__item-value">${esc(item.value)}</div>
      <div class="dhq-career-memory__item-detail">${esc(item.detail)}</div>
    </div>`;

  const enhance = () => {
    try {
      const chronicleTitle = [...document.querySelectorAll('h2')].find((node) => /career chronicle/i.test(clean(node.textContent)));
      if (!chronicleTitle) return;
      const articles = [...document.querySelectorAll('article')];
      const article = articles.find((node) => /verified fact ledger/i.test(clean(node.textContent)));
      if (!article) return;
      const ledgerHeading = [...article.querySelectorAll('h3')].find((node) => /verified fact ledger/i.test(clean(node.textContent)));
      const ledger = ledgerHeading?.closest('section');
      if (!ledger) return;

      const facts = readFacts(ledger);
      if (!facts.length) return;
      const signature = facts.map((fact) => `${fact.key}:${fact.value}`).join('|');
      const oldMemory = article.querySelector('.dhq-career-memory');
      const oldToggle = article.querySelector('.dhq-verification-toggle');
      if (oldMemory?.dataset.signature === signature) return;
      oldMemory?.remove();
      oldToggle?.remove();

      const board = recruitingBoard(facts);
      const developments = buildDevelopments(facts, board, article);
      const why = buildWhy(facts, board, article);
      const tags = buildTags(facts, board, article);
      const hasNews = tags.includes('Media Coverage');

      const memory = document.createElement('section');
      memory.className = 'dhq-career-memory';
      memory.dataset.signature = signature;
      memory.innerHTML = `
        <div class="dhq-career-memory__head">
          <div class="dhq-career-memory__eyebrow">Career Memory</div>
          <div class="dhq-career-memory__title">What this moment meant</div>
        </div>
        <div class="dhq-career-memory__body">
          <div>
            <div class="dhq-career-memory__label">Key developments</div>
            <div class="dhq-career-memory__developments">${developments.map(itemHtml).join('')}</div>
          </div>
          ${board.length ? `<div>
            <div class="dhq-career-memory__label">Recruiting picture</div>
            <div class="dhq-career-memory__board">${board.map((school) => `<div class="dhq-career-memory__school"><span class="dhq-career-memory__school-name">${esc(school.school)}</span><span class="dhq-career-memory__rank">#${school.rank}</span></div>`).join('')}</div>
          </div>` : ''}
          <div class="dhq-career-memory__meaning">
            <div class="dhq-career-memory__why">
              <div class="dhq-career-memory__label">Why it mattered</div>
              <p>${esc(why)}</p>
            </div>
            <div class="dhq-career-memory__impact">
              <div class="dhq-career-memory__label">Career impact</div>
              <div class="dhq-career-memory__tags">${tags.map((tag) => `<span class="dhq-career-memory__tag">${esc(tag)}</span>`).join('')}</div>
            </div>
          </div>
          ${hasNews ? `<div class="dhq-career-memory__item"><div class="dhq-career-memory__item-label">Media from this moment</div><div class="dhq-career-memory__item-value">Newsroom coverage is attached</div><div class="dhq-career-memory__item-detail">Use “Open news edition” below to revisit the coverage tied to this Chronicle entry.</div></div>` : ''}
        </div>`;

      ledger.parentNode.insertBefore(memory, ledger);
      ledger.classList.add('dhq-chronicle-ledger-hidden');

      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'dhq-verification-toggle';
      toggle.setAttribute('aria-expanded', 'false');
      toggle.innerHTML = `<span class="dhq-verification-toggle__label">Sources & Verification</span><span class="dhq-verification-toggle__count">✓ ${facts.length} verified facts · View ledger</span>`;
      toggle.addEventListener('click', () => {
        const hidden = ledger.classList.toggle('dhq-chronicle-ledger-hidden');
        toggle.setAttribute('aria-expanded', hidden ? 'false' : 'true');
        toggle.querySelector('.dhq-verification-toggle__count').textContent = hidden
          ? `✓ ${facts.length} verified facts · View ledger`
          : `✓ ${facts.length} verified facts · Hide ledger`;
      });
      ledger.parentNode.insertBefore(toggle, ledger);
    } catch (error) {
      console.warn('Chronicle memory enhancement skipped:', error);
    }
  };

  const start = () => {
    enhance();
    window.setInterval(enhance, 800);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
