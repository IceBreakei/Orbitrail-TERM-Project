import { campaignEventChart, seededEventSettings, campaignEventSettings } from './event-config.js';
import { campaignEnemyRows, pickEndlessEnemy } from './campaign-config.js';
import { enemyTypeStats } from './game-config.js';

/** Stable per-slot random stream: frame rate, kills and unrelated RNG cannot change event choices. */
function eventRandom(seed, index) {
 let state=(Number(seed)^Math.imul(index+1,0x9e3779b9))>>>0;
 return ()=>{state+=0x6d2b79f5;let t=state;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}

/** Seeded event identity and bounded tuning; all regular/Mega variants cycle through the pool. */
export function generatedEvent(seed,index,internalSeconds) {
 const s=seededEventSettings,random=eventRandom(seed,index);
 const stage=internalSeconds<390?'first':internalSeconds<840?'second':internalSeconds<1080?'third':'fourth';
 const endless=pickEndlessEnemy(internalSeconds,()=>0);
 const available=endless ? [...new Set(Array.from({length:14},(_,i)=>pickEndlessEnemy(internalSeconds,()=>i/14).type))] :
  [...new Set(campaignEnemyRows.filter(r=>r.stage===stage&&r.kind==='regular'&&r.start<=internalSeconds&&internalSeconds<r.end).flatMap(r=>r.enemies))];
 const pool=available.length?available:campaignEnemyRows.filter(r=>r.stage===stage&&r.kind==='regular'&&r.start<=internalSeconds).at(-1)?.enemies||['mob'];
 const order=[...pool].sort((a,b)=>{
  const rank=name=>{let n=Number(seed)>>>0;for(const c of name)n=Math.imul(n^c.charCodeAt(0),16777619);return n>>>0;};
  return rank(a)-rank(b);
 });
 const enemy=order[index%order.length],pattern=s.patterns[Math.floor(random()*s.patterns.length)];
 const warning=['stampede','wave','fastball','ambush','airdrop','hordeRush'].includes(pattern);
 return {id:`seeded-${index}`,enemy,pattern,count:pattern==='cluster'?s.clusterCount:s.minCount+Math.floor(random()*(s.maxCount-s.minCount+1)),
  lifetimeSeconds:s.minLifetime+Math.floor(random()*(s.maxLifetime-s.minLifetime+1)),
  entrySide:Math.floor(random()*4),radius:220+Math.floor(random()*81),warningSeconds:warning?1:0,stats:'default',generated:true,timeSeconds:internalSeconds,
  ...(pattern==='hordeRush'?{repeatSeconds:2}:{}),
  nextInterval:s.minInterval+Math.floor(random()*(s.maxInterval-s.minInterval+1))};
}

/** Defaults come from the relevant campaign row, even outside that type's regular spawn window. */
export function eventEnemyProfile(event,type,internalSeconds,stage) {
 const endless=pickEndlessEnemy(internalSeconds,()=>0);
 const endlessProfile=endless && (type==='midori' ? (internalSeconds>=1800 ? pickEndlessEnemy(internalSeconds,()=>.999999)?.row : null) : endless.row);
 const matches=campaignEnemyRows.filter(row=>row.enemies.includes(type));
 const profile=matches.filter(row=>row.stage===stage&&row.start<=internalSeconds).at(-1)||
  matches.filter(row=>row.start<=internalSeconds).at(-1)||matches[0];
 const fallback=enemyTypeStats[type];
 const base=endlessProfile||profile||{hp:fallback?.baseHP||60,atk:fallback?.baseATK||1,spd:fallback?.baseSPD||.35,exp:fallback?.expValue||1,kind:'regular'};
 const stats=event.stats && typeof event.stats==='object'?event.stats:{};
 return {...base,id:event.id,enemies:[type],gate:false,freeze:false,
  hp:stats.hp??base.hp,atk:stats.atk??base.atk,spd:stats.spd??base.spd,exp:stats.exp??base.exp};
}

/** Internal time starts groups; active time controls firing cadence, lifetimes and generated events. */
export function createCampaignEvents({seed=0,getPoints,spawn,onEnd=()=>{},warn=()=>{},chart=campaignEventChart}) {
 let active=0,post17=0,nextGenerated=seededEventSettings.firstDelay,index=0;
 const groups=new Map(),prepared=new Map();
 const ended=new Set();
 const finish=group=>{if(ended.has(group.event.id))return;ended.add(group.event.id);onEnd(group.event.id);groups.delete(group.event.id);};
 function start(event,internalSeconds,stage,points=null,delay=0){
  if(ended.has(event.id)||groups.has(event.id))return;
  const actual={...event,groupId:event.id,runtimeManaged:true};
  groups.set(event.id,{event:actual,stage,started:active+delay,nextWave:0,waves:[],points,announced:false});
 }
 function runGroup(group,internalSeconds,stage,enabled){
  const e=group.event,age=active-group.started;
  if(e.lifetimeSeconds!=null&&age>=e.lifetimeSeconds){finish(group);return;}
  if(age<0){if(!group.announced){const points=group.points||getPoints(e);if(points){group.points=points;warn(e,points,group.started);group.announced=true;}}return;}
  const inWindow=e.endTimeSeconds==null||internalSeconds<=e.endTimeSeconds+1e-7;
  const stageActive=e.generated||group.stage===stage;
  if(enabled&&inWindow&&stageActive) {
   if(e.repeatSeconds){
    while(group.nextWave<=age+1e-7){group.waves.push({index:0,points:null,start:group.nextWave});group.nextWave+=e.repeatSeconds;}
   }else if(group.nextWave===0){group.waves.push({index:0,points:group.points,start:0});group.nextWave=Infinity;}
  }
  if(!inWindow||!stageActive){group.waves=[];if(e.lifetimeSeconds==null){ended.add(e.id);groups.delete(e.id);}return;}
  for(const wave of group.waves){
   if(!enabled)break;
   wave.points??=getPoints(e);
   if(!wave.points)continue;
   const due=e.spawnDuration?Math.min(e.count,1+Math.floor(Math.max(0,age-wave.start)/e.spawnDuration*e.count)):e.count;
   while(wave.index<due){
    const types=Array.isArray(e.enemy)?e.enemy:[e.enemy];
    const type=types[wave.index%types.length];
    const runtime={...e,stage:group.stage,internalSeconds,remainingLife:e.lifetimeSeconds==null?null:Math.max(0,e.lifetimeSeconds-age)};
    if(!spawn(runtime,{...wave.points[wave.index],enemyType:type}))break;
    wave.index++;
   }
  }
  group.waves=group.waves.filter(w=>w.index<e.count);
  if(!e.repeatSeconds&&!group.waves.length&&group.nextWave===Infinity&&e.lifetimeSeconds==null){ended.add(e.id);groups.delete(e.id);}
 }
 return {
  get activeSeconds(){return active;},get activeGroups(){return groups.size;},get generatedSlots(){return index;},
  update(internalSeconds,delta,{stage,enabled=true}={}){
   active+=Math.max(0,delta);
   const allow=enabled&&campaignEventSettings.enabled;
   for(const event of chart){
    if(event.stage!==stage||ended.has(event.id)||groups.has(event.id))continue;
    if(event.endTimeSeconds!=null&&internalSeconds>event.endTimeSeconds+1e-7){ended.add(event.id);continue;}
    if(internalSeconds<event.timeSeconds-(event.warningSeconds||0))continue;
    if(!allow){if(internalSeconds>=event.timeSeconds)ended.add(event.id);continue;}
    if(internalSeconds<event.timeSeconds){
     if(!prepared.has(event.id)){const points=getPoints(event);if(points){prepared.set(event.id,points);warn(event,points,active+event.timeSeconds-internalSeconds);}}
     continue;
    }
    start(event,internalSeconds,stage,prepared.get(event.id)||null);prepared.delete(event.id);
   }
   if(internalSeconds>=seededEventSettings.startSeconds&&seededEventSettings.enabled){
    post17+=Math.max(0,delta);
    while(post17>=nextGenerated){
     const event=generatedEvent(seed,index++,internalSeconds);
     nextGenerated+=event.nextInterval;
     if(allow)start(event,internalSeconds,stage,null,event.warningSeconds);
    }
   }
   for(const group of [...groups.values()])runGroup(group,internalSeconds,stage,allow);
  }
 };
}
