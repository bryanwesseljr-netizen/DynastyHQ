import { BookOpen, Check, ChevronRight, Compass, X } from 'lucide-react';
import {
  CAREER_HANDBOOK_META,
  CAREER_HANDBOOK_SECTIONS,
  CAREER_HANDBOOK_STAGE_GUIDE,
} from '../domain/careerHandbook';

const stageColors = {
  'Player creation': 'border-blue-400/30 bg-blue-500/10 text-blue-300',
  'High school': 'border-amber-400/30 bg-amber-500/10 text-amber-300',
  'Commitment decision': 'border-violet-400/30 bg-violet-500/10 text-violet-300',
  'College career': 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
  'After RTG': 'border-rose-400/30 bg-rose-500/10 text-rose-300',
  'Ongoing reference': 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
};

const HandbookTable = ({ columns, rows }) => (
  <div className="overflow-x-auto rounded-xl border border-slate-700/80">
    <table className="w-full min-w-[560px] border-collapse text-left text-sm">
      <thead className="bg-slate-950/90">
        <tr>
          {columns.map((column) => (
            <th key={column} className="border-b border-slate-700 px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-300">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-800 bg-slate-900/60">
        {rows.map((row, rowIndex) => (
          <tr key={`${row[0]}-${rowIndex}`} className="align-top transition-colors hover:bg-slate-800/60">
            {row.map((cell, cellIndex) => (
              <td key={`${cellIndex}-${cell}`} className={`px-4 py-3 leading-6 ${cellIndex === 0 ? 'font-bold text-white' : 'text-slate-300'}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const HandbookContent = ({ block }) => {
  if (block.type === 'table') return <HandbookTable columns={block.columns} rows={block.rows} />;
  if (block.type === 'subheading') return <h4 className="pt-2 text-sm font-black uppercase tracking-wider text-white">{block.text}</h4>;
  if (block.type === 'paragraph') return <p className="text-sm font-medium leading-7 text-slate-300">{block.text}</p>;
  if (block.type === 'callout') {
    return (
      <aside className="rounded-xl border border-blue-400/25 bg-blue-500/[0.08] p-4">
        <p className="text-xs font-black uppercase tracking-widest text-blue-300">{block.title}</p>
        <p className="mt-2 text-sm font-medium leading-7 text-slate-200">{block.text}</p>
      </aside>
    );
  }
  if (block.type === 'numbered') {
    return (
      <ol className="grid gap-2 sm:grid-cols-2">
        {block.items.map((item, index) => (
          <li key={item} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm font-semibold text-slate-200">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-xs font-black text-blue-300">{index + 1}</span>
            {item}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <ul className="space-y-2.5">
      {block.items.map((item) => (
        <li key={item} className="flex gap-3 text-sm font-medium leading-6 text-slate-300">
          <Check size={16} className="mt-1 shrink-0 text-emerald-400" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

const CareerHandbookModal = ({ onClose }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-2 backdrop-blur-sm animate-in fade-in sm:p-4" role="dialog" aria-modal="true" aria-labelledby="career-handbook-title">
    <div className="flex h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl sm:h-[92vh]">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-blue-400">
            <BookOpen size={20} aria-hidden="true" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">CFB 27 Career Handbook</span>
          </div>
          <h2 id="career-handbook-title" className="mt-1 truncate text-lg font-black uppercase tracking-tight text-white sm:text-2xl">
            {CAREER_HANDBOOK_META.title}
          </h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Close career handbook">
          <X size={24} />
        </button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden overflow-y-auto border-r border-slate-800 bg-slate-950/80 p-4 lg:block">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Section index</p>
          <nav className="space-y-1" aria-label="Handbook sections">
            {CAREER_HANDBOOK_SECTIONS.map((section) => (
              <a key={section.id} href={`#${section.id}`} className="group flex items-start gap-3 rounded-lg px-3 py-2.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[11px] font-black text-blue-300 group-hover:bg-blue-500/15">{section.number}</span>
                <span className="text-xs font-bold leading-5">{section.title}</span>
              </a>
            ))}
          </nav>
        </aside>

        <main className="scroll-smooth overflow-y-auto bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.10),transparent_35%)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-slate-950/80 shadow-xl">
              <div className="border-b border-slate-800 bg-gradient-to-br from-blue-500/15 via-slate-950 to-amber-500/10 p-6 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">{CAREER_HANDBOOK_META.payoff}</p>
                <h3 className="mt-3 text-2xl font-black uppercase leading-tight text-white sm:text-4xl">{CAREER_HANDBOOK_META.title}</h3>
                <p className="mt-2 text-sm font-bold text-blue-300 sm:text-base">{CAREER_HANDBOOK_META.subtitle}</p>
                <p className="mt-5 max-w-3xl text-sm font-medium leading-7 text-slate-300">{CAREER_HANDBOOK_META.concept}</p>
                <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500">{CAREER_HANDBOOK_META.edition}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <Compass className="text-blue-400" size={22} aria-hidden="true" />
                <div>
                  <h3 className="font-black uppercase tracking-tight text-white">How to use this handbook</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-400">Use the sections in order. The rules create stakes without forcing you to spend the entire career watching from the bench.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {CAREER_HANDBOOK_STAGE_GUIDE.map(([stage, sections, purpose]) => (
                  <div key={stage} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">{stage}</p>
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-blue-300">{sections}</span>
                    </div>
                    <p className="mt-2 text-xs font-medium leading-5 text-slate-400">{purpose}</p>
                  </div>
                ))}
              </div>
            </section>

            {CAREER_HANDBOOK_SECTIONS.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-4 rounded-2xl border border-slate-700 bg-slate-900/85 p-5 shadow-lg sm:p-7">
                <div className="flex flex-col gap-3 border-b border-slate-800 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-lg font-black text-blue-300">{section.number}</span>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white sm:text-2xl">{section.title}</h3>
                      {section.intro && <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-400">{section.intro}</p>}
                    </div>
                  </div>
                  <span className={`w-fit shrink-0 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${stageColors[section.stage]}`}>
                    {section.stage}
                  </span>
                </div>
                <div className="mt-6 space-y-5">
                  {section.content.map((block, index) => <HandbookContent key={`${section.id}-${block.type}-${index}`} block={block} />)}
                </div>
              </section>
            ))}

            <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-slate-950 to-blue-500/10 p-7 text-center sm:p-10">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">The Career North Star</p>
              <p className="mx-auto mt-5 max-w-2xl text-xl font-black italic leading-8 text-white sm:text-2xl">{CAREER_HANDBOOK_META.northStar}</p>
              <div className="mx-auto my-6 h-px max-w-xs bg-gradient-to-r from-transparent via-slate-600 to-transparent" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-300">{CAREER_HANDBOOK_META.closing}</p>
            </section>

            <button type="button" onClick={onClose} className="mx-auto flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-slate-700">
              Return to DynastyHQ <ChevronRight size={16} />
            </button>
          </div>
        </main>
      </div>
    </div>
  </div>
);

export default CareerHandbookModal;
