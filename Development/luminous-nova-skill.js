import { luminousNovaSkillSettings as skill, luminousNovaSettings, damageRules } from './game-config.js';
import { totalCharacterATK, rollAttackDamage } from './combat-stats.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { onEnemyDamage, getAllEnemies, damageEnemy } from './world-state.js';
import { getLuminousNova, luminousNovaHits, drawLuminousPlasma } from './luminous-nova.js';
import { drawFiringRings } from './firing-rings.js';

const buffKey='luminous-nova-ex';

/** Banked bonus only: no extra ATK or critical roll can exceed this component's cap. */
export function luminousNovaFinisherDamage(damageDealt,player) {
  const baseAttack=damageRules.baseScale*totalCharacterATK(player)/100;
  return Math.max(0,Math.min(Math.round(damageDealt*skill.damageFraction),Math.floor(baseAttack*skill.attackCapMultiplier)));
}

/** Nominal281% ATK before the normal damage roll; the banked extra is calculated separately. */
export function luminousNovaFinisherBaseDamage(player) {
  return Math.max(0,Math.round(damageRules.baseScale*skill.finisherAttackMultiplier*totalCharacterATK(player)/100));
}

/** Own the25s aura, temporary stats, accepted-damage bank and charged finishing shot. */
export function createLuminousNovaSkill({random=Math.random}={}) {
  let state=null;
  const image=new Image();image.src='../sprites/attacks/Weapon_Icon_Kei.png';const ready=image.decode();
  function removeBuff(){if(state?.owner.combatBuffs)delete state.owner.combatBuffs[buffKey];}
  function reset(){removeBuff();state=null;}
  const unsubscribe=onEnemyDamage(({source,damage})=>{
    if(state?.phase==='aura'&&source===state.owner&&Number.isFinite(damage))state.damageDealt+=Math.max(0,damage);
  });
  function cast(player,angle,getAngle=()=>angle) {
    reset();player.combatBuffs??={};
    player.combatBuffs[buffKey]={damageBonusMultiplier:skill.damageBonus,critPercent:skill.critBonus};
    state={owner:player,phase:'aura',elapsed:0,damageDealt:0,angle,getAngle,hits:new Set()};
  }
  /** Advance on simulation time only, so menus freeze both the buff and the charge. */
  function update(delta,player) {
    if(!state)return;
    if(state.owner!==player||!getLuminousNova(player)){reset();return;}
    let remaining=Math.max(0,delta);
    while(state&&remaining>1e-8) {
      const duration=state.phase==='aura'?skill.duration:state.phase==='opening'?skill.openingSeconds:
        state.phase==='charge'?skill.chargeSeconds:skill.projectileSeconds;
      const step=Math.min(remaining,Math.max(0,duration-state.elapsed));state.elapsed+=step;remaining-=step;
      if(state.burst)state.burst.elapsed+=step;
      if(state.phase==='opening'||state.phase==='charge')state.angle=state.getAngle();
      if(state.phase==='firing') {
        const from={x:state.x,y:state.y};
        state.x+=Math.cos(state.launchAngle)*skill.projectileSpeed*step;
        state.y+=Math.sin(state.launchAngle)*skill.projectileSpeed*step;
        for(const target of getAllEnemies()) {
          if(state.hits.has(target.id)||!luminousNovaHits(target,from,state,skill.projectileDiameter/2*luminousNovaSettings.bloomRadiusScale))continue;
          state.hits.add(target.id);
          const hit=rollAttackDamage(state.owner,skill.finisherAttackMultiplier,random,{target});
          damageEnemy(target.id,hit.damage,state.owner,hit.type);
        }
      }
      if(state.elapsed<duration-1e-8)break;
      if(state.phase==='aura') {
        removeBuff();state.damage=luminousNovaFinisherDamage(state.damageDealt,player);state.phase='opening';state.elapsed=0;
        const center=getCombatHitbox(player,false);state.burst={x:center.x,y:center.y,elapsed:0};
        // Release the stored charge radially; it is separate from the aimed281% ATK bullet.
        if(state.damage>0)for(const enemy of getAllEnemies()) {
          const body=getEnemyHurtbox(enemy);
          if(Math.hypot(body.x-center.x,body.y-center.y)<=skill.aoeRadius+Math.max(body.rx,body.ry))
            damageEnemy(enemy.id,state.damage,player,'normal');
        }
      } else if(state.phase==='opening'){state.phase='charge';state.elapsed=0;}
      else if(state.phase==='charge') {
        const body=getCombatHitbox(player,false),distance=body.rx+skill.muzzleGap+skill.projectileFormationGap;
        state.angle=state.getAngle();state.launchAngle=state.angle;state.projectileActive=true;
        state.x=body.x+Math.cos(state.angle)*distance;state.y=body.y+Math.sin(state.angle)*distance;
        state.launchX=state.x;state.launchY=state.y;
        state.phase='firing';state.elapsed=0;
      } else reset();
    }
  }
  /** Preview the finisher radius and remaining aura time beneath rising potion-like motes. */
  function drawAura(context,camera) {
    if(!state||state.phase!=='aura')return;
    const player=state.owner,size=player.spriteSize||89.6;
    const fade=Math.max(0,Math.min(1,state.elapsed/.25,(skill.duration-state.elapsed)/.35));
    const body=getCombatHitbox(player,false);
    context.save();context.translate(body.x-camera.x,body.y-camera.y);
    // The filled range remains fixed; only the timer ring contracts toward the player.
    context.globalAlpha=fade;
    context.fillStyle='rgba(255,105,205,.07)';
    context.beginPath();context.arc(0,0,skill.aoeRadius,0,Math.PI*2);context.fill();
    context.strokeStyle='rgba(255,155,225,.25)';context.lineWidth=1;
    context.stroke();
    const remaining=Math.max(0,1-state.elapsed/skill.duration);
    context.strokeStyle='rgba(255,120,215,.7)';context.lineWidth=2;
    context.beginPath();context.arc(0,0,skill.aoeRadius*remaining,0,Math.PI*2);context.stroke();
    // Spread a small, fixed number of motes across the range, rising off the overlay.
    // Staggered lifetimes avoid bursts; transparent gradients avoid expensive blur filters.
    context.globalCompositeOperation='lighter';
    for(let i=0;i<28;i++) {
      const lifetime=1.8+(i%5)*.23;
      const t=(state.elapsed/lifetime+i*.61803398875)%1;
      const angle=i*2.39996323;
      const distance=skill.aoeRadius*Math.sqrt((i+.5)/28);
      const x=Math.cos(angle)*distance+Math.sin(t*4+i)*4;
      const y=Math.sin(angle)*distance-t*28;
      const radius=(1.3+(i%3)*.45)*(1-t*.5);
      context.globalAlpha=fade*Math.sin(Math.PI*t)*.42;
      const mote=context.createRadialGradient(x,y,0,x,y,radius*3);
      mote.addColorStop(0,'rgba(255,235,253,.9)');mote.addColorStop(.3,'rgba(255,145,225,.6)');
      mote.addColorStop(1,'rgba(255,95,210,0)');
      context.fillStyle=mote;context.beginPath();context.arc(x,y,radius*3,0,Math.PI*2);context.fill();
    }
    context.restore();
    context.save();context.translate(player.x-camera.x,player.y-camera.y);
    context.globalCompositeOperation='lighter';
    for(let i=0;i<14;i++) {
      const lifetime=1.2+(i%4)*.17;
      const t=(state.elapsed/lifetime+i*.61803398875)%1;
      const x=Math.sin(i*2.39996)*size*.38+Math.sin(t*4+i)*size*.045;
      const y=size*.4-t*size*1.05;
      const radius=(1.2+(i%3)*.45)*(1-t*.45);
      context.globalAlpha=fade*Math.sin(Math.PI*t)*.7;
      const glow=context.createRadialGradient(x,y,0,x,y,radius*3);
      glow.addColorStop(0,'rgba(255,235,253,.95)');glow.addColorStop(.3,'rgba(255,145,225,.65)');
      glow.addColorStop(1,'rgba(255,95,210,0)');
      context.fillStyle=glow;context.beginPath();context.arc(x,y,radius*3,0,Math.PI*2);context.fill();
    }
    context.restore();
  }
  /** A brief expanding pink ring marks the stored charge's player-centered AoE. */
  function drawBurst(context,camera) {
    if(!state?.burst)return;
    const burst=state.burst,t=Math.min(1,burst.elapsed/skill.aoeVisualSeconds);if(t>=1)return;
    context.save();context.translate(burst.x-camera.x,burst.y-camera.y);
    context.globalCompositeOperation='lighter';context.globalAlpha=(1-t)**2*.45;
    const radius=skill.aoeRadius*(.25+.75*(1-(1-t)**3));
    const glow=context.createRadialGradient(0,0,radius*.7,0,0,radius);
    glow.addColorStop(0,'rgba(255,90,200,0)');glow.addColorStop(.85,'rgba(255,130,220,.3)');glow.addColorStop(1,'rgba(255,220,245,.65)');
    context.fillStyle=glow;context.strokeStyle='#ffb6ec';context.lineWidth=3;context.shadowColor='#ff70d5';context.shadowBlur=12;
    context.beginPath();context.arc(0,0,radius,0,Math.PI*2);context.fill();context.stroke();context.restore();
  }
  /** Fade the gun out from behind the player, charge its muzzle, then retract after firing. */
  function draw(context,camera) {
    drawAura(context,camera);drawBurst(context,camera);if(!state||state.phase==='aura')return;
    const body=getCombatHitbox(state.owner,false),smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
    const progress=state.phase==='opening'?smooth(state.elapsed/skill.openingSeconds):state.phase==='firing'?1-smooth(state.elapsed/skill.returnSeconds):1;
    if(image.naturalWidth&&progress>0) {
      // Start tucked behind the player, then slide outward while fading into view.
      const targetOffset=body.rx+skill.muzzleGap-skill.weaponLength/2;
      const offset=-skill.weaponLength*.35*(1-progress)+targetOffset*progress,height=skill.weaponLength*image.naturalHeight/image.naturalWidth;
      context.save();context.translate(body.x-camera.x,body.y-camera.y);context.rotate(state.phase==='firing'?state.launchAngle:state.angle);context.globalAlpha=progress;
      context.shadowColor='#ff90de';context.shadowBlur=12;context.drawImage(image,offset-skill.weaponLength/2,-height/2,skill.weaponLength,height);
      if(state.phase==='charge') {
        context.globalCompositeOperation='lighter';
        const radius=skill.projectileDiameter/2*(.2+.8*smooth(state.elapsed/skill.chargeSeconds));
        const formation=body.rx+skill.muzzleGap+skill.projectileFormationGap;
        const charge=context.createRadialGradient(formation,0,0,formation,0,radius*2);
        charge.addColorStop(0,'#fff4ff');charge.addColorStop(.4,'#ff95dfbb');charge.addColorStop(1,'#ff70d000');context.fillStyle=charge;
        context.beginPath();context.arc(formation,0,radius*2,0,Math.PI*2);context.fill();
        // Deterministic jagged arcs crawl from the gun into its muzzle charge.
        // Two unfiltered strokes supply a bright spine and a soft-looking pink electrical envelope.
        const tick=Math.floor(state.elapsed*18),muzzle=formation;
        context.shadowBlur=0;
        for(let arc=0;arc<5;arc++) {
          const side=arc%2?1:-1,start=muzzle-skill.weaponLength*(.25+.12*arc);
          context.beginPath();context.moveTo(start,side*height*.3);
          for(let segment=1;segment<=7;segment++) {
            const t=segment/7;
            const jitter=Math.sin(tick*7.13+arc*13.7+segment*9.3);
            context.lineTo(start+(muzzle-start)*t,segment===7?0:side*height*.3*(1-t)+jitter*(5+radius*.35));
          }
          context.strokeStyle='rgba(255,90,210,.25)';context.lineWidth=5;context.stroke();
          context.strokeStyle='rgba(255,225,253,.85)';context.lineWidth=1;context.stroke();
        }
      }
      context.restore();
    }
    if(state.phase==='firing'&&state.projectileActive) {
      drawLuminousPlasma(context,camera,{...state,age:state.elapsed},skill.projectileDiameter,skill.projectileSeconds);
      // Muzzle-anchored impact rings spread into a widening cone, independent of bullet travel.
      const muzzleDistance=body.rx+skill.muzzleGap;
      drawFiringRings(context,body.x-camera.x+Math.cos(state.launchAngle)*muzzleDistance,
        body.y-camera.y+Math.sin(state.launchAngle)*muzzleDistance,state.launchAngle,state.elapsed,skill.projectileDiameter);

    }
  }
  return {ready,cast,update,draw,reset,dispose(){reset();unsubscribe();},
    get auraActive(){return state?.phase==='aura';},
    get active(){return Boolean(state);},get phase(){return state?.phase||'idle';},
    get damageDealt(){return state?.damageDealt||0;},get finisherDamage(){return state?.damage||0;},
    get finishing(){return Boolean(state&&state.phase!=='aura'&&(state.phase!=='firing'||state.elapsed<skill.returnSeconds));}};
}
