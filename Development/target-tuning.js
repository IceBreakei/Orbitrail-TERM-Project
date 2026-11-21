import {tuningPerk} from './tuning-parts.js';
import {getEnemy,damageEnemy} from './world-state.js';
import {getEnemyHurtbox} from './combat-hitboxes.js';
const markedProjectiles=new WeakSet();
let icon;if(typeof Image!=='undefined'){icon=new Image();icon.src='../sprites/icons/Marker Buoy.png';}
function enabled(player){return player.tuningParts&&((player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null))==='plana-umbrella')&&tuningPerk(player.tuningParts,'targetPercent')>0;}
/** No propagation hooks are called for transfer damage, so it can never chain recursively. */
export function shareTargetTuningDamage({player,enemy,damage,hitType='normal'}){
  if(!enabled(player)||!(damage>0))return 0;
  const run=player.tuningParts,marks=run.targetMarkedIds;if(!marks?.has(enemy.id))return 0;
  const amount=Math.round(damage*tuningPerk(run,'targetPercent')/100);if(amount<1)return 0;
  let count=0;for(const id of [...marks]){
    const target=getEnemy(id);if(!target){marks.delete(id);continue;}
    if(id===enemy.id)continue;
    if(damageEnemy(id,amount,player,hitType,{targetTransfer:true}))count++;
  }return count;
}
export function onTargetTuningHit({player,projectile,enemy,damage,hitType}){
  if(!enabled(player))return;
  if(!markedProjectiles.has(projectile)){
    markedProjectiles.add(projectile);player.tuningParts.targetMarkedIds??=new Set();player.tuningParts.targetMarkedIds.add(enemy.id);
  }
  shareTargetTuningDamage({player,enemy,damage,hitType});
}
export function drawTargetTuningMark(context,camera,enemy,player){
  if(!enabled(player)||!player.tuningParts.targetMarkedIds?.has(enemy.id)||enemy.hp<=0||!icon?.naturalWidth)return;
  const body=getEnemyHurtbox(enemy),size=22;
  context.save();context.globalAlpha=.85;context.drawImage(icon,body.x-camera.x-size/2,body.y-camera.y-body.ry-size-4,size,size);context.restore();
}
