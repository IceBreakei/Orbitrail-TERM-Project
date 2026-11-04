import { createArisAttack,supernovaBeamPhase } from './aris-weapon.js';
import { luminousNovaFinisherDamage } from './luminous-nova-skill.js';
import { luminousNovaSkillSettings,arisWeaponSettings,supernovaSkillSettings,princessKeySkillSettings as settings } from './game-config.js';
import { onEnemyDamage,getAllEnemies,damageEnemy } from './world-state.js';
import { getEnemyHurtbox } from './combat-hitboxes.js';
import { rollAttackDamage,totalWeaponDamage } from './combat-stats.js';

/** Gentle blue residue pulse, followed by an inward collapse at the four-second detonation. */
export function princessResiduePose(age) {
  const progress=Math.min(1,age/settings.residueSeconds);
  if(age>=settings.residueSeconds) {
    const t=Math.min(1,(age-settings.residueSeconds)/.4);
    return {radius:6+(settings.residueRadius-6)*(1-(1-t)**3),opacity:.24*(1-t)**2,exploded:true};
  }
  const collapse=Math.max(0,(age-(settings.residueSeconds-.4))/.4);
  return {radius:Math.max(1,24*(.96+.04*Math.sin(age*4))*(1-collapse*collapse)),
    opacity:.18*(1-progress*.5)*(.94+.06*Math.sin(age*4)),exploded:false};
}

/** Kei's temporary amplifier plus Supernova's aimable beam, with delayed impact residues. */
export function createPrincessKeySkill({random=Math.random}={}) {
  let state=null,residues=[];const buffKey='princess-key-ex';
  const weapon=player=>player.attackSlots?.find(w=>w?.id==='princess-key');
  const beam=createArisAttack({getWeapon:weapon,specialHitCooldown:settings.hitCooldown,
    rollSpecialDamage(player,target,multiplier) {
      const hit=rollAttackDamage(player,totalWeaponDamage(player,'princess-key',arisWeaponSettings.damageMultiplier,[],
        {projectileCount:1,hitCooldownFrames:settings.hitCooldown*60}),random,{target,damageMod:multiplier});
      hit.damage+=luminousNovaFinisherDamage(state?.damageDealt||0,player);return hit;
    },
    onSpecialHit(target,hit,player) {
      if(!state)return;
      const body=getEnemyHurtbox(target),charge=luminousNovaFinisherDamage(state?.damageDealt||0,player);
      // One residue per target per cast prevents rapid beam ticks creating thousands of effects.
      const existing=residues.find(r=>r.target===target&&r.cast===state);
      if(existing){existing.damage=Math.max(existing.damage,charge);return;}
      residues.push({target,cast:state,owner:player,x:body.x,y:body.y,age:0,damage:charge,exploded:false});
    }});
  beam.setAutoattackEnabled(false);
  const unsubscribe=onEnemyDamage(({source,damage})=>{
    if(state&&state.elapsed<settings.buffSeconds&&source===state.owner)state.damageDealt+=Math.max(0,damage);
  });
  function removeBuff(){if(state?.owner.combatBuffs)delete state.owner.combatBuffs[buffKey];}
  function reset(){removeBuff();state=null;residues=[];beam.reset();}
  function cast(player,angle,multiplier=1.5,getAngle=()=>angle) {
    reset();player.combatBuffs??={};player.combatBuffs[buffKey]={damageBonusMultiplier:luminousNovaSkillSettings.damageBonus,critPercent:luminousNovaSkillSettings.critBonus};
    state={owner:player,elapsed:0,damageDealt:0};beam.cast(player,angle,multiplier,getAngle);
  }
  /** Substep beam ticks and residue timers on simulation time, so pausing freezes everything. */
  function update(delta,player,aim=0) {
    if(state&&(state.owner!==player||!weapon(player))){reset();return;}
    let left=Math.max(0,delta);
    while(left>1e-8) {
      const step=Math.min(left,1/60);left-=step;
      if(state){state.elapsed+=step;if(state.elapsed>=settings.buffSeconds)removeBuff();beam.update(step,player,aim);}
      for(const residue of residues) {
        residue.age+=step;
        if(!residue.exploded&&residue.age>=settings.residueSeconds) {
          residue.exploded=true;
          for(const enemy of getAllEnemies()) {
            const body=getEnemyHurtbox(enemy);
            if(Math.hypot(body.x-residue.x,body.y-residue.y)<=settings.residueRadius+Math.max(body.rx,body.ry))
              damageEnemy(enemy.id,residue.damage,residue.owner,'normal');
          }
        }
      }
      residues=residues.filter(r=>r.age<settings.residueSeconds+.4);
      if(state&&state.elapsed>=settings.buffSeconds&&!residues.length){removeBuff();state=null;beam.reset();}
    }
  }
  function draw(context,camera) {
    beam.draw(context,camera);
    if(state&&state.elapsed<settings.buffSeconds) {
      const p=state.owner,size=p.spriteSize||89.6;
      context.save();context.globalCompositeOperation='lighter';
      for(let i=0;i<16;i++) {
        const t=(state.elapsed/1.8+i*.618)%1,x=p.x-camera.x+Math.sin(i*2.4)*size*.4,y=p.y-camera.y+size*.4-t*size;
        context.globalAlpha=Math.sin(t*Math.PI)*.6;context.fillStyle=i%2?'#ff9de3':'#a0edff';
        context.beginPath();context.arc(x,y,2*(1-t*.5),0,Math.PI*2);context.fill();
      }
      context.restore();
    }
    for(const residue of residues) {
      const pose=princessResiduePose(residue.age),radius=pose.radius;
      context.save();context.translate(residue.x-camera.x,residue.y-camera.y);context.globalAlpha=pose.opacity;
      context.globalCompositeOperation='lighter';
      // Broad radial falloff supplies bloom without a blur pass per residue.
      const bloom=context.createRadialGradient(0,0,0,0,0,radius*2.3);
      bloom.addColorStop(0,'rgba(100,220,255,.55)');bloom.addColorStop(.28,'rgba(80,205,255,.4)');
      bloom.addColorStop(.48,'rgba(40,160,255,.2)');bloom.addColorStop(.72,'rgba(30,120,255,.06)');bloom.addColorStop(1,'rgba(30,110,255,0)');
      context.fillStyle=bloom;context.beginPath();context.arc(0,0,radius*2.3,0,Math.PI*2);context.fill();
      const glow=context.createRadialGradient(0,0,0,0,0,radius*1.4);
      // A filled light volume, with opacity decreasing continuously toward the outside.
      glow.addColorStop(0,'rgba(130,230,255,.95)');glow.addColorStop(.25,'rgba(95,210,255,.75)');
      glow.addColorStop(.5,'rgba(65,185,255,.45)');glow.addColorStop(.75,'rgba(45,160,255,.16)');
      glow.addColorStop(1,'rgba(40,140,255,0)');
      context.fillStyle=glow;context.beginPath();context.arc(0,0,radius*1.4,0,Math.PI*2);context.fill();
      // A restrained edge defines the orb while the filled center remains its brightest part.
      context.strokeStyle='rgba(85,185,255,.35)';context.lineWidth=1;
      context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.stroke();
      context.restore();
    }
  }
  return {ready:beam.ready,cast,update,draw,reset,dispose(){reset();unsubscribe();},
    get casting(){return Boolean(state&&(!supernovaBeamPhase(state.elapsed).finished||supernovaBeamPhase(state.elapsed).beamAge<supernovaSkillSettings.duration+settings.sprayTailSeconds));},
    get beamShooting(){return Boolean(state&&supernovaBeamPhase(state.elapsed).damaging);},
    get sprayActive(){const age=state?supernovaBeamPhase(state.elapsed).beamAge:-1;return age>=0&&age<supernovaSkillSettings.duration+settings.sprayTailSeconds;},
    get auraActive(){return Boolean(state&&state.elapsed<settings.buffSeconds);},get damageDealt(){return state?.damageDealt||0;},get residueCount(){return residues.length;}};
}
