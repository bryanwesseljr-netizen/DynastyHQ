(() => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();

  const openRecruitingBoard = () => {
    const navButton = [...document.querySelectorAll('header.no-print button')]
      .find((button) => normalize(button.textContent) === 'recruiting board');
    if (!navButton) return false;
    navButton.click();
    return true;
  };

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button || normalize(button.textContent) !== 'open recruit command center') return;

    if (openRecruitingBoard()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
})();
