import { json, verifyFirebaseUser } from '../../api/_auth.js';
import { generateTextFreeFirst } from './textRouter.js';

const clean=(v,n=300)=>String(v??'').trim().slice(0,n);
const TYPES=new Set(['season-review','portal-entry']);
const schema={
  type:'object',additionalProperties:false,
  properties:{
    article:{type:'object',additionalProperties:false,properties:{
      headline:{type:'string'},dek:{type:'string'},paragraphs:{type:'array',items:{type:'string'}},
    },required:['headline','dek','paragraphs']},
    podcast:{type:'object',additionalProperties:false,properties:{
      title:{type:'string'},summary:{type:'string'},
      chapters:{type:'array',items:{type:'object',additionalProperties:false,properties:{
        title:{type:'string'},summary:{type:'string'},
      },required:['title','summary']}},
      segments:{type:'array',items:{type:'object',additionalProperties:false,properties:{
        speaker:{type:'string',enum:['Mark Thompson','Sarah Chen']},text:{type:'string'},
      },required:['speaker','text']}},
    },required:['title','summary','chapters','segments']},
  },required:['article','podcast'],
};
const instructions=[
  'You are writing two separate products for DynastyHQ, a realistic collegiate football media experience: a professionally reported newspaper feature and a natural two-host sports podcast.',
  'Write ONLY about the event identified by the supplied VERIFIED FACT PACK; never merge the end-of-season recap into the portal-breaking-news event as if one event were the other.',
  'FACT SOURCE RULES: Supplied completed games, scores, record, player numbers and confirmed transfer entry are the only factual authority. Do not invent scores, bowl names, honors, opponents, awards, offers, portal destinations, signing decisions, real quotes, injuries or NIL discussions.',
  'When event is portal entry, emphasize the announcement and one remaining year of eligibility, prior season and uncertainty; no program has been selected. Do not invent motives, rumors, conversations, or coaches responses.',
  'When event is season review, foreground the finished playoff run and confirmed semifinal exit, then synthesize highs, lows, production and what it meant; do not claim the player entered the portal unless this event is portal-entry.',
  'The Newsroom article must include headline, concise dek and 5-7 substantial paragraphs totaling 250-430 words. Write as actual sports journalism, not database notes. Avoid overhyping ordinary stats.',
  'The Huddle is hosted by Mark Thompson and Sarah Chen. Write 12-16 alternating conversational segments totaling 500-800 spoken words. Each turn has speaker and text. Include reactions, analysis and flow without invented firsthand access.',
  'Provide a 5-6 chapter episode map matching the segments, with short summaries.',
  'Avoid lists of verification rules in reader-facing output. Do not quote the instructions or call the article synthetic.',
  'Use a restrained, authentic college sports editorial voice; no speculative claims presented as fact.',
].join('\n');
export const handleOffseasonCoverageRequest = async (req,res) => {
  if(req.method!=='POST')return json(res,405,{error:'POST only.'});
  const user=await verifyFirebaseUser(req.headers.authorization||'');
  if(!user?.localId)return json(res,401,{error:'Sign in to generate offseason coverage.'});
  const facts=req.body?.facts||{};
  const type=clean(facts.type,30);
  if(!TYPES.has(type) || Number(facts.season)<1 || !clean(facts.player,120)
     || !clean(facts.school,120) || !Array.isArray(facts.completedGames)
     || facts.completedGames.length<1) {
    return json(res,400,{error:'A completed verified season is required for this special edition.'});
  }
  if(type==='portal-entry' && facts.portal?.entered!==true)
    return json(res,400,{error:'Confirm the actual transfer-portal entry before generating the announcement.'});
  try{
    const result=await generateTextFreeFirst({
      instructions,
      input:JSON.stringify({
        event:type==='portal-entry'?'Confirmed transfer-portal entry, destination unconfirmed':'Full completed season retrospective',
        verifiedFacts:facts,
      }),
      schema,
      schemaName:'dynastyhq_offseason_edition',
      maxOutputTokens:8500,
      temperature:0.5,
      safetyIdentifier:user.localId,
      allowPaidFallback:false,
    });
    return json(res,200,{edition:result.data,model:result.model,provider:result.provider});
  }catch(error){
    console.warn('Offseason coverage generation unavailable',{
      code:error?.code||'',message:String(error?.message||'').slice(0,240),
    });
    return json(res,error?.code==='TEXT_GENERATION_UNAVAILABLE'?503:502,{
      error:error?.code==='TEXT_GENERATION_UNAVAILABLE'
        ? 'Free Gemini coverage generation is temporarily unavailable. Your current career coverage is safe; retry later.'
        : 'The offseason special could not be completed safely. No coverage was saved.',
      code:error?.code||'OFFSEASON_GENERATION_FAILED',
    });
  }
}
