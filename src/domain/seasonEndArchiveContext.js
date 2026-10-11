// View-only season-end classification. The NCAA postseason ends for the
// tracked team after a verified CFP semifinal loss. A following calendar week
// is NOT another Cotton Bowl simply because the old setup/label persists.
export const SEASON_END_WEEK_LABEL = 'SEASON COMPLETE · OFFSEASON';
const clean=(value)=>String(value??'').trim();
const number=(value,fallback=-1)=>value===null||value===undefined||value===''?fallback:(Number.isFinite(Number(value))?Number(value):fallback);
const realOpponent=(value)=>Boolean(clean(value))&&!/^(?:bye(?: week)?|tbd|tba|unknown|no game|next opponent)$/i.test(clean(value));
const seasonRows=(state,season)=>{
  const item=(state.seasonSchedules||[]).find(x=>number(x?.season,1)===season)||{};
  const rows=item.entries||item.games||item.schedule||[];
  return Array.isArray(rows)?rows:[];
};
const gameStage=(game={},row={})=>[
  game.postseason?.stage,game.postseason?.displayLabel,
  game.weekLabel,game.weekPhase,game.label,
  row.postseasonRound,row.label,row.bowlName,
].map(clean).join(' ').toLowerCase();
const endedInSemifinalLoss=(game,row)=>{
  const result=clean(game?.result).toUpperCase();
  const lost=result==='L'
    || (number(game?.teamScore,NaN)<number(game?.opponentScore,NaN));
  return lost && /semi[s-]*final/.test(gameStage(game,row));
};
const sameOpponent=(a,b)=>clean(a).replace(/[^a-z0-9]/gi,'').toLowerCase()
  ===clean(b).replace(/[^a-z0-9]/gi,'').toLowerCase();

export const seasonEndArchiveContext=(state={},season,week)=>{
  const currentSeason=number(season,number(state.currentSeason,1));
  const targetWeek=number(week,-1);
  const games=(state.gameLogs||[]).filter(game=>
    game&&game.didPlay!==false&&!game.evaluation&&game.stage!=='high-school'
    &&number(game.season,currentSeason)===currentSeason
    &&realOpponent(game.opponent)&&number(game.week)>=0
  ).sort((a,b)=>number(a.week)-number(b.week));
  const finished=games.at(-1);
  const rows=seasonRows(state,currentSeason);
  const lastWeek=number(finished?.week,-1);
  if(!finished||targetWeek<=lastWeek||games.some(game=>number(game.week)===targetWeek))
    return {isSeasonEnd:false};
  const lastRow=rows.find(row=>number(row.week)===lastWeek)||{};
  if(!endedInSemifinalLoss(finished,lastRow))return {isSeasonEnd:false};
  const target=rows.find(row=>number(row.week)===targetWeek)||null;
  if(target){
    // Never hide a different, explicitly confirmed future opponent. A repeated
    // unplayed row for the *same* semifinal is stale calendar context.
    if(target.completed===true||clean(target.status).toLowerCase()==='completed')
      return {isSeasonEnd:false};
    if(realOpponent(target.opponent)){
      const priorStage=gameStage(finished,lastRow);
      const newStage=gameStage({},target);
      if(!sameOpponent(target.opponent,finished.opponent)
        || (!/semi[s-]*final/.test(newStage) && !/cotton bowl/.test(newStage)
            && clean(target.postseasonRound)!==clean(lastRow.postseasonRound)))
        return {isSeasonEnd:false};
      if(!/semi[s-]*final/.test(priorStage)) return {isSeasonEnd:false};
    }
  }
  return {
    isSeasonEnd:true,
    season:currentSeason,week:targetWeek,
    label:SEASON_END_WEEK_LABEL,
    lastGameWeek:lastWeek,
    lastOpponent:clean(finished.opponent),
    lastStage:clean(finished.postseason?.displayLabel||finished.weekLabel||lastRow.postseasonRound),
  };
};
