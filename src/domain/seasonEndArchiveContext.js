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
  const rows=seasonRows(state,currentSeason);

  // Anchor an offseason slot to the latest *completed semifinal loss*,
  // rather than to the final game-log index. Some end-of-season archives have
  // carried a copy of the semifinal into the following week; that duplicate
  // must not make the site announce a second CFP semifinal.
  const semifinalLosses=games.filter(game=>{
    const row=rows.find(entry=>number(entry.week)===number(game.week))||{};
    return endedInSemifinalLoss(game,row);
  });
  const finished=semifinalLosses.at(-1)||null;
  const lastWeek=number(finished?.week,-1);
  if(!finished||targetWeek<=lastWeek)return {isSeasonEnd:false};
  const lastRow=rows.find(row=>number(row.week)===lastWeek)||{};

  const duplicatedSemifinal=(entry={},scheduleRow={})=>{
    if(!sameOpponent(entry.opponent,finished.opponent))return false;
    const previous=gameStage(finished,lastRow);
    const candidate=gameStage(entry,scheduleRow);
    return /semi[\s-]*final/.test(previous) && /semi[\s-]*final/.test(candidate)
      && (!clean(scheduleRow?.bowlName)
        || !clean(lastRow?.bowlName)
        || clean(scheduleRow.bowlName).toLowerCase()===clean(lastRow.bowlName).toLowerCase());
  };

  // A real different game after the loss takes priority over offseason
  // classification. A same-opponent, same-round clone does not.
  const laterGames=games.filter(game=>number(game.week)>lastWeek
    && number(game.week)<=targetWeek);
  if(laterGames.some(game=>{
    const row=rows.find(entry=>number(entry.week)===number(game.week))||{};
    return !duplicatedSemifinal(game,row);
  }))return {isSeasonEnd:false};

  const target=rows.find(row=>number(row.week)===targetWeek)||null;
  if(target){
    if(target.completed===true||clean(target.status).toLowerCase()==='completed'){
      // Completed rows should only be treated as offseason when they refer to
      // an explicitly duplicated semifinal, never an actual different game.
      if(!duplicatedSemifinal(target,target))return {isSeasonEnd:false};
    }
    if(realOpponent(target.opponent) && !duplicatedSemifinal(target,target)){
      const targetStage=gameStage({},target);
      // A missing-opponent placeholder or copied setup may be a stale row;
      // an explicitly different confirmed opponent/round must stay visible.
      if(!sameOpponent(target.opponent,finished.opponent)
        || (!/semi[\s-]*final/.test(targetStage)
            && !/cotton bowl/i.test(targetStage)))
        return {isSeasonEnd:false};
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
