import { normalizeOffseasonDraft, offseasonPublicationId } from './offseasonCoverageStudio.js';

const clean = (value, max=300000) => String(value??'').trim().slice(0,max);
const TYPES = new Set(['season-review','portal-entry']);

export const offseasonDraftStorageKey = (userId, season, type) => {
  const owner=clean(userId,200);
  const year=Number(season);
  if (!owner || !Number.isInteger(year) || year<1 || !TYPES.has(type)) return '';
  return 'dynastyhq:offseason-draft:v1:'+owner+':'+year+':'+type;
};

export const isValidOffseasonDraft = (draft, season, type) => {
  if (!draft || typeof draft !== 'object' || draft.type!==type
    || Number(draft.season)!==Number(season)
    || draft.id!==offseasonPublicationId(season,type)) return false;
  const article=draft.article||{}, podcast=draft.podcast||{};
  return Boolean(clean(article.headline,240)
    && Array.isArray(article.paragraphs) && article.paragraphs.length>=4
    && clean(podcast.title,240)
    && Array.isArray(podcast.segments) && podcast.segments.length>=10
    && Array.isArray(podcast.chapters) && podcast.chapters.length>=3
    && draft.facts?.publicationId===draft.id);
};

export const loadOffseasonDraftBackup = (storage, userId, season, type) => {
  const key=offseasonDraftStorageKey(userId,season,type);
  if (!storage || !key) return null;
  try {
    const data=JSON.parse(storage.getItem(key)||'null');
    return isValidOffseasonDraft(data,season,type)?data:null;
  } catch { return null; }
};

export const saveOffseasonDraftBackup = (storage, userId, draft) => {
  const key=offseasonDraftStorageKey(userId,draft?.season,draft?.type);
  if (!key || !isValidOffseasonDraft(draft,draft.season,draft.type))
    throw new Error('The draft is incomplete and cannot be backed up yet.');
  storage.setItem(key,JSON.stringify(draft));
  return key;
};

export const clearOffseasonDraftBackup = (storage,userId,season,type) => {
  const key=offseasonDraftStorageKey(userId,season,type);
  if (key && storage) storage.removeItem(key);
};

// Supports both versions of the DynastyHQ source pack, including the original
// one that contained a raw JSON fact block. JSON research is deliberately
// ignored: we reattach the newest verified saved season facts instead.
const headings = (text) => {
  const chunks=[];
  const matcher=/^## (.+?)\s*$/gm;
  const matches=[...text.matchAll(matcher)];
  for (let i=0;i<matches.length;i++){
    const start=matches[i].index+matches[i][0].length;
    const end=i+1<matches.length?matches[i+1].index:text.length;
    chunks.push({heading:matches[i][1].trim(),body:text.slice(start,end).trim()});
  }
  return chunks;
};
const section=(chunks,prefix)=>chunks.find(x=>x.heading.toUpperCase().startsWith(prefix))?.body||'';

export const restoreOffseasonDraftFromDownload = (source, facts) => {
  const input=clean(source,1_500_000);
  if (!facts?.publicationId || !TYPES.has(facts.type))
    throw new Error('The current season facts are not ready for draft restoration.');

  if (input.startsWith('{')) {
    let backup;
    try { backup=JSON.parse(input); }
    catch { throw new Error('The draft backup file is not valid JSON.'); }
    if (!isValidOffseasonDraft(backup,facts.season,facts.type))
      throw new Error('This draft backup does not match the selected season and offseason story.');
    if (backup.facts?.publicationId!==facts.publicationId)
      throw new Error('The backup belongs to another edition.');
    return {...backup,facts}; // always use latest verified saved facts
  }

  const head=input.slice(0,1100);
  if (!/#\s+(?:THE HUDDLE|DYNASTYHQ)/i.test(head))
    throw new Error('Choose a DynastyHQ Offseason NotebookLM Producer Pack or a draft backup file.');
  const yearMatch=head.match(/\bSeason\s+(\d+)\s*[·|]/i);
  if (!yearMatch || Number(yearMatch[1])!==Number(facts.season))
    throw new Error('This source pack belongs to a different season.');
  const isPortal=/Portal Announcement|Transfer Portal Breaking News|Breaking News:\s*Transfer Portal/i.test(head);
  if (isPortal!==(facts.type==='portal-entry'))
    throw new Error('This source pack belongs to the other offseason edition. Switch tabs before restoring.');

  const chunks=headings(input);
  const chapterText=section(chunks,'OPTIONAL EPISODE CHAPTER MAP');
  const transcriptText=section(chunks,'STYLE REFERENCE — DYNASTYHQ GENERATED TRANSCRIPT');
  const articleText=section(chunks,'EDITORIAL ARTICLE — SECONDARY STYLE REFERENCE');
  if (!chapterText || !transcriptText || !articleText)
    throw new Error('The source pack is missing the full podcast and article sections needed for recovery.');

  const chapters=chapterText.split(/\r?\n/).map(line=>{
    const m=line.trim().match(/^\d+\.\s+(.+?)(?:\s+[—–]\s+(.+))?$/);
    return m?{title:clean(m[1],140),summary:clean(m[2]||'',420)}:null;
  }).filter(Boolean);
  const segments=transcriptText.split(/\r?\n/).map(line=>{
    const m=line.trim().match(/^(Mark Thompson|Sarah Chen):\s*(.+)$/);
    return m?{speaker:m[1],text:clean(m[2],1700)}:null;
  }).filter(Boolean);

  const articleLines=articleText.split(/\r?\n/).map(x=>x.trim()).filter(x=>x && !/^(?:The article below|Treat this article|This article is|The article is)/i.test(x));
  const [headline='',dek='',...paragraphs]=articleLines;
  // Exclude only the generic producer-pack heading. Historical podcast
  // titles start with "DynastyHQ Huddle:" and must NOT be rejected.
  const packTitleMatch=head.match(/^# (?!THE HUDDLE PODCAST\s*[—–-]|DYNASTYHQ\s*[—–-]\s*OFFSEASON SPECIAL)(.+)$/mi);
  const namedTitle=chunks.find(x=>/^(?:The Huddle|Season|Portal)/i.test(x.heading))?.heading;
  const podcastTitle=clean(packTitleMatch?.[1]||namedTitle||'',240);
  if (!podcastTitle || !headline || !dek || paragraphs.length<4
    || chapters.length<3 || segments.length<10){
    const gaps=[
      !podcastTitle?'podcast title':null,
      !headline?'article headline':null,
      !dek?'article summary':null,
      paragraphs.length<4?'article paragraphs ('+paragraphs.length+'/4)':null,
      chapters.length<3?'episode chapters ('+chapters.length+'/3)':null,
      segments.length<10?'podcast speaking turns ('+segments.length+'/10)':null,
    ].filter(Boolean);
    throw new Error('Could not restore: '+gaps.join(', ')+'. Nothing was replaced.');
  }
  try {
    return normalizeOffseasonDraft({
      article:{headline,dek,paragraphs},
      podcast:{title:podcastTitle,summary:dek,chapters,segments},
    },facts,'restored-from-producer-pack');
  } catch(e) {
    throw new Error('Could not validate the recovered original article and podcast: '+(e?.message||'incomplete download'));
  }
};
