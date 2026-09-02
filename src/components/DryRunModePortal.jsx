import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FlaskConical, LockKeyhole, ShieldCheck } from 'lucide-react';
import './dry-run-mode.css';

const STORAGE_KEY = 'dynastyhq:weekly-data-dry-run';
const BLOCKED_ACTION = /^(?:apply\b|save\b|publish\b|finalize\b|process\b|record milestone\b|log milestone\b|advance week\b|complete week\b|update game log\b)/i;

const readStoredMode = () => {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
};

const writeStoredMode = (enabled) => {
  try {
    if (enabled) window.sessionStorage.setItem(STORAGE_KEY, '1');
    else window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Dry Run still works for the current render if sessionStorage is unavailable.
  }
};

const isBlockedAction = (button) => BLOCKED_ACTION.test((button?.textContent || '').trim());

const DryRunControl = ({ enabled, onToggle }) => (
  <div className={`dhq-dry-run-control ${enabled ? 'is-active' : ''}`} data-dry-run-control>
    <div className="dhq-dry-run-control__icon"><FlaskConical size={16} /></div>
    <div className="dhq-dry-run-control__copy">
      <span>Scanner Test Mode</span>
      <strong>Dry Run Mode</strong>
      <p>{enabled
        ? 'Safe to use old screenshots. Analyze and review normally; Apply, Save, Publish, Process, and Finalize actions are locked for this tab.'
        : 'Turn this on before testing old screenshots. DynastyHQ will allow scanning and review while blocking career-changing actions.'}</p>
    </div>
    <button
      type="button"
      className="dhq-dry-run-control__toggle"
      aria-pressed={enabled}
      onClick={() => onToggle(!enabled)}
    >
      {enabled ? <><LockKeyhole size={13} /> ON · NO SAVE</> : <><ShieldCheck size={13} /> Enable Dry Run</>}
    </button>
  </div>
);

const DryRunModePortal = () => {
  const [enabled, setEnabled] = useState(readStoredMode);
  const [target, setTarget] = useState(null);
  const [agenda, setAgenda] = useState(null);

  useEffect(() => {
    writeStoredMode(enabled);
  }, [enabled]);

  useEffect(() => {
    const appRoot = document.getElementById('root');
    if (!appRoot) return undefined;

    let currentAgenda = null;
    let currentIntake = null;

    const markBlockedActions = () => {
      if (!currentAgenda) return;
      currentAgenda.dataset.dhqDryRun = enabled ? 'true' : 'false';
      const buttons = [...currentAgenda.querySelectorAll('button')];
      buttons.forEach((button) => {
        const shouldBlock = enabled && isBlockedAction(button);
        if (shouldBlock) {
          button.dataset.dhqDryRunBlocked = 'true';
          button.setAttribute('aria-disabled', 'true');
        } else if (button.dataset.dhqDryRunBlocked === 'true') {
          delete button.dataset.dhqDryRunBlocked;
          button.removeAttribute('aria-disabled');
        }
      });
    };

    const blockClick = (event) => {
      if (!enabled) return;
      const button = event.target?.closest?.('button');
      if (!button || !currentAgenda?.contains(button) || !isBlockedAction(button)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const blockSubmit = (event) => {
      if (!enabled || !currentAgenda?.contains(event.target)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };

    const ensure = () => {
      const nextAgenda = appRoot.querySelector('.dhq-weekly-agenda-workspace');
      const intake = nextAgenda?.querySelector('[data-weekly-data-intake]');
      if (!nextAgenda || !intake) {
        currentAgenda?.removeEventListener('click', blockClick, true);
        currentAgenda?.removeEventListener('submit', blockSubmit, true);
        currentAgenda = null;
        currentIntake = null;
        setAgenda(null);
        setTarget(null);
        return;
      }

      if (currentAgenda !== nextAgenda) {
        currentAgenda?.removeEventListener('click', blockClick, true);
        currentAgenda?.removeEventListener('submit', blockSubmit, true);
        currentAgenda = nextAgenda;
        currentAgenda.addEventListener('click', blockClick, true);
        currentAgenda.addEventListener('submit', blockSubmit, true);
      }
      currentIntake = intake;

      let host = intake.querySelector('#dhq-dry-run-mode-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'dhq-dry-run-mode-host';
      }
      const header = intake.querySelector('.dhq-weekly-data-intake__header');
      const lanes = intake.querySelector('.dhq-weekly-data-intake__lanes');
      if (host.parentElement !== intake) {
        if (lanes) intake.insertBefore(host, lanes);
        else if (header) header.insertAdjacentElement('afterend', host);
        else intake.prepend(host);
      }
      markBlockedActions();
      setAgenda((current) => current === nextAgenda ? current : nextAgenda);
      setTarget((current) => current === host ? current : host);
    };

    ensure();
    const observer = new MutationObserver(() => {
      ensure();
      markBlockedActions();
    });
    observer.observe(appRoot, { childList: true, subtree: true, characterData: true });

    return () => {
      observer.disconnect();
      currentAgenda?.removeEventListener('click', blockClick, true);
      currentAgenda?.removeEventListener('submit', blockSubmit, true);
      if (currentAgenda) {
        delete currentAgenda.dataset.dhqDryRun;
        currentAgenda.querySelectorAll('[data-dhq-dry-run-blocked="true"]').forEach((button) => {
          delete button.dataset.dhqDryRunBlocked;
          button.removeAttribute('aria-disabled');
        });
      }
      currentIntake?.querySelector('#dhq-dry-run-mode-host')?.remove();
    };
  }, [enabled]);

  if (!target || !agenda) return null;
  return createPortal(<DryRunControl enabled={enabled} onToggle={setEnabled} />, target);
};

export default DryRunModePortal;
