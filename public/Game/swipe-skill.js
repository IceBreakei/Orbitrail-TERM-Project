import { swipeSkillSettings, swipeSkillLevelStats, createSwipeSkill } from './game-config.js';
import { rollAttackDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, onEnemyDamage, damageEnemy } from './world-state.js';
import { getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';

/** Smallest FLAT grade is the baseline; future effects can explicitly supply bonuses. */
export function swipeFlatBonuses(player){return {grade:Math.max(1,Math.min(5,Math.round((player.sizeStat??.2)*5))),
 size:Math.max(.1,1+(Number(player.flatSizeBonusPercent)||0)/100),damage:Math.max(0,1+(Number(player.flatDamageBonusPercent)||0)/100)};}
/** Enclose the full rotated pyroxene cluster, including the offset outer blocks. */
export function swipeProjectileRadius(blocks,size=1){
 const offset=(blocks-1)/2;
 return (Math.hypot(swipeSkillSettings.baseWidth/2,swipeSkillSettings.baseHeight/2)+Math.hypot(offset*swipeSkillSettings.baseWidth*.65,offset*swipeSkillSettings.baseHeight*.18))*size;
}
export function createSwipeSkillEffect({random=Math.random}={}){
 let projectiles=[],time=0;const owners=new Set();let image=null;
 const ready=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{image=new Image();image.onload=resolve;image.onerror=()=>{image=null;resolve();};image.src=new URL('../sprites/skills/pyroxene.png',import.meta.url).href;});
 function clearBuff(owner){if(owner.combatBuffs)delete owner.combatBuffs.swipe;}
 function reset(){projectiles=[];for(const owner of owners)clearBuff(owner);owners.clear();time=0;}
 function spawn(event){
  const owner=event.source,skill=owner?.label==='Plana'?owner.characterSkills?.find(s=>s?.id==='swipe'):null;
  if(!skill||owner.hp<=0||event.triggersSkills===false||!(event.isCritical??['critical','orangecritical','supercritical'].includes(event.hitType)))return false;
  const stats=swipeSkillLevelStats(skill.level);if(random()>=stats.chance)return false;
  const target=getEnemyHurtbox(event.enemy),flat=swipeFlatBonuses(owner),blocks=1+Math.min(stats.maxBlocks-1,Math.floor(random()*stats.maxBlocks));
  const angles=Array.from({length:blocks},()=>random()*Math.PI*2);
  projectiles.push({owner,x:target.x,y:target.y-swipeSkillSettings.fallHeight,vx:0,vy:swipeSkillSettings.fallSpeed,age:0,phase:0,phaseHits:0,totalHits:0,
   damage:stats.damage*flat.damage,size:flat.size,blocks,angles,rotation:random()*Math.PI*2,spin:(random()-.5)*2,radius:swipeProjectileRadius(blocks,flat.size),hits:new Map()});
  owners.add(owner);owner.combatBuffs??={};const icon=createSwipeSkill();owner.combatBuffs.swipe={name:'Swipe!',icon:icon.icon,iconCrop:icon.iconCrop};return true;
 }
 const stop=onEnemyDamage(spawn);
 function ricochet(b){b.phase++;b.phaseHits=0;const angle=-Math.PI*(.15+random()*.7);b.vx=Math.cos(angle)*swipeSkillSettings.ricochetSpeed;b.vy=Math.sin(angle)*swipeSkillSettings.ricochetSpeed;}
 function update(delta,player){
  if(!(delta>0))return;
  let left=delta,index=null;
  while(left>1e-8){
   const dt=Math.min(left,1/120);left-=dt;time+=dt;
   if(!projectiles.length)continue;
   if(!index)index=createEnemySpatialIndex(getAllEnemies(),enemy=>{
    const body=getEnemyHurtbox(enemy);if(enemy.flattenedRemaining>0)return body;
    // Conservatively include the flattened pose if another projectile changes it this frame.
    const flat=getEnemyHurtbox({...enemy,flattenedRemaining:1}),left=Math.min(body.x-body.rx,flat.x-flat.rx),right=Math.max(body.x+body.rx,flat.x+flat.rx),top=Math.min(body.y-body.ry,flat.y-flat.ry),bottom=Math.max(body.y+body.ry,flat.y+flat.ry);
    return {x:(left+right)/2,y:(top+bottom)/2,rx:(right-left)/2,ry:(bottom-top)/2};
   });
   // Spawned descendants begin next substep: no synchronous recursion or lost child shots.
   for(const b of projectiles.slice()){
    if(b.dead)continue;
    if(b.owner!==player||b.owner.hp<=0||!b.owner.characterSkills?.some(s=>s?.id==='swipe')){b.dead=true;continue;}
    const from={x:b.x,y:b.y};b.age+=dt;b.rotation+=b.spin*dt;b.vy+=swipeSkillSettings.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.age>swipeSkillSettings.duration+1e-8){b.dead=true;continue;}
    const candidates=index.querySegment(from,b,b.radius).filter(enemy=>{
     if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<swipeSkillSettings.hitCooldown-1e-8)return false;
     const body=getEnemyHurtbox(enemy);return segmentHitsBody({...body,rx:body.rx+b.radius,ry:body.ry+b.radius},from.x,from.y,b.x,b.y);
    });
    candidates.sort((a,c)=>{const x=getEnemyHurtbox(a),y=getEnemyHurtbox(c);return Math.hypot(x.x-from.x,x.y-from.y)-Math.hypot(y.x-from.x,y.y-from.y);});
    for(const enemy of candidates){
     if(!getEnemy(enemy.id))continue;b.hits.set(enemy.id,time);
     const hit=rollAttackDamage(b.owner,b.damage,random,{target:enemy,weaponId:'swipe',skillAttack:true});
     const landed=damageEnemy(enemy.id,hit.damage,b.owner,hit.type,{canMiss:true,weaponId:'swipe'});if(landed===false)continue;
     b.phaseHits++;b.totalHits++;
     const living=getEnemy(enemy.id);if(living&&random()<swipeSkillSettings.flattenChance)living.flattenedRemaining=swipeSkillSettings.flattenSeconds;
     if(b.phaseHits>=(b.phase===0?7:3)){
      if(b.phase>=2)b.dead=true;else ricochet(b);
      break;
     }
    }
    if(b.age>=swipeSkillSettings.duration-1e-8)b.dead=true;
   }
   projectiles=projectiles.filter(b=>!b.dead);
  }
  for(const owner of owners)if(!projectiles.some(b=>b.owner===owner)){clearBuff(owner);owners.delete(owner);}
 }
 function draw(context,camera){
  if(!image?.complete||!image.naturalWidth)return;
  for(const b of projectiles){context.save();context.translate(b.x-camera.x,b.y-camera.y);context.rotate(b.rotation);context.globalAlpha=Math.min(1,(swipeSkillSettings.duration-b.age)/.12);
   for(let i=0;i<b.blocks;i++){context.save();context.translate((i-(b.blocks-1)/2)*swipeSkillSettings.baseWidth*.65*b.size,-Math.abs(i-(b.blocks-1)/2)*swipeSkillSettings.baseHeight*.18*b.size);context.rotate(b.angles[i]);context.drawImage(image,-swipeSkillSettings.baseWidth*b.size/2,-swipeSkillSettings.baseHeight*b.size/2,swipeSkillSettings.baseWidth*b.size,swipeSkillSettings.baseHeight*b.size);context.restore();}
   context.restore();
  }
 }
 return {ready,update,draw,reset,dispose(){stop();reset();},get projectileCount(){return projectiles.length;}};
}
