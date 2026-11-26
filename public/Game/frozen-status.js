import {getEnemyHurtbox} from './combat-hitboxes.js';
export const frozenSettings={duration:3,opacity:.55,coverageScale:1.65,source:'../sprites/icons/effects/frozen.png'};
let ice;
export const frozenReady=typeof Image==='undefined'?Promise.resolve():new Promise((resolve,reject)=>{ice=new Image();ice.onload=resolve;ice.onerror=reject;ice.src=frozenSettings.source;});
export function applyFrozen(enemy,seconds=frozenSettings.duration){
  if(!(seconds>0)||enemy.hp===0)return false;
  enemy.frozenRemaining=Math.max(enemy.frozenRemaining||0,seconds);enemy.moving=false;return true;
}
export function freezeVisibleEnemies(enemies,camera,width,height){
  let count=0;for(const enemy of enemies){const body=getEnemyHurtbox(enemy);
    if(body.x+body.rx<camera.x||body.x-body.rx>camera.x+width||body.y+body.ry<camera.y||body.y-body.ry>camera.y+height)continue;
    if(applyFrozen(enemy))count++;
  }return count;
}
export function drawFrozenStatus(context,camera,enemy){
  if(!(enemy.frozenRemaining>0)||enemy.hp===0||!ice?.naturalWidth)return;
  const body=getEnemyHurtbox(enemy),size=enemy.spriteSize||Math.max(body.rx,body.ry)*2,
    height=size*frozenSettings.coverageScale,
    width=Math.max(size*frozenSettings.coverageScale,height*ice.naturalWidth/ice.naturalHeight);
  context.save();context.globalAlpha=frozenSettings.opacity;
  context.drawImage(ice,enemy.x-camera.x-width/2,enemy.y-camera.y-height/2,width,height);context.restore();
}
export function createFrozenAdmin({root,getEnemies,getCamera,getSize}){
  const status=root.querySelector('[role="status"]');
  root.querySelector('button').addEventListener('click',()=>{const {width,height}=getSize();const count=freezeVisibleEnemies(getEnemies(),getCamera(),width,height);status.textContent=`Frozen ${count} onscreen enemies for 3 seconds.`;});
}

/** Visual pursuit continues at normal speed during freeze, stun or flattening. */
export function animateFrozenEnemy(enemy,player,delta){
  const dx=player.x-enemy.x,dy=player.y-enemy.y;
  const directions=['up','upRight','right','downRight','down','downLeft','left','upLeft'];
  if(dx||dy)enemy.direction=directions[(Math.round(Math.atan2(dx,-dy)/(Math.PI/4))+8)%8];
  if(dx)enemy.facing=dx>0?'right':'left';
  enemy.moving=true;enemy.elapsed=(enemy.elapsed||0)+delta*1000;
  if(enemy.transition)enemy.transition.elapsed=(enemy.transition.elapsed||0)+delta*1000;
  if(enemy.attack){
    const duration=(enemy.layout?.columnEdges.length-1)*(enemy.attacks?.[enemy.attack.name]?.frameDuration||0);
    const elapsed=(enemy.attack.elapsed||0)+delta*1000;
    enemy.attack.elapsed=duration>0?elapsed%duration:elapsed;
  }
  if(enemy.bossAction?.clip)enemy.frozenPoseElapsed=(enemy.frozenPoseElapsed??(enemy.bossAction.elapsed||0)*1000)+delta*1000;
}
