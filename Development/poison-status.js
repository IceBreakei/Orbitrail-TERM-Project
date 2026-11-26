import {damageEnemy} from './world-state.js';
/** Noncritical base-weapon poison, kept independent of movement/control statuses. */
export function applyPoison(enemy,player,baseDamage,seconds=10){
 if(!(enemy.hp>0)||!(seconds>0))return false;const damage=Math.max(1,Math.round(Math.max(0,baseDamage)*.1));
 const old=enemy.poison;enemy.poison={owner:damage>=(old?.damage||0)?player:old.owner,damage:Math.max(damage,old?.damage||0),remaining:Math.max(seconds,old?.remaining||0),elapsed:old?.elapsed||0};enemy.poisonRemaining=enemy.poison.remaining;return true;
}
export function updatePoison(enemy,delta){
 const poison=enemy.poison;if(!poison||!(delta>0)||!Number.isFinite(delta))return;
 const elapsed=Math.min(delta,poison.remaining);poison.remaining=Math.max(0,poison.remaining-elapsed);poison.elapsed+=elapsed;
 while(poison.elapsed>=1-1e-8&&enemy.hp>0){poison.elapsed=Math.max(0,poison.elapsed-1);damageEnemy(enemy.id,poison.damage,poison.owner,'normal',{weaponId:'bean-bag-bomb',poison:true,skillAttack:true,triggersSkills:false});}
 enemy.poisonRemaining=poison.remaining;if(poison.remaining<1e-8||enemy.hp<=0){enemy.poisonRemaining=0;delete enemy.poison;}
}
