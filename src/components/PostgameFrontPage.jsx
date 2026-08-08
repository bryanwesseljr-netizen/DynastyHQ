import { useRef, useState } from 'react';
import { Download, ExternalLink, ImagePlus, Printer, RefreshCw, Share2, ShieldCheck, X } from 'lucide-react';
import { toPng } from 'html-to-image';

const assetUrl = (library, assetId) => library.find((asset) => asset.id === assetId)?.downloadUrl || '';
const safeFileName = (page) => `dynastyhq-${page.season}-${page.week}-front-page.png`;

const PhotoPicker = ({ label, value, mediaLibrary, disabled, onSelect, onUpload }) => (
  <div>
    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
    <div className="mt-1 flex gap-2">
      <select disabled={disabled} value={value || ''} onChange={(event) => onSelect(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-white disabled:opacity-50">
        <option value="">No Media Library photo</option>
        {mediaLibrary.map((asset) => <option key={asset.id} value={asset.id}>{asset.referenceLabel || asset.fileName}</option>)}
      </select>
      {!disabled && <label className="flex cursor-pointer items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-[9px] font-black uppercase text-slate-300 hover:border-blue-400"><ImagePlus size={13} /> Upload<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file); event.target.value = ''; }} /></label>}
    </div>
  </div>
);

const PostgameFrontPage = ({
  page,
  mediaLibrary = [],
  readOnly = false,
  onUpdate,
  onRegenerate,
  onUploadPhoto,
  onOpenPublic,
  onNotify,
  onClose,
}) => {
  const pageRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const gamePhotoUrl = assetUrl(mediaLibrary, page.gamePhotoAssetId);
  const playerHeadshot = assetUrl(mediaLibrary, page.player?.headshotAssetId) || page.player?.headshotUrl || '';
  const visibleTeammates = readOnly ? (page.teammates || []).filter((entry) => entry.name) : (page.teammates || []);

  const updateTeammate = (index, patch) => {
    const teammates = (page.teammates || []).map((entry, entryIndex) => entryIndex === index ? { ...entry, ...patch } : entry);
    onUpdate({ teammates });
  };

  const renderPng = async () => {
    if (!pageRef.current) throw new Error('The front page is not ready to export.');
    return toPng(pageRef.current, {
      cacheBust: true,
      pixelRatio: 2.5,
      backgroundColor: '#f4efe2',
      width: 816,
      height: pageRef.current.scrollHeight,
      style: { width: '816px', maxWidth: '816px', margin: '0' },
    });
  };

  const downloadPng = async () => {
    setExporting(true);
    try {
      const dataUrl = await renderPng();
      const link = document.createElement('a');
      link.download = safeFileName(page);
      link.href = dataUrl;
      link.click();
      onNotify?.('High-resolution front page downloaded.');
    } catch (error) {
      onNotify?.(error?.message || 'The PNG could not be created.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const sharePng = async () => {
    setExporting(true);
    try {
      const dataUrl = await renderPng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], safeFileName(page), { type: 'image/png' });
      if (!navigator.share || (navigator.canShare && !navigator.canShare({ files: [file] }))) {
        throw new Error('Direct sharing is not available in this browser. Download the PNG and share that file instead.');
      }
      await navigator.share({ title: page.headline, text: `${page.masthead} postgame front page`, files: [file] });
    } catch (error) {
      if (error?.name !== 'AbortError') onNotify?.(error?.message || 'The front page could not be shared.', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="Postgame front page workspace">
      <div className="no-print flex flex-col gap-3 rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-xl lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Weekly keepsake</p><h2 className="mt-1 text-xl font-black uppercase text-white">Postgame Front Page</h2>{page.needsRegeneration && <p className="mt-1 text-xs font-bold text-red-300">This page contains pre-correction facts. Regenerate it before printing or sharing.</p>}</div>
        <div className="flex flex-wrap gap-2">
          {!readOnly && <button type="button" onClick={onRegenerate} className="flex items-center gap-1 rounded-lg border border-amber-400/40 px-3 py-2 text-[10px] font-black uppercase text-amber-200"><RefreshCw size={13} /> Regenerate story</button>}
          <button type="button" disabled={page.needsRegeneration || exporting} onClick={downloadPng} className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-40"><Download size={13} /> PNG</button>
          <button type="button" disabled={page.needsRegeneration} onClick={() => window.print()} className="flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-40"><Printer size={13} /> Print / PDF</button>
          <button type="button" disabled={page.needsRegeneration || exporting} onClick={sharePng} className="flex items-center gap-1 rounded-lg border border-slate-600 px-3 py-2 text-[10px] font-black uppercase text-white disabled:opacity-40"><Share2 size={13} /> Share</button>
          {!readOnly && <button type="button" disabled={page.needsRegeneration} onClick={onOpenPublic} className="flex items-center gap-1 rounded-lg border border-emerald-500/40 px-3 py-2 text-[10px] font-black uppercase text-emerald-300 disabled:opacity-40"><ExternalLink size={13} /> Public version</button>}
          <button type="button" onClick={onClose} aria-label="Close front page" className="rounded-lg border border-slate-700 p-2 text-slate-400"><X size={15} /></button>
        </div>
      </div>

      {!readOnly && (
        <details className="no-print rounded-2xl border border-slate-800 bg-slate-900/90 p-5" open>
          <summary className="cursor-pointer text-xs font-black uppercase tracking-wider text-blue-300">Customize photos and verified player cards</summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Headline<input value={page.headline} onChange={(event) => onUpdate({ headline: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold normal-case tracking-normal text-white" /></label>
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Subheadline<input value={page.subheadline} onChange={(event) => onUpdate({ subheadline: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
            <PhotoPicker label="Game photo" value={page.gamePhotoAssetId} mediaLibrary={mediaLibrary} onSelect={(gamePhotoAssetId) => onUpdate({ gamePhotoAssetId })} onUpload={(file) => onUploadPhoto(file, { target: 'gamePhoto' })} />
            <PhotoPicker label="Player headshot" value={page.player?.headshotAssetId} mediaLibrary={mediaLibrary} onSelect={(headshotAssetId) => onUpdate({ player: { headshotAssetId } })} onUpload={(file) => onUploadPhoto(file, { target: 'playerHeadshot' })} />
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Photo caption<input value={page.gamePhotoCaption} onChange={(event) => onUpdate({ gamePhotoCaption: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white" /></label>
            <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Photo credit<input value={page.photoCredit} onChange={(event) => onUpdate({ photoCredit: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm normal-case tracking-normal text-white" placeholder="Optional" /></label>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {(page.teammates || []).map((teammate, index) => (
              <div key={teammate.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">Optional teammate {index + 1}</p>
                <div className="mt-3 grid grid-cols-[1fr_90px] gap-2"><input value={teammate.name} onChange={(event) => updateTeammate(index, { name: event.target.value })} placeholder="Player name" className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" /><input value={teammate.position} onChange={(event) => updateTeammate(index, { position: event.target.value })} placeholder="Pos." className="rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" /></div>
                <input value={teammate.statLine} onChange={(event) => updateTeammate(index, { statLine: event.target.value })} placeholder="Verified stat line" className="mt-2 w-full rounded border border-slate-800 bg-slate-900 px-2 py-2 text-xs text-white" />
                <div className="mt-2"><PhotoPicker label="Headshot" value={teammate.headshotAssetId} mediaLibrary={mediaLibrary} onSelect={(headshotAssetId) => updateTeammate(index, { headshotAssetId })} onUpload={(file) => onUploadPhoto(file, { target: 'teammateHeadshot', teammateIndex: index })} /></div>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed text-slate-500"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400" /> Teammate names and statistics are user-verified additions. DynastyHQ never invents injuries, awards, quotes, or teammate production.</p>
        </details>
      )}

      <div className="overflow-x-auto rounded-2xl bg-slate-800/70 p-3 shadow-2xl">
        <article ref={pageRef} data-postgame-front-page className="postgame-front-page mx-auto flex h-[1056px] w-[816px] flex-col overflow-hidden bg-[#f4efe2] text-[#15120d] shadow-2xl">
          <header className="border-b-[6px] border-red-700 px-8 pb-4 pt-6">
            <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-black uppercase tracking-[0.28em] text-red-700">{page.editionLabel}</p><h1 className="font-serif text-[50px] font-black leading-none tracking-tight">{page.masthead}</h1></div><div className="text-right text-[11px] font-bold uppercase"><p>Season {page.season} · Week {page.week}</p><p>{new Date(page.updatedAt || page.generatedAt).toLocaleDateString()}</p></div></div>
          </header>
          <div className="grid grid-cols-[1fr_190px] gap-5 px-8 pb-3 pt-5">
            <div><h2 className="font-serif text-[43px] font-black leading-[0.95] tracking-tight">{page.headline}</h2><p className="mt-3 border-l-4 border-red-700 pl-3 text-[16px] font-semibold leading-snug text-stone-700">{page.subheadline}</p></div>
            <div className="self-start border-y-4 border-stone-900 bg-white/50 py-3 text-center"><p className="text-[10px] font-black uppercase tracking-widest text-red-700">Final</p><div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-x-3 px-3 text-left"><strong className="truncate text-[14px]">{page.score.team}</strong><strong className="text-[27px]">{page.score.teamScore === '' ? '—' : page.score.teamScore}</strong><strong className="truncate text-[14px]">{page.score.opponent}</strong><strong className="text-[27px]">{page.score.opponentScore === '' ? '—' : page.score.opponentScore}</strong></div><p className="mt-2 text-[10px] font-black uppercase tracking-widest">Season record {page.seasonRecord}</p></div>
          </div>
          <figure className="mx-8 overflow-hidden border-y-4 border-stone-900 bg-stone-900">
            {gamePhotoUrl ? <img src={gamePhotoUrl} alt="Postgame action" className="h-[350px] w-full object-cover" /> : <div className="flex h-[350px] items-center justify-center bg-stone-800 text-sm font-black uppercase tracking-widest text-stone-400">Add a game-action photo</div>}
            <figcaption className="flex justify-between gap-4 bg-[#f4efe2] px-2 py-2 text-[9px] leading-tight text-stone-600"><span>{page.gamePhotoCaption}</span>{page.photoCredit && <span className="shrink-0">Photo: {page.photoCredit}</span>}</figcaption>
          </figure>
          <div className="grid grid-cols-[1fr_210px] gap-6 px-8 pb-7 pt-4">
            <div className="columns-2 gap-5 font-serif text-[13px] leading-[1.45]">{page.paragraphs.map((paragraph, index) => <p key={`${page.id}-paragraph-${index}`} className="mb-3 break-inside-avoid first-letter:font-black">{paragraph}</p>)}</div>
            <aside className="space-y-3">
              <div className="border-t-4 border-red-700 bg-white/55 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-red-700">Player of the game</p>
                {playerHeadshot ? <img src={playerHeadshot} alt={page.player.name} className="mt-2 h-28 w-full object-cover object-top" /> : <div className="mt-2 flex h-28 items-center justify-center bg-stone-300 text-[9px] font-black uppercase text-stone-500">Player headshot</div>}
                <p className="mt-2 text-[17px] font-black leading-tight">{page.player.name}</p><p className="text-[9px] font-black uppercase tracking-widest text-stone-600">{page.player.position}{page.player.number ? ` · #${page.player.number}` : ''}</p><p className="mt-2 text-[10px] font-black leading-snug">{page.player.statLine}</p>
              </div>
              {visibleTeammates.map((teammate) => {
                const headshot = assetUrl(mediaLibrary, teammate.headshotAssetId);
                return <div key={teammate.id} className="grid grid-cols-[58px_1fr] gap-2 border-t-2 border-stone-900 pt-2">{headshot ? <img src={headshot} alt={teammate.name || 'Teammate'} className="h-16 w-[58px] object-cover object-top" /> : <div className="flex h-16 w-[58px] items-center justify-center bg-stone-300 text-[7px] font-black uppercase text-stone-500">Headshot</div>}<div><p className="text-[11px] font-black leading-tight">{teammate.name || `Teammate ${Number(teammate.id?.at(-1)) || ''}`}</p><p className="text-[8px] font-black uppercase text-red-700">{teammate.position || 'Position'}</p><p className="mt-1 text-[8px] font-bold leading-tight">{teammate.statLine || 'Add verified stats'}</p></div></div>;
              })}
            </aside>
          </div>
          <footer className="mt-auto flex items-center justify-between border-t border-stone-400 px-8 py-3 text-[8px] font-black uppercase tracking-wider text-stone-500"><span>Fictional editorial presentation · Verified DynastyHQ facts</span><span>{page.citedFactKeys.length} ledger sources · Revision {page.revision}</span></footer>
        </article>
      </div>
    </section>
  );
};

export default PostgameFrontPage;
