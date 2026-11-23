import { getEnemyHurtbox } from './combat-hitboxes.js';
import { characterCriticalMultiplier } from './combat-stats.js';
import { createSwipeSkill, swipeDescription, createCelestiaSkill, celestiaDescription, createPhrenapatesSkill, phrenapatesDescription } from './game-config.js';
import { onEnemyDefeat, onEnemyDamage, getAllEnemies, damageEnemy } from './world-state.js';
import { healPlayer } from './player-stats.js';

const buffKey='phrenapates';
function skillFor(player,id=buffKey){return player?.label==='Plana'?player.characterSkills?.find(s=>s?.id===id):null;}
function syncBuff(player,skill,state){
 const amount=[2,3,4][Math.min(2,Math.max(0,(skill.level||1)-1))];
 player.combatBuffs??={};player.combatBuffs[buffKey]={critPercent:Math.min(10,state.stacks)*amount};
}
/** Card-based weapons opt in explicitly; names are never guessed or treated as tags. */
export function phrenapatesHealingWeapon(player,weaponId){
 if(weaponId==='plana-umbrella'||weaponId==='swipe')return true;
 const weapon=player.attackSlots?.find(w=>w?.id===weaponId);
 return Boolean(weapon&&(weapon.usesCards===true||weapon.weaponTags?.includes('card')));
}
export function applyPhrenapatesDefeat({source,weaponId},random=Math.random){
 const skill=skillFor(source);if(!skill||source.hp<=0)return false;
 const state=source.phrenapatesState??={stacks:0,remaining:0};
 state.stacks=Math.min(10,(state.remaining>0?state.stacks:0)+1);state.remaining=4;syncBuff(source,skill,state);
 if(phrenapatesHealingWeapon(source,weaponId)&&random()<.1)healPlayer(source,3);
 return true;
}
function syncCelestiaBuff(player,skill,state){
 const amount=[4,6,8][Math.min(2,Math.max(0,(skill.level||1)-1))];
 player.combatBuffs??={};player.combatBuffs.celestia={atkPercent:Math.min(5,state.stacks)*amount,stacks:state.stacks};
}
/** Copy the accepted critical hit once, without a new damage/crit roll or skill triggers. */
export function applyCelestiaCritical(event,random=Math.random){
 const {source,enemy,requestedDamage,hitType,triggersSkills}=event,skill=skillFor(source,'celestia');
 if(!skill||source.hp<=0||triggersSkills===false||!(event.isCritical??['critical','orangecritical','supercritical'].includes(hitType))||!(requestedDamage>0))return false;
 let state=source.celestiaState;
 if(state?.remaining>0)state.remaining=4; // Every real crit refreshes an existing buff, even a failed proc.
 if(random()>=.25)return false;
 state=source.celestiaState??={stacks:0,remaining:0};state.stacks=Math.min(5,(state.remaining>0?state.stacks:0)+1);state.remaining=4;
 syncCelestiaBuff(source,skill,state);
 const origin=getEnemyHurtbox(enemy),display=characterCriticalMultiplier(source)>=2?'orangecritical':'critical';
 for(const target of getAllEnemies()){
  if(!(target.hp>0))continue;
  const body=getEnemyHurtbox(target),dx=body.x-origin.x,dy=body.y-origin.y,distance=Math.hypot(dx,dy);
  const extent=distance?1/Math.hypot(dx/distance/body.rx,dy/distance/body.ry):0;
  if(distance>75+extent)continue;
  damageEnemy(target.id,requestedDamage,source,display,{weaponId:'celestia',isCritical:false,triggersSkills:false});
 }
 return true;
}
/** Only confirmed kills/accepted real criticals can feed character skills. */
export function createCharacterSkillEffects({random=Math.random}={}){
 const stopDefeat=onEnemyDefeat(event=>applyPhrenapatesDefeat(event,random));
 const stopDamage=onEnemyDamage(event=>applyCelestiaCritical(event,random));
 return {dispose(){stopDefeat();stopDamage();}};
}
export function updateCharacterSkills(player,delta){
 for(const [id,key,sync]of [['phrenapates','phrenapatesState',syncBuff],['celestia','celestiaState',syncCelestiaBuff]]){
  const skill=skillFor(player,id),state=player[key];if(!state)continue;
  if(!skill||player.hp<=0){delete player[key];if(player.combatBuffs)delete player.combatBuffs[id];continue;}
  state.remaining=Math.max(0,state.remaining-Math.max(0,delta));
  if(state.remaining<=1e-8){state.remaining=0;state.stacks=0;if(player.combatBuffs)delete player.combatBuffs[id];}
  else sync(player,skill,state);
 }
}
/** Admin clicks acquire, then level the skill; character skills never fill equipment slots. */
export function createCharacterSkillAdmin({root,getPlayer}){
 if(!root)return;
 for(const [create,describe]of [[createPhrenapatesSkill,phrenapatesDescription],[createCelestiaSkill,celestiaDescription],[createSwipeSkill,swipeDescription]]){
  const candidate=create(),button=document.createElement('button'),status=document.createElement('p');
  button.type='button';button.textContent=`Learn / level ${candidate.name}`;status.setAttribute('role','status');button.title=describe(1);
  button.addEventListener('click',()=>{const player=getPlayer();if(player.label!=='Plana'){status.textContent=`${candidate.name} belongs to Plana.`;return;}
   const skill=player.characterSkills?.find(s=>s?.id===candidate.id);
   if(skill)skill.level=Math.min(3,(skill.level||1)+1);else (player.characterSkills??=[]).push(create());
   updateCharacterSkills(player,0);const current=skillFor(player,candidate.id);status.textContent=`${candidate.name} ${current.level>=3?'MAX':`LV ${current.level}`} learned.`;
  });root.append(button,status);
 }
}
