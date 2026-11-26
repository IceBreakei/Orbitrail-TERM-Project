import {serveSettings,serveLevelStats,attackTimeFormula,weaponSizeMultiplier} from './game-config.js';
import {ensureCombatStats,totalWeaponDamage,rollAttackDamage} from './combat-stats.js';
import {stationaryWeaponIntervalScale,startingWeaponProjectileCount} from './tuning-parts.js';
import {getAllEnemies,getEnemy,damageEnemy} from './world-state.js';
import {getCombatHitbox,getEnemyHurtbox,segmentHitsBody} from './combat-hitboxes.js';
import {createEnemySpatialIndex} from './enemy-spatial-index.js';

/** Reflect inside the visible screen; the complete ball stays inside its edges. */
export function serveBounce(position,velocity,min,max){
 if(max<=min)return {position:(min+max)/2,velocity:0};
 while(position<min||position>max){if(position<min){position=2*min-position;velocity=Math.abs(velocity);}if(position>max){position=2*max-position;velocity=-Math.abs(velocity);}}
 return {position,velocity};
}
export function createServeAttack({random=Math.random}={}){
 const s=serveSettings;let owner=null,enabled=true,cooldown=0,time=0,balls=[],blasts=[],shots=0,burstCount=0,sprite=null,explosionSprite=null;
 const ballReady=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{sprite=new Image();sprite.onload=resolve;sprite.onerror=()=>{sprite=null;resolve();};sprite.src=new URL('../sprites/attacks/Beach Ball.png',import.meta.url).href;});
 const explosionReady=typeof Image==='undefined'?Promise.resolve():new Promise(resolve=>{explosionSprite=new Image();explosionSprite.onload=resolve;explosionSprite.onerror=()=>{explosionSprite=null;resolve();};explosionSprite.src=new URL('../sprites/attacks/ExplosionSheet.png',import.meta.url).href;});
 const ready=Promise.all([ballReady,explosionReady]);
 function reset(){owner=null;cooldown=0;time=0;balls=[];blasts=[];shots=0;burstCount=0;}
 function launch(player,weapon){const stats=serveLevelStats(weapon.level),body=getCombatHitbox(player,false),size=weaponSizeMultiplier(player),count=startingWeaponProjectileCount(player,'serve',stats.count);
  for(let i=0;i<count;i++){const a=random()*Math.PI*2;balls.push({x:body.x,y:body.y,vx:Math.cos(a)*stats.speed,vy:Math.sin(a)*stats.speed,age:0,rotation:random()*Math.PI*2,radius:s.radius*stats.size*size,blastScale:stats.blastArea*size,count,damageBonuses:stats.damageBonuses,hitsLeft:stats.hitLimit,hits:new Map()});shots++;}
 }
 function cast(player,angle=0){const weapon=player.attackSlots?.find(w=>w?.id==='serve');if(!weapon)return false;if(owner!==player){reset();owner=player;}const stats=serveLevelStats(weapon.level),body=getCombatHitbox(player,false),size=weaponSizeMultiplier(player);balls.push({exSkill:true,exMain:true,duration:s.duration*3,normalSpeed:stats.speed,normalHitLimit:stats.hitLimit,x:body.x,y:body.y,vx:Math.cos(angle)*stats.speed*.8,vy:Math.sin(angle)*stats.speed*.8,age:0,rotation:angle,radius:s.radius*stats.size*size*2,blastScale:stats.blastArea*size,count:1,damageBonuses:stats.damageBonuses,hitsLeft:Infinity,hits:new Map()});shots++;return true;}
 function spawnSmallBall(b){const angle=random()*Math.PI*2,speed=b.normalSpeed;balls.push({exSkill:true,globalBlast:true,blastAngle:random()<.5?0:Math.PI/4,duration:s.duration,x:b.x,y:b.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,age:0,rotation:angle,radius:b.radius/2,blastScale:b.blastScale,count:b.count,damageBonuses:b.damageBonuses,hitsLeft:b.normalHitLimit,hits:new Map()});shots++;}
 function hit(player,b,enemy,multiplier=1){const damage=totalWeaponDamage(player,'serve',s.damage,b.damageBonuses,{projectileCount:b.count,hitCooldownFrames:s.hitCooldown*60})*multiplier,roll=rollAttackDamage(player,damage,random,{target:enemy,weaponId:'serve',skillAttack:Boolean(b.exSkill)});const accepted=damageEnemy(enemy.id,roll.damage,player,roll.type,{canMiss:true,weaponId:'serve',skillAttack:Boolean(b.exSkill)});if(accepted!==false&&b.exMain&&(enemy.hp<=0||!getEnemy(enemy.id)))spawnSmallBall(b);return accepted;}
 function explode(player,b,view){const effect={x:b.x,y:b.y,scale:b.blastScale,age:0,rotation:b.blastAngle??Math.PI/4};
  if(b.exSkill){effect.halfLength=Math.max(...[view.x,view.x+view.width].flatMap(x=>[view.y,view.y+view.height].map(y=>Math.hypot(x-b.x,y-b.y))))+b.radius*2;effect.thickness=b.radius*2;if(b.globalBlast)for(const enemy of getAllEnemies()){const body=getEnemyHurtbox(enemy);effect.halfLength=Math.max(effect.halfLength,Math.hypot(body.x-b.x,body.y-b.y)+Math.max(body.rx,body.ry)+effect.thickness);}}blasts.push(effect);burstCount++;
  const length=effect.halfLength??s.blastLength*effect.scale/2,width=(effect.thickness??s.blastWidth*effect.scale)/2;
  for(const enemy of getAllEnemies()){const body=getEnemyHurtbox(enemy);if(b.exSkill&&!b.globalBlast&&(body.x+body.rx<view.x||body.x-body.rx>view.x+view.width||body.y+body.ry<view.y||body.y-body.ry>view.y+view.height))continue;if([effect.rotation,effect.rotation+Math.PI/2].some(a=>segmentHitsBody({...body,rx:body.rx+width,ry:body.ry+width},b.x-Math.cos(a)*length,b.y-Math.sin(a)*length,b.x+Math.cos(a)*length,b.y+Math.sin(a)*length)))hit(player,b,enemy,s.explosionMultiplier);}
 }
 function update(delta,player,viewport){const weapon=player.attackSlots?.find(w=>w?.id==='serve');if(!weapon){reset();return;}if(owner!==player){reset();owner=player;}if(!(delta>0))return;
  const body=getCombatHitbox(player,false),view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};let left=delta,index=null;
  while(left>1e-8){if(enabled&&cooldown<=1e-8){launch(player,weapon);cooldown=attackTimeFormula(serveLevelStats(weapon.level).interval*(player.tuningParts?stationaryWeaponIntervalScale(player):1),ensureCombatStats(player).hastePercent);}
   const dt=Math.min(left,1/120,enabled&&cooldown>1e-8?cooldown:1/120);left-=dt;time+=dt;cooldown=Math.max(0,cooldown-dt);
   for(let i=blasts.length-1;i>=0;i--){blasts[i].age+=dt;if(blasts[i].age>=s.blastDuration)blasts.splice(i,1);}
   if(!balls.length)continue;if(!index)index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
   for(let i=balls.length-1;i>=0;i--){const b=balls[i],from={x:b.x,y:b.y};b.age+=dt;b.rotation+=dt*5;
    const x=serveBounce(b.x+b.vx*dt,b.vx,view.x+b.radius,view.x+view.width-b.radius),y=serveBounce(b.y+b.vy*dt,b.vy,view.y+b.radius,view.y+view.height-b.radius);b.x=x.position;b.vx=x.velocity;b.y=y.position;b.vy=y.velocity;
    for(const enemy of index.querySegment(from,b,b.radius)){if(!getEnemy(enemy.id)||time-(b.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8)continue;const t=getEnemyHurtbox(enemy);if(!segmentHitsBody({...t,rx:t.rx+b.radius,ry:t.ry+b.radius},from.x,from.y,b.x,b.y))continue;b.hits.set(enemy.id,time);if(hit(player,b,enemy)===false)continue;if(--b.hitsLeft<=0)break;}
    if(b.hitsLeft<=0||b.age>=(b.duration??s.duration)-1e-8){explode(player,b,view);balls.splice(i,1);}
   }
  }
 }
 function draw(context,camera){
  for(const b of balls){context.save();context.translate(b.x-camera.x,b.y-camera.y);context.rotate(b.rotation);if(sprite?.complete&&sprite.naturalWidth)context.drawImage(sprite,63,36,180,182,-b.radius,-b.radius,b.radius*2,b.radius*2);else {context.fillStyle='#f5d981';context.beginPath();context.arc(0,0,b.radius,0,Math.PI*2);context.fill();}context.restore();}
  for(const e of blasts)drawServeExplosion(context,camera,explosionSprite,e);

 }
 return {getAuraSources(){return balls;},ready,cast,update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);},get shotsFired(){return shots;},get projectileCount(){return balls.length;},get explosionCount(){return blasts.length;},get burstsFired(){return burstCount;}};
}

/** Seven columns: center 48px, horizontal arm 44px, terminal flame 42px. */
export function drawServeExplosion(context,camera,sheet,effect){
 if(!sheet?.complete||!sheet.naturalWidth||effect.age<0||effect.age>=serveSettings.blastDuration)return;
 const frame=Math.min(6,Math.floor(effect.age/serveSettings.blastDuration*7)),sx=frame*48;
 const halfLength=effect.halfLength??serveSettings.blastLength*effect.scale/2,thickness=effect.thickness??serveSettings.blastWidth*effect.scale;
 const tileScale=thickness/44,capWidth=48*tileScale,centerSize=48*tileScale;
 context.save();context.translate(effect.x-camera.x,effect.y-camera.y);context.imageSmoothingEnabled=false;
 // Four arms use the same frame and meet beneath one center tile.
 for(let i=0;i<4;i++){
  context.save();context.rotate((effect.rotation??Math.PI/4)+i*Math.PI/2);
  context.drawImage(sheet,sx,48,48,44,0,-thickness/2,Math.max(0,halfLength-capWidth/2),thickness);
  context.drawImage(sheet,sx,92,48,42,halfLength-capWidth,-42*tileScale/2,capWidth,42*tileScale);
  context.restore();
 }
 context.rotate(effect.rotation??Math.PI/4);
 context.drawImage(sheet,sx,0,48,48,-centerSize/2,-centerSize/2,centerSize,centerSize);
 context.restore();
}
