import { isContentUnlocked } from './item-catalog.js';
import { healPlayer } from './player-stats.js';
import { getAllEnemies } from './world-state.js';
import { applySkillControl } from './enemy-control.js';
import { collectSupportLoot } from './exp-drops.js';
export const supportItems=[
 {id:'none',name:'No Support',description:'No Support Item equipped.',cooldown:0},
 {id:'projectile-shield',name:'Projectile Shield',description:'Protects from projectile attacks for 30 seconds.',cooldown:90},
 {id:'heal-potion',name:'Heal Potion',description:'Instantly heals 33% of Max HP.',cooldown:30},
 {id:'quick-dash',name:'Quick Dash',description:'Dashes forward in moving direction, and gains invincibility for 1 second.',cooldown:10},
 {id:'cast-net',name:'Cast Net',description:'Cast a net in front, pulling targets together and collect all EXP and Credits.',cooldown:15}
];
export function supportsUnlocked(player){return Boolean(player.abilityUpgradeRanks?.supports||isContentUnlocked('supports'));}
export function supportIcon(id){const shape={none:'<circle cx="24" cy="24" r="17"/><path stroke="#ff607c" stroke-width="4" d="m12 36 24-24"/>','projectile-shield':'<path fill="#58caf555" d="m24 5 17 6-3 20-14 12-14-12-3-20Z"/><path d="M24 12v22"/>','heal-potion':'<path fill="#71d8aa77" d="M18 4h12v12l9 12v14H9V28l9-12Z"/><path d="M24 24v12m-6-6h12M16 4h16"/>','quick-dash':'<path fill="#6cdcff" d="m26 4-17 23h14l-5 17 23-28H27Z"/>','cast-net':'<path d="m8 7 33 31-4 5L4 12Zm-1 4 28-5 8 30M12 10l-1 13m9-15-2 23m10-25-3 32M7 18l31-6M12 25l28-5m-20 13 22-5"/>'}[id]||'';return `<svg viewBox="0 0 48 48" fill="none" stroke="#ddfaff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;}
export function supportState(player){return player.supportState??={cooldowns:{},shieldRemaining:0,invulnerableRemaining:0,dashRemaining:0,effectRemaining:0};}
export function activateSupport(player,{direction=player.direction||'down',angle=0,enemies=getAllEnemies(),collectLoot=collectSupportLoot}={}){
 const item=supportItems.find(i=>i.id===player.supportItemId),state=supportState(player);if(!item||item.id==='none'||!supportsUnlocked(player)||player.hp<=0||(state.cooldowns[item.id]||0)>0)return false;
 state.cooldowns[item.id]=item.cooldown;state.effect=item.id;state.effectRemaining=.6;state.angle=angle;
 if(item.id==='projectile-shield')state.shieldRemaining=30;
 if(item.id==='heal-potion')healPlayer(player,player.maxHp*.33);
 if(item.id==='quick-dash'){state.dashRemaining=.18;state.dashDirection=direction;state.invulnerableRemaining=1;}
 if(item.id==='cast-net'){const tx=player.x+Math.cos(angle)*150,ty=player.y+Math.sin(angle)*150;for(const enemy of enemies){const dx=enemy.x-player.x,dy=enemy.y-player.y,dist=Math.hypot(dx,dy);if(enemy.hp>0&&dist<=320&&(dist<1||(dx*Math.cos(angle)+dy*Math.sin(angle))/dist>=.5))applySkillControl(enemy,tx-enemy.x,ty-enemy.y,0,.3);}collectLoot(player);}
 return true;
}
export function updateSupport(player,delta){const state=supportState(player);if(!(delta>0)||!Number.isFinite(delta))return;for(const id of Object.keys(state.cooldowns))state.cooldowns[id]=Math.max(0,state.cooldowns[id]-delta);for(const key of ['shieldRemaining','invulnerableRemaining','dashRemaining','effectRemaining'])state[key]=Math.max(0,state[key]-delta);}
export function createSupportControls({getPlayer,isPaused,getDirection,getAngle}){
 function use(){if(isPaused())return;const player=getPlayer();activateSupport(player,{direction:getDirection(),angle:getAngle()});}
 window.addEventListener('keydown',event=>{if(event.code!=='KeyC'||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.target?.matches?.('input,textarea,select,[contenteditable="true"]')||isPaused())return;event.preventDefault();use();});
 return {update(delta,paused){if(!paused)updateSupport(getPlayer(),delta);},draw(ctx,camera){const player=getPlayer(),state=supportState(player);if(!state.shieldRemaining&&!state.effectRemaining&&!state.invulnerableRemaining)return;const x=player.x-camera.x,y=player.y-camera.y;ctx.save();ctx.translate(x,y);ctx.strokeStyle=state.effect==='heal-potion'?'#82ffd1':'#8beaff';ctx.lineWidth=2;ctx.globalAlpha=state.shieldRemaining>0 ? .55 :Math.min(1,state.effectRemaining/.6)*.7;if(state.shieldRemaining>0){ctx.fillStyle='#69d9ff16';ctx.beginPath();ctx.arc(0,-4,40,0,Math.PI*2);ctx.fill();ctx.stroke();}if(state.effectRemaining>0&&state.effect==='cast-net'){ctx.rotate(state.angle);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,280,-Math.PI/3,Math.PI/3);ctx.closePath();ctx.stroke();for(let r=70;r<280;r+=70){ctx.beginPath();ctx.arc(0,0,r,-Math.PI/3,Math.PI/3);ctx.stroke();}}else if(state.effectRemaining>0){const r=24+(1-state.effectRemaining/.6)*32;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}ctx.restore();}};
}
