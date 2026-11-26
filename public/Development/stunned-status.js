import {stunnedFrames} from './stunned-animation.js';
import {loadGifAnimation,gifFrameAt} from './gif-animation.js';
import {getEnemyHurtbox} from './combat-hitboxes.js';
export const stunnedSettings={testSeconds:3,source:'../sprites/icons/effects/stunned.gif',headGap:2,headInset:.35};
const animation={gifFrames:stunnedFrames};
export const stunnedReady=typeof Image==='undefined'?Promise.resolve():loadGifAnimation(animation);
export function applyStunned(enemy,seconds=stunnedSettings.testSeconds){
  if(!(seconds>0)||enemy.hp===0)return false;
  if(!(enemy.stunRemaining>0))enemy.stunVisualElapsed=0;
  enemy.stunRemaining=Math.max(enemy.stunRemaining||0,seconds);enemy.moving=false;return true;
}
export function stunVisibleEnemies(enemies,camera,width,height){
  let count=0;for(const enemy of enemies){const body=getEnemyHurtbox(enemy);
    if(body.x+body.rx<camera.x||body.x-body.rx>camera.x+width||body.y+body.ry<camera.y||body.y-body.ry>camera.y+height)continue;
    if(applyStunned(enemy))count++;
  }return count;
}
export function drawStunnedStatus(context,camera,enemy){
  if(!(enemy.stunRemaining>0)||enemy.hp===0||!animation.animationFrames?.length)return;
  const stars=animation.animationFrames[gifFrameAt(animation.animationFrames,(enemy.stunVisualElapsed||0)*1000)].image;
  const body=getEnemyHurtbox(enemy),width=Math.max(32,Math.min(140,body.rx*1.6)),height=width*stars.naturalHeight/stars.naturalWidth;
  context.save();context.drawImage(stars,body.x-camera.x-width/2,body.y-camera.y-body.ry+body.ry*2*stunnedSettings.headInset-stunnedSettings.headGap-height,width,height);context.restore();
}
export function createStunnedAdmin({root,getEnemies,getCamera,getSize}){
  const status=root.querySelector('[role="status"]');
  root.querySelector('#admin-stun-visible').addEventListener('click',()=>{const {width,height}=getSize();const count=stunVisibleEnemies(getEnemies(),getCamera(),width,height);status.textContent=`Stunned ${count} onscreen enemies for 3 seconds.`;});
}
