import {tuningPerk} from './tuning-parts.js';
const attempts=new WeakMap();let clock=0;
export function updateNeutralizationTuning(delta){clock+=Math.max(0,delta);}
function enabled(player){return player.tuningParts&&(player.mainWeaponId??(player.label==='Plana'?'plana-umbrella':null))==='plana-umbrella';}
export function tryNeutralizationHit({player,enemy,random=Math.random}){
  if(!enabled(player)||enemy.hp<=0)return false;
  const chance=tuningPerk(player.tuningParts,'stunChance');if(!chance||random()>=chance)return false;
  enemy.stunRemaining=Math.max(enemy.stunRemaining||0,1);enemy.moving=false;return true;
}
export function canEraseEnemyProjectile(projectile){
  return projectile.erasable!==false&&!['neru','iroha'].includes(projectile.ownerType)&&
    !['ground-pound','smash','ram','self-destruct','explosion'].includes(projectile.kind);
}
/** The whole attack shares one attempt per second, on success or failure. */
export function eraseTuningProjectiles({player,attack,projectiles,intersects,random=Math.random}){
  if(!enabled(player)||clock-(attempts.get(attack)??-Infinity)<1-1e-8)return false;
  const chance=tuningPerk(player.tuningParts,'eraseChance');if(!chance)return false;
  for(let i=0;i<projectiles.length;i++){
    if(!canEraseEnemyProjectile(projectiles[i])||!intersects(projectiles[i]))continue;
    attempts.set(attack,clock);if(random()>=chance)return false;
    projectiles.splice(i,1);return true;
  }return false;
}
