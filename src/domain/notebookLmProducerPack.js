import { notebookLegacyScreenshotFacts } from './notebookLegacyScreenshotBackfill.js';

const clean=(value,fallback='')=>{
  const text=String(value ?? '').trim();
  return text || fallback;
};
const num=(value,fallback=0)=>{
  const number=Number(value);
  return Number.isFinite(number)?number:fallback;
};
const present=(value)=>value!==null && value!==undefined && value!=='';
const norm=(value)=>clean(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const bySeasonWeek=(a={},b={})=>(
  num(a.season,1)-num(b.season,1)
  || num(a.week,0)-num(b.week,0)
  || String(a.publishedAt||a.createdAt||'').localeCompare(String(b.publishedAt||b.createdAt||''))
);

const RTG_PATTERN=/\b(overall|ovr|coach trust|skill points?|energy|gpa|wear|followers?|brand|nil|depth chart|development|progression|regression|valuation|sponsorships?|fan milestone)\b/i;
const CANONICAL_KEYS=new Set([
  'game.opponent','game.result','game.homeScore','game.awayScore',
  'game.passYds','game.passTD','game.rushYds','game.rushTD','game.int',
  'game.teamTotalYards','game.opponentTotalYards','game.teamFirstDowns','game.opponentFirstDowns',
  'game.teamTurnovers','game.opponentTurnovers','game.teamRushYds','game.opponentRushYds',
  'game.teamPassYds','game.opponentPassYds','game.teamPossession','game.opponentPossession',
]);

const isRtgFact=(fact={})=>{
  const key=clean(fact.key).toLowerCase();
  return key.startsWith('rtg.')
    || key==='profile.player.overall'
    || key.startsWith('player.development')
    || RTG_PATTERN.test(clean(fact.label));
};
const isScoringFact=(fact={})=>(
  /(?:^|\.)scoring(?:\.|$)/i.test(clean(fact.key))
  || /scor|touchdown|field goal|extra point|interception return|fumble return|drive/i.test(
    clean(fact.label)+' '+clean(fact.value)+' '+clean(fact.evidence)
  )
);

const scoringEventKind=(fact={})=>{
  const textValue=clean(fact.label)+' '+clean(fact.value)+' '+clean(fact.evidence);
  if(/field goal|\bfg\b/i.test(textValue)) return 'field-goal';
  if(/interception return/i.test(textValue) && /touchdown|returned interception/i.test(textValue)) return 'interception-return-td';
  if(/fumble return/i.test(textValue) && /touchdown|returned fumble/i.test(textValue)) return 'fumble-return-td';
  if(/kick return/i.test(textValue) && /touchdown/i.test(textValue)) return 'kick-return-td';
  if(/punt return/i.test(textValue) && /touchdown/i.test(textValue)) return 'punt-return-td';
  if(/pass from|touchdown reception|receiving touchdown|td reception/i.test(textValue)) return 'receiving-td';
  if(/touchdown run|rushing touchdown|\b\d+\s*(?:yd|yard)s?\s+run\b/i.test(textValue)) return 'rushing-td';
  return '';
};

const isScoringEventFact=(fact={})=>{
  const textValue=clean(fact.label)+' '+clean(fact.value)+' '+clean(fact.evidence);
  const label=clean(fact.label);
  if(/interception return yards|receiving touchdowns|rushing touchdowns|\btouchdowns\s*:/i.test(label)) return false;
  const kind=scoringEventKind(fact);
  if(!kind) return false;
  const hasDistance=/\b\d+\s*(?:yd|yard)s?\b/i.test(textValue);
  const hasClock=/\b\d{1,2}:\d{2}\b/.test(textValue);
  const hasPlayLanguage=/pass from|touchdown reception|touchdown run|returned interception|returned fumble|field goal|\bfg\b/i.test(textValue);
  return hasDistance || hasClock || hasPlayLanguage;
};
const uniqueFacts=(facts=[])=>{
  const seen=new Set();
  return facts.filter((fact)=>{
    if(!fact) return false;
    const signature=[
      norm(fact.team),
      norm(fact.subject||fact.player),
      norm(fact.label||fact.key),
      norm(fact.value ?? fact.displayValue ?? fact.text ?? fact.evidence),
    ].join('|');
    if(!signature.replace(/\|/g,'')) return false;
    if(seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
};

const isCanonicalDuplicate=(fact={},data={})=>{
  const key=clean(fact.key);
  if(CANONICAL_KEYS.has(key)) return true;
  const label=norm(fact.label||key);
  const category=norm(fact.category||fact.sourceType);
  const subject=norm(fact.subject||fact.player);
  const player=norm(data?.player?.name);
  const game=data?.game||{};
  const team=game.team||{};
  const school=norm(data?.player?.school);
  const opponent=norm(game.opponent);
  const factValue=norm(fact.value ?? fact.displayValue ?? fact.text);
  const statLike=/\b(score|result|points|total offense|total yards|passing yards|pass yards|passing touchdowns|pass td|rushing yards|rush yards|rushing touchdowns|rush td|interceptions|first downs|turnovers|possession)\b/.test(label);
  if(!statLike) return false;
  if(player && (subject===player || (subject && (player.includes(subject)||subject.includes(player))) || label.includes(player))) return true;
  if(/team|game/.test(category)) return true;
  if(!subject && /score|result|points|total offense|first downs|turnovers|possession/.test(label)) return true;
  const canonicalEntity=!subject
    || (player && (subject===player || player.includes(subject)||subject.includes(player)))
    || (school && (subject===school || school.includes(subject)||subject.includes(school)))
    || (opponent && (subject===opponent || opponent.includes(subject)||subject.includes(opponent)));
  const values=[
    [/passing yards|pass yards/,game.pass],
    [/passing yards|pass yards/,team.passYards],
    [/passing yards|pass yards/,team.opponentPassYards],
    [/rushing yards|rush yards/,game.rush],
    [/rushing yards|rush yards/,team.rushYards],
    [/rushing yards|rush yards/,team.opponentRushYards],
    [/passing touchdowns|pass td/,game.passTD],
    [/rushing touchdowns|rush td/,game.rushTD],
    [/interceptions/,game.interceptions],
    [/total offense|total yards/,game.total],
    [/total offense|total yards/,team.totalYards],
    [/total offense|total yards/,team.opponentTotalYards],
    [/first downs/,team.firstDowns],
    [/first downs/,team.opponentFirstDowns],
    [/turnovers/,team.turnovers],
    [/turnovers/,team.opponentTurnovers],
  ];
  return Boolean(canonicalEntity && factValue && values.some(([pattern,value])=>(
    present(value) && pattern.test(label) && norm(value)===factValue
  )));
};

const validCollegeGame=(game={})=>(
  game
  && game.didPlay!==false
  && !game.evaluation
  && clean(game.stage).toLowerCase()!=='high-school'
  && clean(game.opponent)
  && num(game.week,-1)>=0
);

export const latestNotebookGameSelection=(state={})=>{
  const latest=[...(state.gameLogs||[])].filter(validCollegeGame).sort(bySeasonWeek).at(-1);
  if(!latest) return null;
  return {
    season:Math.max(1,num(latest.season,num(state.currentSeason,1))),
    week:Math.max(0,num(latest.week,0)),
    opponent:clean(latest.opponent),
  };
};

const rawScores=(game={})=>{
  if(present(game.teamScore)&&present(game.opponentScore)) return {team:num(game.teamScore),opponent:num(game.opponentScore)};
  if(present(game.scoreFor)&&present(game.scoreAgainst)) return {team:num(game.scoreFor),opponent:num(game.scoreAgainst)};
  if(!present(game.homeScore)||!present(game.awayScore)) return {team:null,opponent:null};
  return clean(game.homeAway).toLowerCase()==='away'
    ? {team:num(game.awayScore),opponent:num(game.homeScore)}
    : {team:num(game.homeScore),opponent:num(game.awayScore)};
};

const previousGameFor=(data={})=>{
  const season=num(data.season,1);
  const week=num(data?.game?.week,0);
  return [...(data?.state?.gameLogs||[])]
    .filter((game)=>validCollegeGame(game)&&num(game.season,season)===season&&num(game.week,-1)<week)
    .sort(bySeasonWeek)
    .at(-1)||null;
};
const recentGamesFor=(data={},limit=4)=>{
  const season=num(data.season,1);
  const week=num(data?.game?.week,0);
  return [...(data?.state?.gameLogs||[])]
    .filter((game)=>validCollegeGame(game)&&num(game.season,season)===season&&num(game.week,-1)<=week)
    .sort(bySeasonWeek)
    .slice(-limit);
};
const seasonRecord=(data={})=>{
  const games=recentGamesFor(data,99);
  const wins=games.filter((game)=>clean(game.result).toUpperCase()==='W').length;
  const losses=games.filter((game)=>clean(game.result).toUpperCase()==='L').length;
  return games.length?wins+'-'+losses:'';
};
const rawPlayerLine=(game={})=>[
  present(game.passYds)?game.passYds+' passing yards':'',
  present(game.passTD)?game.passTD+' passing TD'+(num(game.passTD)===1?'':'s'):'',
  present(game.rushYds)?game.rushYds+' rushing yards':'',
  present(game.rushTD)?game.rushTD+' rushing TD'+(num(game.rushTD)===1?'':'s'):'',
  present(game.int)?game.int+' interception'+(num(game.int)===1?'':'s'):'',
].filter(Boolean).join(' · ');

const factParts=(fact={},index=0)=>{
  let team=clean(fact.team);
  let subject=clean(fact.subject||fact.player);
  let label=clean(fact.label||fact.key||('Context '+(index+1)));
  const value=clean(fact.value ?? fact.displayValue ?? fact.text ?? fact.evidence ?? '');
  if((!team||!subject)&&label.includes('·')){
    const pieces=label.split('·').map((piece)=>piece.trim()).filter(Boolean);
    if(pieces.length>=3){
      if(!team) team=pieces[0];
      if(!subject) subject=pieces[1];
      label=pieces.slice(2).join(' · ');
    }else if(pieces.length===2&&!subject){
      subject=pieces[0];
      label=pieces[1];
    }
  }
  return {entity:[team,subject].filter(Boolean).join(' · '),label,value};
};

const SCREENSHOT_IDENTITY_LABELS=/^(team rank|player|school|committed college|opponent|result|final score|season|week)$/i;
const SCREENSHOT_STAT_CATEGORY_ORDER=['PASSING','RUSHING','RECEIVING','DEFENSE','KICKING','PUNTING','RETURNS','OTHER'];

const screenshotStatCategory=(parts={},fact={},qbEntities=new Set())=>{
  const label=norm(parts.label);
  const key=norm(fact.key);
  const entityKey=norm(parts.entity);
  if(/passing/.test(key)) return 'PASSING';
  if(/rushing/.test(key)) return 'RUSHING';
  if(/receiving/.test(key)) return 'RECEIVING';
  if(/defen/.test(key)) return 'DEFENSE';
  if(/completions|attempts|passing|pass yards|pass touchdowns|pass tds|passer rating|longest completion|long completion|sacked/.test(label)) return 'PASSING';
  if(/^interceptions?$/.test(label) && qbEntities.has(entityKey)) return 'PASSING';
  if(/rushing|rush yards|rush attempts|carries|yards per carry|long rush|longest rush/.test(label)) return 'RUSHING';
  if(/receptions|receiving|rac|yards after catch|drops|long reception|longest reception/.test(label)) return 'RECEIVING';
  if(/total tackles|solo tackles|assisted tackles|assists|tackles for loss|tfl|sacks|interceptions|interception return|int return|pass deflections|passes defended|deflections|forced fumbles|fumble recoveries|fumble return|defensive touchdowns|safeties|qb hurries|pressures/.test(label)) return 'DEFENSE';
  if(/field goals|field goal|fg made|fg attempts|extra points|xp made|xp attempts|kickoffs|touchbacks/.test(label)) return 'KICKING';
  if(/punts|punting|longest punt|punts inside 20|punt average/.test(label)) return 'PUNTING';
  if(/kick returns|kick return|punt returns|punt return|return yards|return average|long return/.test(label)) return 'RETURNS';
  return 'OTHER';
};

const canonicalStatLabel=(category,label)=>{
  const rawLabel=clean(label).toLowerCase().replace(/\s+/g,' ').trim();
  const normalized=norm(label);
  if(category==='PASSING'){
    if(/^(rating|rtg|passer rating)$/.test(normalized)||/passer rating/.test(normalized)) return 'Passer Rating';
    if(/^(completion\s*%|completion percentage|comp\s*%|comp pct|comp percent)$/.test(rawLabel)) return 'Completion %';
    if(normalized==='avg'||/yards attempt|passing average/.test(normalized)) return 'AVG (yards/attempt)';
    if(/^(att|attempts?)$/.test(normalized)) return 'Attempts';
    if(/^(cmp|comp|completions?)$/.test(normalized)) return 'Completions';
  }
  if(category==='RUSHING'){
    if(/^(att|attempts?|carries)$/.test(normalized)) return 'ATT (Carries)';
    if(normalized==='avg'||/yards carry|rushing average/.test(normalized)) return 'AVG (yards/carry)';
    if(normalized==='btk'||/broken tackles?/.test(normalized)) return 'BTK (Broken tackles)';
    if(normalized==='fum'||normalized==='fumb'||/^fumbles?$/.test(normalized)) return 'FUMB (Fumbles)';
    if(normalized==='yac'||/yards after carry/.test(normalized)) return 'YAC';
    if(/20\+\s*yds|20 plus/.test(normalized)) return '20+ YDS';
  }
  if(category==='RECEIVING' && (normalized==='avg'||/receiving average|yards catch/.test(normalized))) return 'AVG (yards/catch)';
  if(category==='DEFENSE'){
    if(/tackles for loss|^tfl$/.test(normalized)) return 'TFL';
    if(/^sacks?$/.test(normalized)) return 'Sacks';
    if(/^ints?$|^interceptions?$/.test(normalized)) return 'Interceptions';
  }
  return clean(label);
};

const completionPercentage=(details=[])=>{
  const existing=details.find((detail)=>/completion\s*%|completion percentage|comp\s*%|comp pct/i.test(clean(detail.label)));
  if(existing) return '';
  const byLabel=new Map(details.map((detail)=>[norm(detail.label),detail]));
  const completions=Number(byLabel.get('completions')?.value);
  const attempts=Number(byLabel.get('attempts')?.value);
  if(!Number.isFinite(completions)||!Number.isFinite(attempts)||attempts<=0) return '';
  return ((completions/attempts)*100).toFixed(1)+'%';
};

const organizedScreenshotStats=(facts=[])=>{
  const categories=new Map(SCREENSHOT_STAT_CATEGORY_ORDER.map((category)=>[category,new Map()]));
  const prepared=uniqueFacts(facts).map((fact,index)=>({fact,parts:factParts(fact,index)}));
  const qbEntities=new Set(
    prepared
      .filter(({parts})=>/completions|attempts|passer rating|passing yards|passing touchdowns|longest completion/i.test(parts.label))
      .map(({parts})=>norm(parts.entity))
      .filter(Boolean),
  );
  let statCount=0;

  prepared.forEach(({fact,parts})=>{
    if(isRtgFact(fact) || isScoringEventFact(fact)) return;
    if(CANONICAL_KEYS.has(clean(fact.key))) return;
    if(!parts.label || SCREENSHOT_IDENTITY_LABELS.test(parts.label)) return;

    const category=screenshotStatCategory(parts,fact,qbEntities);
    const entity=parts.entity || 'OTHER VERIFIED DATA';
    const groupKey=norm(entity);
    const bucket=categories.get(category);
    if(!bucket.has(groupKey)) bucket.set(groupKey,{entity,details:[]});
    const group=bucket.get(groupKey);
    const displayLabel=canonicalStatLabel(category,parts.label);
    const signature=norm(displayLabel)+'|'+norm(parts.value);
    if(group.details.some((detail)=>detail.signature===signature)) return;
    group.details.push({label:displayLabel,value:parts.value||'0',signature});
    statCount+=1;
  });

  const lines=[];
  const categoryCounts={};
  SCREENSHOT_STAT_CATEGORY_ORDER.forEach((category)=>{
    const groups=categories.get(category);
    if(!groups?.size) return;
    const categoryLines=[];
    groups.forEach(({entity,details})=>{
      const displayDetails=[...details];
      if(category==='PASSING'){
        const pct=completionPercentage(details);
        if(pct){
          const attemptIndex=displayDetails.findIndex((detail)=>norm(detail.label)==='attempts');
          displayDetails.splice(attemptIndex>=0?attemptIndex+1:displayDetails.length,0,{
            label:'Completion %',
            value:pct,
            signature:'derived-completion-percentage',
          });
        }
      }
      categoryLines.push('- '+entity+' — '+displayDetails.map((detail)=>detail.label+': '+detail.value).join(' · '));
    });
    categoryCounts[category]=categoryLines.length;
    lines.push('### '+category,...categoryLines,'');
  });

  return {lines,statCount,categoryCounts};
};

const scoringOrder=(fact={},index=0)=>{
  const text=clean(fact.label)+' '+clean(fact.value)+' '+clean(fact.evidence);
  const q=text.match(/\b([1-4])(?:st|nd|rd|th)?\s+quarter\b/i)||text.match(/\bq([1-4])\b/i);
  const time=text.match(/\b(\d{1,2}):(\d{2})\b/);
  return {
    quarter:q?num(q[1],9):9,
    clock:time?(num(time[1])*60+num(time[2])):-1,
    index,
  };
};
const scoringSignature=(fact={})=>{
  const parts=factParts(fact,0);
  const textValue=clean(fact.label)+' '+clean(fact.value)+' '+clean(fact.evidence);
  const distance=textValue.match(/\b(\d+)\s*(?:yd|yard)s?\b/i)?.[1]||'';
  return [norm(parts.entity),scoringEventKind(fact),distance].join('|');
};

const scoringRichness=(fact={})=>{
  const textValue=clean(fact.label)+' '+clean(fact.value)+' '+clean(fact.evidence);
  let score=textValue.length;
  if(/\b\d{1,2}:\d{2}\b/.test(textValue)) score+=100;
  if(/\b[1-4](?:st|nd|rd|th)\s+quarter\b|\bq[1-4]\b/i.test(textValue)) score+=80;
  if(/pass from|returned interception|returned fumble/i.test(textValue)) score+=50;
  return score;
};

const scoringLinesFor=(facts=[])=>{
  const bestBySignature=new Map();
  uniqueFacts(facts).filter(isScoringEventFact).forEach((fact)=>{
    const signature=scoringSignature(fact);
    const current=bestBySignature.get(signature);
    if(!current || scoringRichness(fact)>scoringRichness(current)) bestBySignature.set(signature,fact);
  });
  return [...bestBySignature.values()]
    .map((fact,index)=>({fact,order:scoringOrder(fact,index)}))
    .sort((a,b)=>a.order.quarter-b.order.quarter||b.order.clock-a.order.clock||a.order.index-b.order.index)
    .map(({fact},index)=>{
      const parts=factParts(fact,index);
      return '- '+(parts.entity?(parts.entity+' · '):'')+parts.label+(parts.value?(': '+parts.value):'');
    });
};

const addStory=(list,label,detail)=>{
  const text=clean(detail);
  if(!text||RTG_PATTERN.test(text)) return;
  const signature=norm(label+' '+text);
  if(list.some((entry)=>entry.signature===signature)) return;
  list.push({label,detail:text,signature});
};
const storylinesFor=(data={},episode={},previousGame=null)=>{
  const list=[];
  const game=data.game||{};
  const team=game.team||{};
  const school=clean(data?.player?.school,'Team');
  const opponent=clean(game.opponent,'Opponent');
  addStory(list,'FINAL RESULT',school+' '+game.us+' — '+game.them+' '+opponent+(clean(game.result)?' ('+clean(game.result).toUpperCase()+')':'')+'.');
  if(present(team.totalYards)&&present(team.opponentTotalYards)){
    const diff=num(team.totalYards)-num(team.opponentTotalYards);
    if(diff!==0) addStory(list,'TOTAL OFFENSE',school+' finished with '+team.totalYards+' total yards to '+opponent+"'s "+team.opponentTotalYards+', a '+Math.abs(diff)+'-yard '+(diff>0?'advantage':'deficit')+'.');
  }
  if(present(team.turnovers)&&present(team.opponentTurnovers)){
    const diff=num(team.turnovers)-num(team.opponentTurnovers);
    let tail='; the turnover count was even';
    if(diff>0) tail='; '+school+' gave it away '+diff+' more time'+(diff===1?'':'s');
    if(diff<0) tail='; '+school+' forced '+Math.abs(diff)+' more turnover'+(Math.abs(diff)===1?'':'s');
    addStory(list,'TURNOVER MARGIN',school+' committed '+team.turnovers+' turnover'+(num(team.turnovers)===1?'':'s')+' while '+opponent+' committed '+team.opponentTurnovers+tail+'.');
  }
  const playerBits=[
    present(game.pass)?game.pass+' passing yards':'',
    present(game.rush)?game.rush+' rushing yards':'',
    present(game.td)?game.td+' total TD'+(num(game.td)===1?'':'s'):'',
    present(game.interceptions)?game.interceptions+' interception'+(num(game.interceptions)===1?'':'s'):'',
  ].filter(Boolean);
  if(playerBits.length) addStory(list,'TRACKED PLAYER',clean(data?.player?.name,'Tracked player')+': '+playerBits.join(' · ')+'.');
  if(present(team.rushYards)&&present(team.opponentRushYards)){
    const diff=num(team.rushYards)-num(team.opponentRushYards);
    if(Math.abs(diff)>=40) addStory(list,'RUSHING GAME',school+' rushed for '+team.rushYards+' yards while '+opponent+' rushed for '+team.opponentRushYards+'; the difference was '+Math.abs(diff)+' yards.');
  }
  const seasonGames=recentGamesFor(data,99);
  let winStreak=0;
  for(let index=seasonGames.length-1;index>=0;index-=1){
    if(clean(seasonGames[index]?.result).toUpperCase()!=='W') break;
    winStreak+=1;
  }
  if(winStreak>=2) addStory(list,'WINNING STREAK',school+' has won '+winStreak+' straight completed games through Week '+num(game.week,0)+'.');

  const rawEpisode=episode?.episode||episode||{};
  (Array.isArray(rawEpisode.storylineThreads)?rawEpisode.storylineThreads:[]).slice(0,6).forEach((thread)=>{
    const detail=clean(thread?.summary||thread?.detail||thread?.reason||thread?.title||thread?.label);
    if(/^(role promotion|impact performance|winning streak)$/i.test(detail)) return;
    addStory(list,'CONTINUING STORYLINE',detail);
  });
  if(previousGame){
    const priorLine=rawPlayerLine(previousGame);
    if(priorLine) addStory(list,'PREVIOUS-GAME COMPARISON','Previous game: Week '+num(previousGame.week)+' vs '+clean(previousGame.opponent,'opponent')+' — '+clean(previousGame.result,'result not saved')+'; '+priorLine+'.');
  }
  return list.slice(0,8);
};

const gameParagraph=(data={})=>{
  const game=data.game||{};
  const team=game.team||{};
  const school=clean(data?.player?.school,'Team');
  const opponent=clean(game.opponent,'Opponent');
  const sentences=[school+' '+game.us+' — '+game.them+' '+opponent+(clean(game.result)?' ('+clean(game.result).toUpperCase()+')':'')+'.'];
  const player=[
    present(game.pass)?game.pass+' passing yards':'',
    present(game.passTD)?game.passTD+' passing TD'+(num(game.passTD)===1?'':'s'):'',
    present(game.rush)?game.rush+' rushing yards':'',
    present(game.rushTD)?game.rushTD+' rushing TD'+(num(game.rushTD)===1?'':'s'):'',
    present(game.interceptions)?game.interceptions+' interception'+(num(game.interceptions)===1?'':'s'):'',
  ].filter(Boolean);
  if(player.length) sentences.push(clean(data?.player?.name,'Tracked player')+' recorded '+player.join(', ')+'.');
  const comparison=[
    present(team.totalYards)&&present(team.opponentTotalYards)?'total offense '+school+' '+team.totalYards+', '+opponent+' '+team.opponentTotalYards:'',
    present(team.turnovers)&&present(team.opponentTurnovers)?'turnovers '+school+' '+team.turnovers+', '+opponent+' '+team.opponentTurnovers:'',
    present(team.rushYards)&&present(team.opponentRushYards)?'rushing yards '+school+' '+team.rushYards+', '+opponent+' '+team.opponentRushYards:'',
  ].filter(Boolean);
  if(comparison.length) sentences.push('Saved team comparison: '+comparison.join('; ')+'.');
  return sentences.join(' ');
};

const teamLines=(data={})=>{
  const game=data.game||{};
  const team=game.team||{};
  const school=clean(data?.player?.school,'Team');
  const opponent=clean(game.opponent,'Opponent');
  const row=(label,a,b)=>present(a)||present(b)?'- '+label+': '+school+' '+(present(a)?a:'—')+' · '+opponent+' '+(present(b)?b:'—'):null;
  return [
    row('Total offense',team.totalYards,team.opponentTotalYards),
    row('First downs',team.firstDowns,team.opponentFirstDowns),
    row('Turnovers',team.turnovers,team.opponentTurnovers),
    row('Rushing yards',team.rushYards,team.opponentRushYards),
    row('Passing yards',team.passYards,team.opponentPassYards),
    row('Possession',team.possession,team.opponentPossession),
  ].filter(Boolean);
};

const playerLines=(data={})=>{
  const game=data.game||{};
  const pairs=[
    ['Player',data?.player?.name],
    ['Position',data?.player?.pos],
    ['Passing yards',game.pass],
    ['Passing touchdowns',game.passTD],
    ['Rushing yards',game.rush],
    ['Rushing touchdowns',game.rushTD],
    ['Total offense',present(game.total)?game.total+' yards':null],
    ['Total touchdowns',game.td],
    ['Interceptions',game.interceptions],
  ];
  return pairs.filter(([,value])=>present(value)).map(([label,value])=>'- '+label+': '+value);
};

const previousLines=(game)=>{
  if(!game) return ['- No earlier completed game was saved in this season.'];
  const scores=rawScores(game);
  const lines=[
    '- Previous opponent: '+clean(game.opponent,'—'),
    '- Previous result: '+clean(game.result,'—')+(present(scores.team)&&present(scores.opponent)?' · '+scores.team+'-'+scores.opponent:''),
  ];
  [
    ['Passing yards',game.passYds],
    ['Passing touchdowns',game.passTD],
    ['Rushing yards',game.rushYds],
    ['Rushing touchdowns',game.rushTD],
    ['Interceptions',game.int],
  ].forEach(([label,value])=>{if(present(value)) lines.push('- '+label+': '+value);});
  return lines;
};
const recentLines=(data={})=>recentGamesFor(data,4).map((game)=>{
  const scores=rawScores(game);
  const score=present(scores.team)&&present(scores.opponent)?' · '+scores.team+'-'+scores.opponent:'';
  const stats=rawPlayerLine(game);
  return '- Week '+num(game.week)+' vs '+clean(game.opponent,'Opponent')+' · '+clean(game.result,'—')+score+(stats?' · '+stats:'');
});
const chapterLines=(episode={})=>{
  const chapters=Array.isArray(episode.chapters)?episode.chapters:[];
  return chapters.length?chapters.map((chapter,index)=>{
    const summary=clean(chapter?.summary);
    return (index+1)+'. '+clean(chapter?.title,'Chapter '+(index+1))+(summary?' — '+summary:'');
  }):['No saved chapter list.'];
};

const customizePromptFor=(data={},storylines=[])=>{
  const game=data.game||{};
  const school=clean(data?.player?.school,'the current team');
  const focus=storylines.slice(0,4).map((entry)=>entry.label.toLowerCase()).join(', ');
  return [
    'Create a concise Brief Deep Dive episode of The Huddle Podcast, targeting roughly 4–5 minutes, about '+school+"'s Season "+num(data.season,1)+', Week '+num(game.week,0)+' game against '+clean(game.opponent,'the opponent')+'.',
    'Always begin with a natural show introduction that identifies the podcast and both hosts, such as: "Welcome to another episode of The Huddle Podcast. We are your hosts, Mark Thompson and Sarah Chen." Then transition immediately into the current game.',
    'Prioritize the Producer Brief and Key Storylines, then use the complete verified stat tables as supporting evidence.',
    'Mark Thompson and Sarah Chen should sound like knowledgeable local college-football hosts who cover this program every week: conversational, analytical, willing to react to each other, and never like they are reading a box score.',
    focus?'Spend most of the limited runtime explaining the football meaning behind: '+focus+'.':'Spend most of the limited runtime explaining the biggest verified football takeaways from the game.',
    'Use exact statistics selectively when they strengthen a point. Quarterback completion percentage and passer rating are especially useful when available. Connect prior games only when the comparison adds real context.',
    'Do not discuss Road to Glory game mechanics, ratings, coach trust, skill points, GPA, wear, followers, NIL systems, or progression menus.',
    'Do not invent injuries, quotes, locker-room reactions, coaching decisions, play calls, strategy, motives, emotions, or facts that are not in the source pack.',
    'Treat the DynastyHQ generated transcript as style reference only; verified research sections outrank it whenever the transcript adds interpretation that is not explicitly supported.',
    'Use full player names when supplied; never guess a missing first name.',
  ].join(' ');
};

export const buildNotebookLmProducerPack=({data={},episode={},facts=[]}={})=>{
  const game=data.game||{};
  const rawEpisode=episode?.episode||episode||{};
  const transcript=clean(episode.transcript||rawEpisode.transcript);
  const screenshotBackfillFacts=notebookLegacyScreenshotFacts(data);
  const usable=uniqueFacts([...(facts||[]),...screenshotBackfillFacts].filter((fact)=>!isRtgFact(fact)));
  const scoringFacts=uniqueFacts(usable.filter((fact)=>isScoringFact(fact)&&!isCanonicalDuplicate(fact,data)));
  const scoringLines=scoringLinesFor(scoringFacts);
  const screenshotStats=organizedScreenshotStats(usable);
  const previousGame=previousGameFor(data);
  const storylines=storylinesFor(data,episode,previousGame);
  const recent=recentLines(data);
  const school=clean(data?.player?.school,'Team');
  const opponent=clean(game.opponent,'Opponent');
  const title=clean(episode.title||rawEpisode.title,school+' Week '+num(game.week,0)+': the game and what it means');
  const verifiedBrief=gameParagraph(data);
  const prompt=customizePromptFor(data,storylines);
  const raw=game.raw||{};
  const detail=[
    'Program: '+school,
    'Season: '+num(data.season,1),
    'Week: '+num(game.week,0),
    'Opponent: '+opponent,
    'Result: '+clean(game.result,'—'),
    'Final score: '+school+' '+game.us+', '+opponent+' '+game.them,
    seasonRecord(data)?'Season record after this game: '+seasonRecord(data):null,
    present(raw.conferenceGame)?'Conference game: '+String(Boolean(raw.conferenceGame)):null,
    present(raw.homeAway)?'Home / away: '+raw.homeAway:null,
    present(raw.teamRank)?school+' rank: '+raw.teamRank:null,
    present(raw.opponentRank)?opponent+' rank: '+raw.opponentRank:null,
  ].filter(Boolean);

  const text=[
    '# THE HUDDLE PODCAST — NOTEBOOKLM PRODUCER PACK 2.0',
    '',
    '## CURRENT EPISODE IDENTITY',
    'Program: '+school,
    'Season: '+num(data.season,1),
    'Week: '+num(game.week,0),
    'Opponent: '+opponent,
    'Result: '+clean(game.result,'—'),
    'Final score: '+school+' '+game.us+', '+opponent+' '+game.them,
    'Working title: '+title,
    '',
    '## PRODUCER BRIEF — READ THIS FIRST',
    'Build the episode from the CURRENT completed game first. Older games are context only and must never replace the newest game as the lead story.',
    'The show is The Huddle Podcast, hosted by Mark Thompson and Sarah Chen.',
    'OPENING REQUIREMENT: Always begin with a natural show introduction that identifies the show and both hosts, such as "Welcome to another episode of The Huddle Podcast. We are your hosts, Mark Thompson and Sarah Chen." A small wording variation is fine, but the show name and both host names should be stated before the game discussion begins.',
    'Target a concise 4–5 minute Brief Deep Dive. Get to the current game quickly and spend the limited runtime on the strongest verified football angles.',
    'Sound like two knowledgeable local college-football hosts who follow this program every week. They should react to each other, ask natural follow-up questions, occasionally disagree, and move between football ideas instead of taking turns reading data.',
    'Use statistics as evidence for football conclusions. Do not recite complete stat tables unless a number is genuinely important to the discussion.',
    'Explain what changed, what mattered, which players influenced the game, how the scoring unfolded, and how this result fits the verified season context.',
    'Use full player names when they are supplied in the packet. If only an initial is supplied, do not invent a first name.',
    'Treat every item below as source material only. Never invent facts, injuries, quotes, emotions, strategy, private conversations, or coaching decisions that are not supplied.',
    'Do not discuss Road to Glory game mechanics such as overall rating, coach trust, skill points, energy, GPA, wear, followers, NIL systems, or progression/regression menus.',
    '',
    '## EPISODE FOCUS',
    'Working title: '+title,
    'Editorial brief: '+verifiedBrief,
    '',
    '## KEY STORYLINES',
    ...(storylines.length?storylines.map((entry,index)=>(index+1)+'. '+entry.label+' — '+entry.detail):['1. Use the verified result, player production, team comparison and scoring timeline below to identify the strongest football angles.']),
    '',
    '## CURRENT GAME — VERIFIED SNAPSHOT',
    gameParagraph(data),
    '',
    ...detail,
    '',
    '## TRACKED PLAYER — COMPLETE CORE STAT LINE',
    ...playerLines(data),
    '',
    '## TEAM STATISTICAL COMPARISON',
    ...(teamLines(data).length?teamLines(data):['No separate team-stat comparison was saved for this week.']),
    '',
    '## SCORING TIMELINE / DRIVE DETAILS',
    ...(scoringLines.length?scoringLines:['No separate verified scoring-summary facts were saved for this week.']),
    '',
    '## COMPLETE VERIFIED SCREENSHOT STAT TABLES',
    'Every verified individual statistic published from the uploaded game screenshots is preserved below, including visible zero values. These sections are organized as research, not as a required read-aloud script. The game’s displayed completion percentage is preserved when available and is calculated from verified completions and attempts only as a fallback; passer rating is preserved exactly when it was uploaded.',
    '',
    ...(screenshotStats.lines.length?screenshotStats.lines:['No additional published screenshot statistics were saved for this week.']),
    '',
    '## PREVIOUS-GAME COMPARISON',
    ...previousLines(previousGame),
    '',
    '## RECENT SEASON CONTEXT',
    ...(recent.length?recent:['No recent completed-game sequence was available.']),
    '',
    '## EPISODE CHAPTERS',
    ...chapterLines(episode),
    '',
    '## DYNASTYHQ GENERATED TRANSCRIPT — COMPLETE',
    'Use this transcript only as an additional STYLE and conversational reference. It is generated editorial copy, not a verified fact source. If it adds claims about confidence, preparation, coaching trust, reads, pressure, emotions, locker-room atmosphere, short fields, strategy or motives that are not explicitly supported in the verified sections above, ignore those claims. NotebookLM does not need to repeat the transcript verbatim.',
    '',
    transcript||'No generated transcript is saved for this selected week.',
    '',
    '## NOTEBOOKLM AUDIO OVERVIEW GUARDRAILS',
    '- Lead with the current game and the Key Storylines.',
    '- Use supporting stats selectively to explain football meaning; do not turn the episode into a box-score recital.',
    '- Use previous games only for verified comparison or continuity.',
    '- Keep team and game context as the frame; the tracked player can be central when his verified production makes him central to the football story.',
    '- Do not invent missing player names, quotes, injuries, strategy, motives, or off-field information.',
    '- Road to Glory mechanics and progression-menu facts are intentionally excluded.',
    '- Every published screenshot statistic is available in the organized stat tables; use only the ones that help the conversation.',
    '- For quarterbacks, completion percentage is derived only from verified completions and attempts, and passer rating is used only when it was actually uploaded.',
    '- The episode should open by identifying The Huddle Podcast and both hosts before moving into the game.',
    '',
    'END PRODUCER PACK',
  ].join('\n');

  const safeOpponent=opponent.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'')||'Opponent';
  return {
    text,
    customizePrompt:prompt,
    meta:{
      season:num(data.season,1),
      week:num(game.week,0),
      opponent,
      title,
      storylineCount:storylines.length,
      scoringCount:scoringLines.length,
      supportingFactCount:screenshotStats.statCount,
      groupedSupportingLineCount:screenshotStats.lines.filter((line)=>line.startsWith('- ')).length,
      screenshotStatCount:screenshotStats.statCount,
      screenshotStatCategories:screenshotStats.categoryCounts,
      recentGameCount:recent.length,
      hasTranscript:Boolean(transcript),
      screenshotBackfillCount:screenshotBackfillFacts.length,
      suggestedFileName:'DynastyHQ-S'+num(data.season,1)+'-W'+num(game.week,0)+'-'+safeOpponent+'-NotebookLM-Producer-Pack.txt',
    },
  };
};
