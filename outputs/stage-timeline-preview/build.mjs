import fs from 'node:fs/promises';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const root=new URL('../../',import.meta.url);
const c=vm.createContext({});
for(const name of ['game-config','campaign-config','event-config','seeded-events']) {
 const code=await fs.readFile(new URL(`Development/${name}.js`,root),'utf8');
 vm.runInContext(code.replace(/^import .*;\r?\n/gm,'').replace(/^export \{.*\} from .*;\r?\n/gm,'').replaceAll('export ',''),c);
}
const data=vm.runInContext('({rows:campaignEnemyRows,events:campaignEventChart,endless:endlessEnemySettings,generated:seededEventSettings})',c);
const names={mob:'Mob1',mob2:'Mob2',mob3:'Mob3',megaMob:'Mega Mob',megaMob3:'Mega Mob3',pedrozilla:'Pedrozilla',whiteSweeper:'Sweeper',heavySweeper:'Heavy Sweeper',opsSweeper:'OPS Sweeper',megaSweeper:'Mega Sweeper',megaHeavySweeper:'Mega Heavy Sweeper',megaOpsSweeper:'Mega OPS Sweeper',shiroko:'Shiroko',arisu:'Arisu',iroha:'Iroha',neru:'Neru',megaPedrozilla:'Mega Pedrozilla',midori:'Midori'};
const label=id=>names[id]||id.replace(/(arius|highlander)(\d)/,(_,t,n)=>`${t==='arius'?'Arius':'Highlander'} Student${n}`).replace(/megaArius(\d)/,'Mega Arius Student$1');
const stage=id=>({first:'Stage 1',second:'Stage 2',third:'Stage 3',fourth:'Stage 4'})[id]||id;
const time=s=>Number.isFinite(s)?`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}`:'';
const records=[];
for(const r of data.rows) {
 let notes=r.freeze?'Freezes internal clock until required encounters are defeated. ':'';
 if(r.id==='s1-shiroko')notes+='Normal chase. Defeat advances to Stage 2 after 1.5s.';
 if(r.id==='s2-arisu')notes+='4s windup; aim locks at 3s; 1375px/s dash; 20 damage; 1.5s braking. Arisu and OPS checkpoint both required.';
 if(r.id==='s2-mega-ops')notes+='After Arisu and this encounter die, clock resumes through 14:00 before Stage 3.';
 if(r.stage==='first'&&r.end>360&&Number.isFinite(r.end))notes+=' Stage 1 clock freezes at 06:00; listed window end is not reached.';
 records.push({sort:r.start,values:[stage(r.stage),time(r.start),time(r.end),r.kind==='regular'?'Regular spawn window':r.kind==='mini'?'Mini-boss':'Boss',r.enemies.map(label).join(', '),r.kind==='regular'?'Chase':'Encounter',r.kind==='regular'?'Stream':1,'','',r.hp,r.atk,r.spd,r.exp,notes.trim()]});
}
for(const e of data.events) {
 const types=Array.isArray(e.enemy)?e.enemy:[e.enemy];
 for(const type of types){c.inputEvent=e;c.inputType=type;const p=vm.runInContext('eventEnemyProfile(inputEvent,inputType,inputEvent.timeSeconds,inputEvent.stage)',c);
 let notes='Starts offscreen.';
 if(e.repeatForLifetime)notes+=' All rings expire together at event lifetime end.';
 if(e.spawnDuration)notes+=` Formation released over ${e.spawnDuration}s.`;
 if(e.timeSeconds===810)notes+=' Runs only after Stage 2 boss checkpoint unfreezes the internal clock.';
 records.push({sort:e.timeSeconds,values:[stage(e.stage),time(e.timeSeconds),time(e.endTimeSeconds), 'Timed event',label(type),e.pattern,e.count,e.repeatSeconds||'',e.lifetimeSeconds??'',p.hp,p.atk,p.spd,p.exp,notes]});}
}
for(const type of data.endless.enemies)records.push({sort:1380,values:['Endless',time(1380),'','Endless pool',label(type),'Mega variant','Stream','','',5000,15,1,25,'Base values; later time scaling applies. Endless progression requires Stage 4 clear.']});
records.push({sort:1800,values:['Endless','30:00','','Endless pool','Midori','Chase','Stream','','',9000,5,1.5,25,'Joins endless enemy pool at internal 30:00.']});
records.push({sort:1020,values:['Stages 3–4 / Endless','17:00','','Generated events','Eligible current enemy pool',data.generated.patterns.join(', '),'12–60 (cluster: 20)','35–55','14–24','','','','','Seeded generation begins after 25 active seconds past 17:00. Interval uses active gameplay time, not a fixed chart timestamp.']});
records.sort((a,b)=>a.sort-b.sort||a.values[0].localeCompare(b.values[0]));
const headers=['Stage','Start (internal mm:ss)','End (internal mm:ss)','Type','Enemy','Pattern','Amount','Repeat (seconds)','Lifetime (seconds)','HP','ATK','SPD (base-player ratio)','EXP','Notes'];
const matrix=[headers,...records.map(r=>r.values)];
const wb=Workbook.create(),sheet=wb.worksheets.add('Game timeline');
sheet.getRange(`A1:N${matrix.length}`).values=matrix;
sheet.getRange(`A1:N${matrix.length}`).format.font={name:'Calibri',size:11};
sheet.getRange('A1:N1').format.fill='#DCEAF4';
sheet.getRange('A1:N1').format.font={bold:true};
sheet.getRange('A1:N1').format.rowHeight=34;
sheet.getRange(`A2:N${matrix.length}`).format.rowHeight=46;
sheet.getRange(`A1:N${matrix.length}`).format.wrapText=true;
for(let i=0;i<records.length;i++)if(records[i].values[3]==='Generated events')sheet.getRange(`A${i+2}:N${i+2}`).format.rowHeight=150;
const widths=[120,135,135,155,225,150,125,105,110,85,65,125,85,520];
for(let i=0;i<widths.length;i++)sheet.getRange(`${String.fromCharCode(65+i)}1:${String.fromCharCode(65+i)}${matrix.length}`).format.columnWidth=widths[i]/7;
sheet.getRange(`N2:N${matrix.length}`).format.font={size:10};
sheet.freezePanes.freezeRows(1);
sheet.freezePanes.freezeColumns(2);
sheet.showGridLines=true;
wb.recalculate();
console.log(JSON.stringify({campaignRows:data.rows.length,eventRows:data.events.length,outputRows:records.length,stage2Boss:matrix.find(r=>r[4]==='Arisu')}));
const preview=await wb.render({sheetName:'Game timeline',range:'A1:N13',scale:1,format:'png'});
await fs.writeFile(new URL('preview.png',import.meta.url),new Uint8Array(await preview.arrayBuffer()));
const output=await SpreadsheetFile.exportXlsx(wb);await output.save(fileURLToPath(new URL('Game_Timeline.xlsx',import.meta.url)));
