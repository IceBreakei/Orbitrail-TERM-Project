import { weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import { badCookingSettings, badCookingLevelStats } from './game-config.js';
import { totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';
import { applySkillControl } from './enemy-control.js';

/** Persistent miasma: renewal replaces the old field and never overlaps another copy. */
export function createBadCookingAttack({random=Math.random}={}){
  let owner=null,active=false,enabled=true,elapsed=0,cycle=0,time=0,hits=new Map(),mist=null,exRemaining=0,exTime=0,exHits=new Map(),auraSources=[];
  function reset(){owner=null;active=false;elapsed=0;cycle=0;time=0;hits.clear();exRemaining=0;exTime=0;exHits.clear();auraSources=[];}
  function cast(player,duration=10){if(!player.attackSlots?.some(w=>w?.id==='bad-cooking'))return false;if(owner!==player){reset();owner=player;}exRemaining=duration;exTime=0;exHits.clear();return true;}
  function updateAuras(delta,player,sources=[]){
    if(!(delta>0))return;
    const weapon=player.attackSlots?.find(w=>w?.id==='bad-cooking');if(owner!==player||!weapon){exRemaining=0;auraSources=[];return;}
    if(exRemaining<=0){auraSources=[];return;}
    const step=Math.min(delta,exRemaining);exRemaining=Math.max(0,exRemaining-delta);exTime+=step;
    auraSources=sources.filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y));
    const stats=badCookingLevelStats(weapon.level),radius=stats.radius*weaponSizeMultiplier(player),enemies=getAllEnemies(),index=createEnemySpatialIndex(enemies,getEnemyHurtbox),live=new Set(enemies.map(e=>e.id));
    for(const id of exHits.keys())if(!live.has(id))exHits.delete(id);
    for(const source of auraSources)for(const enemy of index.querySegment(source,source,radius)){
      if(enemy.hp<=0||exTime-(exHits.get(enemy.id)??-Infinity)<stats.hitCooldown-1e-8)continue;
      const b=getEnemyHurtbox(enemy),dx=source.x-b.x,dy=source.y-b.y,d=Math.hypot(dx,dy),extent=d?1/Math.hypot(dx/d/b.rx,dy/d/b.ry):0;if(d>radius+extent)continue;
      exHits.set(enemy.id,exTime);const hit=rollAttackDamage(player,totalWeaponDamage(player,'bad-cooking',badCookingSettings.damage,stats.damageBonuses,{projectileCount:1,hitCooldownFrames:stats.hitCooldown*60}),random,{target:enemy,weaponId:'bad-cooking',skillAttack:true});
      damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,weaponId:'bad-cooking',skillAttack:true});
    }
    if(exRemaining<=0)auraSources=[];
  }
  function update(delta,player){
    const weapon=player.attackSlots?.find(w=>w?.id==='bad-cooking');
    if(!weapon){reset();return;}if(owner!==player){reset();owner=player;}
    if(delta<=0)return;if(!enabled){active=false;return;}
    active=true;elapsed=(elapsed+delta)%badCookingSettings.interval;cycle+=delta;
    const stats=badCookingLevelStats(weapon.level),radius=stats.radius*weaponSizeMultiplier(player);
    const body=getCombatHitbox(player,false);
    let left=delta;
    while(left>1e-8){const step=Math.min(left,1/60);left-=step;time+=step;
      const enemies=getAllEnemies(),liveIds=new Set(enemies.map(e=>e.id));
      for(const id of hits.keys())if(!liveIds.has(id))hits.delete(id);
      for(const enemy of enemies){
        if(time-(hits.get(enemy.id)??-Infinity)<stats.hitCooldown-1e-8)continue;
        const target=getEnemyHurtbox(enemy),dx=body.x-target.x,dy=body.y-target.y;
        // Closest point on the sprite hurtbox, rather than contact hitbox.
        const distance=Math.hypot(dx,dy),extent=distance?1/Math.hypot(dx/distance/target.rx,dy/distance/target.ry):0;
        if(distance>radius+extent)continue;
        hits.set(enemy.id,time);
        const hit=rollAttackDamage(player,totalWeaponDamage(player,'bad-cooking',badCookingSettings.damage,stats.damageBonuses,
          {projectileCount:1,hitCooldownFrames:stats.hitCooldown*60}),random,{target:enemy,weaponId:'bad-cooking'});
        const landed=damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true}),living=getEnemy(enemy.id);
        if(stats.knockback&&landed!==false&&living){const angle=Math.atan2(-dy,-dx),duration=badCookingSettings.knockbackSeconds;
          applySkillControl(living,Math.cos(angle)*badCookingSettings.knockbackSpeed*duration*weaponKnockbackMultiplier(player),Math.sin(angle)*badCookingSettings.knockbackSpeed*duration*weaponKnockbackMultiplier(player),duration,duration);}
      }
    }
  }
  function draw(context,camera){
    if((!active&&exRemaining<=0)||!owner)return;
    if(!mist){mist=document.createElement('canvas');mist.width=mist.height=256;const c=mist.getContext('2d'),g=c.createRadialGradient(128,128,0,128,128,128);
      g.addColorStop(0,'rgba(192,143,231,.13)');g.addColorStop(.88,'rgba(192,143,231,.13)');g.addColorStop(.98,'rgba(192,143,231,.1)');g.addColorStop(1,'rgba(192,143,231,0)');c.fillStyle=g;c.fillRect(0,0,256,256);}
    const body=getCombatHitbox(owner,false),weapon=owner.attackSlots.find(w=>w?.id==='bad-cooking');
    const radius=badCookingLevelStats(weapon?.level).radius*weaponSizeMultiplier(owner),x=body.x-camera.x,y=body.y-camera.y;
    const fields=[...(active?[body]:[]),...(exRemaining>0?auraSources:[])];
    for(let field=0;field<fields.length;field++){const x=fields[field].x-camera.x,y=fields[field].y-camera.y;if(context.canvas&&(x+radius<0||y+radius<0||x-radius>context.canvas.width||y-radius>context.canvas.height))continue;
    context.save();context.globalAlpha=field===0&&active?Math.min(1,cycle/.3):Math.min(1,exRemaining/.25);
    context.drawImage(mist,x-radius,y-radius,radius*2,radius*2);
    context.beginPath();context.arc(x,y,radius,0,Math.PI*2);
    context.lineWidth=1.25;context.strokeStyle='rgba(187,124,227,.38)';context.stroke();
    // Fixed particle seeds: softly fade in, rise vertically, then fade out and repeat.
    // Only their phase changes; no orbiting, expanding cloud blobs or per-frame allocations.
    const particles=field===0&&active?32:8;for(let i=0;i<particles;i++){
      const phase=((cycle+exTime)/(1.5+(i%5)*.15)+i*.61803398875)%1;
      const angle=i*2.399963,r=radius*Math.sqrt((i+.5)/particles)*.76;
      const px=Math.cos(angle)*r,py=Math.sin(angle)*r;
      const rise=Math.min(radius*.36,52),size=4+i%3;
      context.fillStyle=`rgba(192,103,238,${.85*Math.sin(Math.PI*phase)})`;
      context.fillRect(x+px-size/2,y+py-rise*phase-size/2,size,size);
    }
    context.restore();}
  }
  return {ready:Promise.resolve(),cast,updateAuras,get exRemaining(){return exRemaining;},get auraCount(){return auraSources.length;},update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);if(!enabled)active=false;},get active(){return active;}};
}
