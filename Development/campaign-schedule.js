import { playerSettings, eliteSizeMultiplier, normalSpriteSize } from './game-config.js';
import { campaignSettings, campaignEnemyRows } from './campaign-config.js';

/** Own the internal chart clock; survival time and gameplay continue during clock freezes. */
export function createCampaignSchedule() {
 let stage='first',seconds=campaignSettings.stageStarts.first;
 let spawned=new Set(),defeated=new Set();
 const rows=()=>campaignEnemyRows.filter(row=>row.stage===stage);
 const required=()=>rows().filter(row=>row.kind==='boss'||row.gate);
 const cleared=()=>required().length>0 && required().every(row=>defeated.has(row.id));
 const fighting=()=>rows().some(row=>(row.kind==='boss'||row.gate)&&spawned.has(row.id)&&!defeated.has(row.id));
 const frozen=()=>rows().some(row=>row.freeze&&seconds>=row.start)&&!cleared();
 return {
  get seconds(){return seconds;},get stage(){return stage;},get frozen(){return frozen();},
  get fightingBoss(){return fighting();},get cleared(){return cleared();},
  get readyToAdvance(){return cleared()&&(stage!=='second'||seconds>=campaignSettings.stageStarts.third);},
  setStage(id){if(id===stage)return;stage=id;seconds=campaignSettings.stageStarts[id]??0;spawned=new Set();defeated=new Set();},
  update(delta,spawnEncounter){
   if(!frozen()) {
    const next=seconds+Math.max(0,delta);
    const gate=rows().filter(row=>row.freeze&&!defeated.has(row.id)&&row.start>=seconds).sort((a,b)=>a.start-b.start)[0];
    seconds=gate?Math.min(next,gate.start):next;
   }
   for(const row of rows()) if(row.kind!=='regular'&&seconds>=row.start&&!spawned.has(row.id)) {
    if(spawnEncounter(row))spawned.add(row.id);
   }
  },
  profileFor(type){return rows().filter(row=>row.enemies.includes(type)&&row.start<=seconds).at(-1) || rows().find(row=>row.enemies.includes(type)) || null;},
  recordDefeat(enemy){if(enemy.campaignRowId)defeated.add(enemy.campaignRowId);},
  /** Ordinary selection keeps running while the internal chart clock is frozen. */
  pickSpawn(random=Math.random){
   let pool=rows().filter(row=>row.kind==='regular'&&seconds>=row.start&&seconds<row.end);
   if(stage==='fourth'&&seconds>=campaignSettings.endlessRandomFrom) {
    const latest=new Map();
    for(const row of campaignEnemyRows.filter(r=>r.kind==='regular')) for(const type of row.enemies)latest.set(type,{...row,enemies:[type]});
    pool=[...latest.values()];
   }
   if(!pool.length) pool=rows().filter(row=>row.kind==='regular'&&seconds>=row.start).slice(-1);
   if(!pool.length)return null;
   let row=pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
   const type=row.enemies[Math.min(row.enemies.length-1,Math.floor(random()*row.enemies.length))];
   let enemy=type,mega=Boolean(row.mega);
   if(fighting()&&random()<campaignSettings.megaChanceDuringBoss){
    const dedicated=rows().find(r=>r.kind==='mini'&&r.baseEnemy===type);
    if(dedicated){row=dedicated;enemy=dedicated.enemies[0];}else mega=true;
   }
   return {row,type:enemy,mega,scheduled:false};
  }
 };
}


/** Exact chart stats override legacy stage/type multipliers; only random Mega rolls add bonuses. */
export function campaignEnemyOverrides(entry, template, baseMovementSpeed = playerSettings.movementBase) {
 const row=entry.row;
 const boosted=Boolean(entry.mega && !row.mega);
 return {label:boosted?`Mega ${template.label || 'Enemy'}`:template.label, hp:row.hp*(boosted?10:1),maxHp:row.hp*(boosted?10:1),
  contactDamage:row.atk*(boosted?2:1),contactDamageMultiplier:1,
  movementSpeedMultiplier:row.spd*playerSettings.speed/baseMovementSpeed,
  expReward:row.exp,perTypeStats:true,
  miniBoss:row.kind==='mini'||Boolean(row.mega)||boosted,boss:row.kind==='boss',
  elite:row.kind==='mini'||Boolean(row.mega)||boosted,
  spriteSize:(template.spriteSize||normalSpriteSize)*((boosted||row.endless&&row.mega)&&!template.miniBoss?(template.megaSizeMultiplier ?? eliteSizeMultiplier):1),
  campaignRowId:entry.scheduled?row.id:null,campaignGuardian:Boolean(row.gate),campaignOverride:true};
}
