const norm=(value)=>String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

const rowFacts=(category,team,subject,stats=[])=>stats.map(([label,value],index)=>({
  key:'program.coverage.'+category+'.week12-wisconsin-backfill.'+norm(team+' '+subject+' '+label).replace(/\s+/g,'-')+'-'+index,
  category,
  team,
  subject,
  label,
  value:String(value),
  confidence:1,
  evidence:'Verified from user-provided Week 12 Wisconsin postgame screenshot.',
  verified:true,
  editorialOnly:true,
  sourceType:'manual-screenshot-backfill',
}));

export const notebookLegacyScreenshotFacts=(data={})=>{
  const season=Number(data?.season);
  const week=Number(data?.game?.week);
  const opponent=norm(data?.game?.opponent);
  const school=norm(data?.player?.school);
  if(season!==4 || week!==12 || opponent!=='wisconsin' || school!=='oregon') return [];

  return [
    ...rowFacts('passing','ORE','B.Wessel',[
      ['Passer Rating',201.6],['Completions',26],['Attempts',34],['Passing yards',334],
      ['Completion %',76],['Passing TDs',5],['Interceptions',1],['AVG',9.8],['Longest completion',42],
    ]),
    ...rowFacts('passing','WISC','H.Hendrix',[
      ['Passer Rating',93.4],['Completions',20],['Attempts',38],['Passing yards',193],
      ['Completion %',52],['Passing TDs',1],['Interceptions',2],['AVG',5.0],['Longest completion',26],
    ]),

    ...rowFacts('rushing','ORE','P.McConnell',[
      ['ATT',10],['Rushing yards',34],['AVG',3.4],['Rushing TDs',1],['FUMB',0],['BTK',4],['YAC',19],['20+YDS',0],['LONG',8],
    ]),
    ...rowFacts('rushing','ORE','B.Smith',[
      ['ATT',10],['Rushing yards',125],['AVG',12.5],['Rushing TDs',2],['FUMB',0],['BTK',3],['YAC',68],['20+YDS',1],['LONG',65],
    ]),
    ...rowFacts('rushing','ORE','B.Wessel',[
      ['ATT',7],['Rushing yards',51],['AVG',7.2],['Rushing TDs',0],['FUMB',0],['BTK',0],['YAC',4],['20+YDS',0],['LONG',15],
    ]),
    ...rowFacts('rushing','ORE','J.Mentor',[
      ['ATT',6],['Rushing yards',48],['AVG',8.0],['Rushing TDs',0],['FUMB',0],['BTK',3],['YAC',9],['20+YDS',0],['LONG',15],
    ]),
    ...rowFacts('rushing','ORE','A.Kendricks',[
      ['ATT',1],['Rushing yards',10],['AVG',10.0],['Rushing TDs',0],['FUMB',0],['BTK',1],['YAC',3],['20+YDS',0],['LONG',10],
    ]),
    ...rowFacts('rushing','WISC','F.Sanford',[
      ['ATT',15],['Rushing yards',36],['AVG',2.4],['Rushing TDs',1],['FUMB',0],['BTK',2],['YAC',13],['20+YDS',0],['LONG',15],
    ]),
    ...rowFacts('rushing','WISC','H.Hendrix',[
      ['ATT',9],['Rushing yards',-5],['AVG',-0.5],['Rushing TDs',0],['FUMB',0],['BTK',0],['YAC',0],['20+YDS',0],['LONG',2],
    ]),
    ...rowFacts('rushing','WISC','W.Clapp',[
      ['ATT',1],['Rushing yards',-1],['AVG',-1.0],['Rushing TDs',0],['FUMB',0],['BTK',0],['YAC',0],['20+YDS',0],['LONG',0],
    ]),

    ...rowFacts('receiving','ORE','B.Bullocks',[
      ['Receptions',9],['Receiving yards',108],['AVG',12.0],['Receiving TDs',2],['RAC yards',64],['RAC average',7.1],['Drops',0],['Long reception',29],
    ]),
    ...rowFacts('receiving','ORE','E.Toledo',[
      ['Receptions',7],['Receiving yards',89],['AVG',12.7],['Receiving TDs',0],['RAC yards',13],['RAC average',1.8],['Drops',0],['Long reception',34],
    ]),
    ...rowFacts('receiving','ORE','M.Ortiz',[
      ['Receptions',5],['Receiving yards',81],['AVG',16.2],['Receiving TDs',2],['RAC yards',7],['RAC average',1.4],['Drops',0],['Long reception',42],
    ]),
    ...rowFacts('receiving','ORE','J.Moncrief',[
      ['Receptions',2],['Receiving yards',38],['AVG',19.0],['Receiving TDs',0],['RAC yards',3],['RAC average',1.5],['Drops',0],['Long reception',32],
    ]),
    ...rowFacts('receiving','ORE','B.Smith',[
      ['Receptions',1],['Receiving yards',11],['AVG',11.0],['Receiving TDs',0],['RAC yards',17],['RAC average',17.0],['Drops',0],['Long reception',11],
    ]),
    ...rowFacts('receiving','ORE','P.McConnell',[
      ['Receptions',1],['Receiving yards',8],['AVG',8.0],['Receiving TDs',1],['RAC yards',12],['RAC average',12.0],['Drops',0],['Long reception',8],
    ]),
    ...rowFacts('receiving','ORE','J.Mentor',[
      ['Receptions',1],['Receiving yards',-1],['AVG',-1.0],['Receiving TDs',0],['RAC yards',4],['RAC average',4.0],['Drops',0],['Long reception',0],
    ]),
    ...rowFacts('receiving','WISC','W.Clapp',[
      ['Receptions',7],['Receiving yards',84],['AVG',12.0],['Receiving TDs',1],['RAC yards',24],['RAC average',3.4],['Drops',1],['Long reception',17],
    ]),
    ...rowFacts('receiving','WISC','F.Sanford',[
      ['Receptions',6],['Receiving yards',41],['AVG',6.8],['Receiving TDs',0],['RAC yards',27],['RAC average',4.5],['Drops',1],['Long reception',12],
    ]),
    ...rowFacts('receiving','WISC','T.Duarte',[
      ['Receptions',5],['Receiving yards',57],['AVG',11.4],['Receiving TDs',0],['RAC yards',17],['RAC average',3.4],['Drops',0],['Long reception',26],
    ]),
    ...rowFacts('receiving','WISC','C.Webb',[
      ['Receptions',1],['Receiving yards',5],['AVG',5.0],['Receiving TDs',0],['RAC yards',2],['RAC average',2.0],['Drops',0],['Long reception',5],
    ]),
    ...rowFacts('receiving','WISC','E.Stocz',[
      ['Receptions',1],['Receiving yards',6],['AVG',6.0],['Receiving TDs',0],['RAC yards',2],['RAC average',2.0],['Drops',0],['Long reception',6],
    ]),
    ...rowFacts('receiving','WISC','T.Droege',[
      ['Receptions',0],['Receiving yards',0],['AVG',0.0],['Receiving TDs',0],['RAC yards',0],['RAC average',0.0],['Drops',1],['Long reception',0],
    ]),

    ...rowFacts('defense','ORE','D.Benshaw',[
      ['Solo Tackles',8],['Assisted Tackles',0],['Total Tackles',8],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','K.Hicks',[
      ['Solo Tackles',6],['Assisted Tackles',1],['Total Tackles',7],['TFL',0],['Sacks',0.0],['Interceptions',1],['Interception Return Yards',42],['Interception Return AVG',42.0],['Interception Return LONG',42],
    ]),
    ...rowFacts('defense','ORE','D.Goings',[
      ['Solo Tackles',4],['Assisted Tackles',0],['Total Tackles',4],['TFL',0],['Sacks',0.0],['Interceptions',1],['Interception Return Yards',6],['Interception Return AVG',6.0],['Interception Return LONG',6],
    ]),
    ...rowFacts('defense','ORE','B.Thomas',[
      ['Solo Tackles',4],['Assisted Tackles',0],['Total Tackles',4],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','D.Davis',[
      ['Solo Tackles',3],['Assisted Tackles',1],['Total Tackles',4],['TFL',2],['Sacks',1.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','D.Baldonado',[
      ['Solo Tackles',3],['Assisted Tackles',0],['Total Tackles',3],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','B.Avril',[
      ['Solo Tackles',3],['Assisted Tackles',1],['Total Tackles',4],['TFL',1],['Sacks',1.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','P.Buzbee',[
      ['Solo Tackles',2],['Assisted Tackles',2],['Total Tackles',4],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','D.Ferrell',[
      ['Solo Tackles',1],['Assisted Tackles',0],['Total Tackles',1],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','T.Tofi',[
      ['Solo Tackles',1],['Assisted Tackles',0],['Total Tackles',1],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','R.Bainivalu',[
      ['Solo Tackles',1],['Assisted Tackles',0],['Total Tackles',1],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','ORE','M.Matlock',[
      ['Solo Tackles',1],['Assisted Tackles',0],['Total Tackles',1],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),

    ...rowFacts('defense','WISC','M.Zimmons',[
      ['Solo Tackles',6],['Assisted Tackles',3],['Total Tackles',9],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','K.Levy',[
      ['Solo Tackles',5],['Assisted Tackles',3],['Total Tackles',8],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','D.Cordova',[
      ['Solo Tackles',4],['Assisted Tackles',3],['Total Tackles',7],['TFL',1],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','D.Madu',[
      ['Solo Tackles',4],['Assisted Tackles',5],['Total Tackles',9],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','T.Dillard',[
      ['Solo Tackles',4],['Assisted Tackles',5],['Total Tackles',9],['TFL',3],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','J.Watkins',[
      ['Solo Tackles',3],['Assisted Tackles',5],['Total Tackles',8],['TFL',1],['Sacks',0.0],['Interceptions',1],['Interception Return Yards',14],['Interception Return AVG',14.0],['Interception Return LONG',14],
    ]),
    ...rowFacts('defense','WISC','B.Cockerham',[
      ['Solo Tackles',3],['Assisted Tackles',4],['Total Tackles',7],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','G.Scales',[
      ['Solo Tackles',3],['Assisted Tackles',5],['Total Tackles',8],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','T.Duarte',[
      ['Solo Tackles',2],['Assisted Tackles',0],['Total Tackles',2],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','C.Coffee',[
      ['Solo Tackles',2],['Assisted Tackles',0],['Total Tackles',2],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','K.Legue',[
      ['Solo Tackles',1],['Assisted Tackles',0],['Total Tackles',1],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),
    ...rowFacts('defense','WISC','D.McKee',[
      ['Solo Tackles',1],['Assisted Tackles',1],['Total Tackles',2],['TFL',0],['Sacks',0.0],['Interceptions',0],['Interception Return Yards',0],['Interception Return AVG',0.0],['Interception Return LONG',0],
    ]),

    ...rowFacts('punting','WISC','J.Marvin',[
      ['Punts',8],['Punting Yards',353],['Punting Average',44.1],['Net Punting Yards',296],
      ['Net Punting Average',37.0],['Punt Blocks',0],['Punts Inside 20',1],['Touchbacks',0],['Longest Punt',55],
    ]),
  ];
};
