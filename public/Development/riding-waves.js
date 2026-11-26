import {playerSettings,normalSpriteSize,spriteDisplayPadding,timeToSurfSettings,timeToSurfLevelStats} from './game-config.js';
import {statMultiplier,totalWeaponDamage,rollAttackDamage} from './combat-stats.js';
import {getAllEnemies,damageEnemy} from './world-state.js';
import {getEnemyHurtbox,segmentHitsBody} from './combat-hitboxes.js';
import {createEnemySpatialIndex} from './enemy-spatial-index.js';

export function ridingWaveOrigin(player){return {x:player.x,y:player.y+(player.spriteSize||normalSpriteSize)/2-spriteDisplayPadding,timeToSurfSettings,timeToSurfLevelStats};}
export function createRidingWaves({random=Math.random}={}){
 let owner=null,state=null,board=null;
 const ready=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{board=new Image();board.onload=resolve;board.onerror=()=>{board=null;resolve();};board.src=new URL('../sprites/attacks/Event 46 - Surfboard.png',import.meta.url).href;});
 function reset(){if(owner)delete owner.ridingWavesActive;owner=null;state=null;}
 function cast(player,angle=0){if(!player.attackSlots?.some(w=>w?.id==='time-to-surf'))return false;reset();owner=player;const height=player.spriteHurtbox?.height||((player.spriteSize||normalSpriteSize)-spriteDisplayPadding*2);state={angle,targetAngle:angle,visualFacing:Math.abs(Math.cos(angle))>.1?(Math.cos(angle)<0?'left':'right'):(player.facing==='left'?'left':'right'),height,remaining:10,age:0,width:height*3,depth:height*.85,hits:new Set(),damageHits:new Map(),braking:false,brakeHeld:0,brakeStartScale:1,speedScale:1};player.ridingWavesActive=true;return true;}
 function setMovementInput(player,direction){if(!state||owner!==player)return;const [x,y]=direction||[0,0],length=Math.hypot(x,y),braking=length>0&&(x*Math.cos(state.angle)+y*Math.sin(state.angle))/length<=-.5;if(braking&&!state.braking){state.brakeHeld=0;state.brakeStartScale=state.speedScale;}if(!braking)state.brakeHeld=0;state.braking=braking;if(length>0&&!braking)state.targetAngle=Math.atan2(y,x);}
 function setAimAngle(player,angle){if(state&&owner===player&&Number.isFinite(angle))state.targetAngle=angle;}
 function update(delta,player,move){
  if(!state)return false;const weapon=player.attackSlots?.find(w=>w?.id==='time-to-surf');if(owner!==player||!weapon){reset();return false;}
  let left=Math.max(0,delta),index=null;
  while(state&&left>1e-8){const dt=Math.min(left,1/120,state.remaining);left-=dt;const before=ridingWaveOrigin(player),previousScale=state.speedScale;
   if(!state.braking){const difference=Math.atan2(Math.sin(state.targetAngle-state.angle),Math.cos(state.targetAngle-state.angle));state.angle+=Math.max(-3*dt,Math.min(3*dt,difference));}
   if(Math.abs(Math.cos(state.angle))>.1)state.visualFacing=Math.cos(state.angle)<0?'left':'right';
   if(state.braking){state.brakeHeld=Math.min(2,state.brakeHeld+dt);state.speedScale=state.brakeStartScale*(1-state.brakeHeld/2);}else state.speedScale=Math.min(1,state.speedScale+dt);
   const speed=1.5*playerSettings.movementBase*(player.movementSpeedMultiplier||1)*statMultiplier(player,'spdPercent')*(previousScale+state.speedScale)/2;
   move(state.angle,speed,dt,state.visualFacing==='left'?Math.PI:0);const after=ridingWaveOrigin(player);state.remaining-=dt;state.age+=dt;
   const c=Math.cos(state.angle),s=Math.sin(state.angle),radius=Math.max(state.width,state.depth)/2;
   for(const enemy of (index??=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox)).querySegment(before,after,radius)){
    if(!(enemy.hp>0)||state.age-(state.damageHits.get(enemy.id)??-Infinity)<timeToSurfSettings.hitCooldown-1e-8)continue;const b=getEnemyHurtbox(enemy),project=p=>({x:(p.x-b.x)*c+(p.y-b.y)*s,y:-(p.x-b.x)*s+(p.y-b.y)*c}),a=project(before),z=project(after);
    const body={shape:'ellipse',x:0,y:0,rx:state.depth/2+Math.hypot(b.rx*c,b.ry*s),ry:state.width/2+Math.hypot(b.rx*s,b.ry*c)};
    if(!segmentHitsBody(body,a.x,a.y,z.x,z.y))continue;
    state.damageHits.set(enemy.id,state.age);const stats=timeToSurfLevelStats(weapon.level),base=totalWeaponDamage(player,'time-to-surf',timeToSurfSettings.damage,stats.damageBonuses,{projectileCount:2,hitCooldownFrames:timeToSurfSettings.hitCooldown*60}),hit=rollAttackDamage(player,base,random,{target:enemy,weaponId:'time-to-surf',skillAttack:true});
    if(damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'time-to-surf',skillAttack:true})===false)continue;
    if(!state.hits.has(enemy.id)){state.hits.add(enemy.id);enemy.flattenedRemaining=Math.max(enemy.flattenedRemaining||0,2);enemy.ridingWaveSlowRemaining=Math.max(enemy.ridingWaveSlowRemaining||0,6);}
   }
   if(state.remaining<=1e-8||state.brakeHeld>=2-1e-8){delete player.ridingWavesActive;state=null;}
  }return true;
 }
 function draw(context,camera){if(!state||!owner)return;const p=ridingWaveOrigin(owner),w=state.width,d=state.depth,fade=Math.min(1,state.age/.15,state.remaining/.2);context.save();context.translate(p.x-camera.x,p.y-camera.y);context.rotate(state.angle+Math.PI/2);context.globalAlpha=fade;
  // Tapered wake ribbons fade behind the rolling front, rather than filling an oval.
  const wake=context.createLinearGradient(0,-d*.2,0,d*2);wake.addColorStop(0,'rgba(61,198,250,.6)');wake.addColorStop(.5,'rgba(45,159,235,.22)');wake.addColorStop(1,'rgba(33,133,219,0)');context.fillStyle=wake;
  for(let i=0;i<5;i++){const x=(i-2)*w*.17,flow=Math.sin(state.age*5+i)*w*.025;context.beginPath();context.moveTo(x-w*.13,-d*.1);context.bezierCurveTo(x-w*.15+flow,d*.65,x+flow,d*1.5,x+w*.02,d*2);context.bezierCurveTo(x+w*.12+flow,d*1.1,x+w*.17,d*.35,x+w*.13,-d*.1);context.fill();}
  const water=context.createLinearGradient(0,-d*.65,0,d*.65);water.addColorStop(0,'rgba(220,255,255,.95)');water.addColorStop(.2,'rgba(92,227,255,.92)');water.addColorStop(.55,'rgba(27,169,236,.85)');water.addColorStop(1,'rgba(29,130,222,.2)');context.fillStyle=water;
  context.beginPath();context.moveTo(-w*.5,d*.15);context.bezierCurveTo(-w*.43,-d*.5,-w*.16,-d*.85,w*.05,-d*.52);context.bezierCurveTo(w*.22,-d*.86,w*.49,-d*.39,w*.5,d*.14);context.bezierCurveTo(w*.23,d*.55,-w*.23,d*.55,-w*.5,d*.15);context.fill();
  // Breaking lip: individual curling foam scallops ripple across the crest.
  context.strokeStyle='rgba(232,255,255,.95)';context.lineWidth=3;context.lineCap='round';
  for(let i=0;i<9;i++){const x=(i/8-.5)*w*.84,y=-d*(.3+.12*Math.cos(i*.8+state.age*5)),curl=d*(.14+.04*Math.sin(state.age*6+i));context.beginPath();context.moveTo(x-w*.06,y+d*.13);context.bezierCurveTo(x-w*.03,y-curl,x+w*.08,y-curl,x+w*.055,y+d*.06);context.bezierCurveTo(x+w*.04,y+d*.15,x+w*.01,y+d*.1,x+w*.025,y+d*.045);context.stroke();}
  context.strokeStyle='rgba(177,244,255,.55)';context.lineWidth=1.2;for(let i=0;i<6;i++){const t=(state.age*.8+i/6)%1,x=Math.sin(i*2.4)*w*.36;context.globalAlpha=fade*(1-t)*.65;context.beginPath();context.moveTo(x,d*.25+t*d*1.3);context.bezierCurveTo(x-w*.07,d*.45+t*d*1.3,x+w*.05,d*.6+t*d*1.3,x+w*.09,d*.65+t*d*1.3);context.stroke();}
  context.fillStyle='#ecffff';for(let i=0;i<18;i++){const t=(state.age*1.1+i*.173)%1,x=(i/17-.5)*w*.94+Math.sin(i*4)*t*d*.15,y=-d*.25-Math.sin(t*Math.PI)*d*.7;context.globalAlpha=fade*(1-t)*.85;context.beginPath();context.arc(x,y,(1.3+(i%3)*.45)*(1-t*.5),0,Math.PI*2);context.fill();}context.restore();
  if(board?.complete&&board.naturalWidth){const width=state.height*1.25,height=width*192/605;context.save();context.translate(p.x-camera.x,p.y-camera.y-2);context.globalAlpha=fade;context.rotate(state.visualFacing==='right'?-Math.PI/18:Math.PI/18);if(state.visualFacing==='right')context.scale(-1,1);context.drawImage(board,17,62,605,192,-width/2,-height/2,width,height);context.restore();}
 }
 return {ready,cast,update,draw,reset,setMovementInput,setAimAngle,get active(){return Boolean(state);}};
}
