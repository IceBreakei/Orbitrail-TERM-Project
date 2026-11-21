import { weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import { badCookingSettings, badCookingLevelStats } from './game-config.js';
import { totalWeaponDamage, rollAttackDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { applySkillControl } from './enemy-control.js';

/** Persistent miasma: renewal replaces the old field and never overlaps another copy. */
export function createBadCookingAttack({random=Math.random}={}){
  let owner=null,active=false,enabled=true,elapsed=0,cycle=0,time=0,hits=new Map(),mist=null;
  function reset(){owner=null;active=false;elapsed=0;cycle=0;time=0;hits.clear();}
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
    if(!active||!owner)return;
    if(!mist){mist=document.createElement('canvas');mist.width=mist.height=256;const c=mist.getContext('2d'),g=c.createRadialGradient(128,128,0,128,128,128);
      g.addColorStop(0,'rgba(192,143,231,.13)');g.addColorStop(.88,'rgba(192,143,231,.13)');g.addColorStop(.98,'rgba(192,143,231,.1)');g.addColorStop(1,'rgba(192,143,231,0)');c.fillStyle=g;c.fillRect(0,0,256,256);}
    const body=getCombatHitbox(owner,false),weapon=owner.attackSlots.find(w=>w?.id==='bad-cooking');
    const radius=badCookingLevelStats(weapon?.level).radius*weaponSizeMultiplier(owner),x=body.x-camera.x,y=body.y-camera.y;
    context.save();context.globalAlpha=Math.min(1,cycle/.3);
    context.drawImage(mist,x-radius,y-radius,radius*2,radius*2);
    context.beginPath();context.arc(x,y,radius,0,Math.PI*2);
    context.lineWidth=1.25;context.strokeStyle='rgba(187,124,227,.38)';context.stroke();
    // Fixed particle seeds: softly fade in, rise vertically, then fade out and repeat.
    // Only their phase changes; no orbiting, expanding cloud blobs or per-frame allocations.
    for(let i=0;i<32;i++){
      const phase=(cycle/(1.5+(i%5)*.15)+i*.61803398875)%1;
      const angle=i*2.399963,r=radius*Math.sqrt((i+.5)/32)*.76;
      const px=Math.cos(angle)*r,py=Math.sin(angle)*r;
      const rise=Math.min(radius*.36,52),size=4+i%3;
      context.fillStyle=`rgba(192,103,238,${.85*Math.sin(Math.PI*phase)})`;
      context.fillRect(x+px-size/2,y+py-rise*phase-size/2,size,size);
    }
    context.restore();
  }
  return {ready:Promise.resolve(),update,draw,reset,setAutoattackEnabled(value){enabled=Boolean(value);if(!enabled)active=false;},get active(){return active;}};
}
