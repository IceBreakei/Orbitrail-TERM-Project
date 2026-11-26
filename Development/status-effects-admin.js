import {getEnemyHurtbox} from './combat-hitboxes.js';
/** One-shot status tests affect living enemies intersecting the gameplay viewport. */
export function applyVisibleAdminStatus(enemies,camera,width,height,type){
 if(!['flatten','slow'].includes(type))return 0;
 let count=0;for(const enemy of enemies){if(!(enemy.hp>0)||enemy.death)continue;const b=getEnemyHurtbox(enemy);if(b.x+b.rx<camera.x||b.x-b.rx>camera.x+width||b.y+b.ry<camera.y||b.y-b.ry>camera.y+height)continue;
  if(type==='flatten')enemy.flattenedRemaining=Math.max(enemy.flattenedRemaining||0,5);
  else {enemy.splashSlowRemaining=Math.max(enemy.splashSlowRemaining||0,5);enemy.splashSlowPercent=80;}
  count++;
 }return count;
}
export function createAdditionalStatusAdmin({root,getEnemies,getCamera,getSize}){
 const status=root.querySelector('[role="status"]');for(const [id,type,label]of [['admin-flatten-visible','flatten','Flattened'],['admin-slow-visible','slow','Slowed']])root.querySelector('#'+id).addEventListener('click',()=>{const {width,height}=getSize(),count=applyVisibleAdminStatus(getEnemies(),getCamera(),width,height,type);status.textContent=`${label} ${count} onscreen enemies for 5 seconds.${type==='slow'?' Movement reduced by 80%.':' Sprite height reduced to 20%.'}`;});
}
