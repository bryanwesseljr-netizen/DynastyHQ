import { Camera, Newspaper, ScanLine, ShieldCheck } from 'lucide-react';
import NewsroomMediaManager from './NewsroomMediaManager';

const NewsroomEmptyState = ({
  readOnly = false,
  mediaLibrary = [],
  mediaBusy = false,
  autoGenerateLead = false,
  onOpenCommandCenter,
  onUploadMedia,
  onToggleReference,
  onDeleteMedia,
  onSetAutoGenerateLead,
}) => (
  <div className="relative z-10 mx-auto max-w-5xl space-y-6 pb-20">
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/90 shadow-2xl">
      <div className="border-b border-slate-800 bg-gradient-to-r from-blue-950/70 to-slate-950 p-7 md:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-400/30 bg-blue-500/10 text-blue-300"><Newspaper size={24} /></div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">Verified facts only</p>
        <h1 className="mt-2 text-3xl font-black uppercase text-white md:text-5xl">No edition published yet</h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300">The Newsroom stays empty until DynastyHQ has a reviewed recruiting update or a published game week. No placeholder players, invented statistics, Crystal Ball picks, scouting comparisons, or fabricated tactics will appear here.</p>
      </div>
      <div className="grid gap-4 p-6 md:grid-cols-3 md:p-8">
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"><ScanLine className="text-amber-400" size={20} /><p className="mt-3 text-xs font-black uppercase text-white">1. Upload screenshots</p><p className="mt-2 text-xs leading-relaxed text-slate-500">Add the initial rankings, Top Schools, school overview, offer, or postgame screens.</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"><ShieldCheck className="text-emerald-400" size={20} /><p className="mt-3 text-xs font-black uppercase text-white">2. Review every fact</p><p className="mt-2 text-xs leading-relaxed text-slate-500">Correct uncertain values before anything touches the recruiting board or career record.</p></div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"><Camera className="text-blue-400" size={20} /><p className="mt-3 text-xs font-black uppercase text-white">3. Publish the edition</p><p className="mt-2 text-xs leading-relaxed text-slate-500">Verified facts automatically build Recruiting Wire or the complete weekly newsroom.</p></div>
      </div>
      {!readOnly && <div className="px-6 pb-7 md:px-8"><button type="button" onClick={onOpenCommandCenter} className="w-full rounded-xl bg-amber-500 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 hover:bg-amber-400">Open Command Center Upload</button></div>}
    </section>

    {!readOnly && (
      <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-slate-950/90 shadow-2xl">
        <div className="p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">Preseason Media Prep</p><h2 className="mt-1 text-2xl font-black uppercase text-white">Reference Locker</h2><p className="mt-2 text-sm text-slate-400">Prepare your approved player and uniform references now; article photos can be assigned after the first edition exists.</p></div>
        <NewsroomMediaManager
          lockerOnly
          mediaLibrary={mediaLibrary}
          busy={mediaBusy}
          autoGenerateLead={autoGenerateLead}
          onUpload={onUploadMedia}
          onToggleReference={onToggleReference}
          onDelete={onDeleteMedia}
          onSetAutoGenerateLead={onSetAutoGenerateLead}
        />
      </section>
    )}
  </div>
);

export default NewsroomEmptyState;
