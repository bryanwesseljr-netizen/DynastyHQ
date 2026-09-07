import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Cpu, LockKeyhole, ShieldCheck, UnlockKeyhole } from 'lucide-react';
import {
  AI_SCAN_USAGE_EVENT,
  readAiScanUsage,
  summarizeAiScanUsage,
} from '../services/aiUsageTracker.js';
import {
  PAID_VISION_FALLBACK_EVENT,
  readPaidVisionFallbackEnabled,
  setPaidVisionFallbackEnabled,
} from '../services/visionFallbackPreference.js';

const AiScanRoutingPortal = () => {
  const [target, setTarget] = useState(null);
  const [events, setEvents] = useState(() => readAiScanUsage());
  const [paidFallbackEnabled, setPaidFallbackEnabled] = useState(() => readPaidVisionFallbackEnabled());

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return undefined;

    const ensure = () => {
      const intake = root.querySelector('[data-weekly-data-intake]');
      const header = intake?.querySelector('.dhq-weekly-data-intake__header');
      if (!intake || !header) {
        setTarget(null);
        return;
      }
      let host = intake.querySelector('#dhq-ai-scan-routing-host');
      if (!host) {
        host = document.createElement('div');
        host.id = 'dhq-ai-scan-routing-host';
        header.insertAdjacentElement('afterend', host);
      } else if (host.previousElementSibling !== header) {
        header.insertAdjacentElement('afterend', host);
      }
      setTarget((current) => current === host ? current : host);
    };

    ensure();
    const observer = new MutationObserver(ensure);
    observer.observe(root, { childList: true, subtree: true });
    const onUsage = () => setEvents(readAiScanUsage());
    const onPreference = () => setPaidFallbackEnabled(readPaidVisionFallbackEnabled());
    window.addEventListener(AI_SCAN_USAGE_EVENT, onUsage);
    window.addEventListener(PAID_VISION_FALLBACK_EVENT, onPreference);

    return () => {
      observer.disconnect();
      window.removeEventListener(AI_SCAN_USAGE_EVENT, onUsage);
      window.removeEventListener(PAID_VISION_FALLBACK_EVENT, onPreference);
      root.querySelector('#dhq-ai-scan-routing-host')?.remove();
    };
  }, []);

  const summary = useMemo(() => summarizeAiScanUsage(events), [events]);
  const last = events[events.length - 1] || null;
  if (!target) return null;

  const noPaidFallback = !paidFallbackEnabled;
  const lastLabel = !last
    ? 'No scans recorded on this device yet'
    : last.provider === 'google'
      ? (last.paidFallbackBlocked
        ? 'Last scan: Gemini · paid fallback blocked · review recommended'
        : last.fallbackUnavailable
          ? 'Last scan: Gemini · review recommended; Luna unavailable'
          : 'Last scan: Gemini free-first')
      : `Last scan: Luna fallback${last.fallbackReason ? ` · ${last.fallbackReason.toLowerCase().replaceAll('_', ' ')}` : ''}`;

  const togglePaidFallback = () => {
    const next = setPaidVisionFallbackEnabled(!paidFallbackEnabled);
    setPaidFallbackEnabled(next);
  };

  return createPortal(
    <div className="mx-4 mb-2 flex flex-col gap-2.5 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.035] px-3 py-2.5 sm:mx-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-emerald-400/20 bg-emerald-500/10 text-emerald-300"><Cpu size={13} /></span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.13em] text-emerald-200">Free-first AI scanning</p>
          <p className="mt-0.5 text-[9px] leading-relaxed text-slate-400">
            {noPaidFallback
              ? 'Gemini 3.1 Flash-Lite only · uncertain scans go to human review · OpenAI vision is blocked.'
              : 'Gemini 3.1 Flash-Lite first · GPT-5.6 Luna may be used only when Gemini needs a second opinion.'}
          </p>
          <button
            type="button"
            onClick={togglePaidFallback}
            className={`mt-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] transition ${noPaidFallback ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15' : 'border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15'}`}
            aria-pressed={noPaidFallback}
            title={noPaidFallback ? 'Paid OpenAI vision fallback is blocked. Tap only if you want to allow it.' : 'Paid OpenAI vision fallback is allowed. Tap to block it.'}
          >
            {noPaidFallback ? <LockKeyhole size={10} /> : <UnlockKeyhole size={10} />}
            {noPaidFallback ? 'No Paid Fallback · ON' : 'Paid Fallback · ALLOWED'}
          </button>
        </div>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-300 sm:justify-end"><ShieldCheck size={11} /> This device · {summary.gemini} Gemini · {summary.openai} Luna</p>
        <p className={`mt-0.5 text-[8px] ${last?.paidFallbackBlocked || last?.fallbackUnavailable ? 'text-amber-300' : 'text-slate-500'}`}>{lastLabel}</p>
      </div>
    </div>,
    target,
  );
};

export default AiScanRoutingPortal;
