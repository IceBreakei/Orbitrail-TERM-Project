import { weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import {stationaryWeaponIntervalScale} from './tuning-parts.js';
import {startingWeaponAim} from './tuning-parts.js';
import {rgbTuningActive,rainbowTrailGradient} from './rgb-tuning.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';
import { princessKeySettings as settings, luminousNovaSettings } from './game-config.js';
import { rollAttackDamage, totalWeaponDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getEnemyHurtbox, getCombatHitbox } from './combat-hitboxes.js';
import { luminousNovaHits, drawLuminousPlasma } from './luminous-nova.js';
import { applySkillControl } from './enemy-control.js';

/** Stagger four independently critting rounds across each three-frame cycle; ignore Haste. */
export function createPrincessKeyAttack({random=Math.random}={}) {
  let bullets=[],owner=null,cooldown=0,enabled=true,shots=0,gaps=[],shotIndex=0,exMode='normal';
  let stationaryScale=1;
  function reset(){stationaryScale=1;bullets=[];owner=null;cooldown=0;shots=0;gaps=[];shotIndex=0;}
  function update(delta,player,aim=0,viewport=null) {
    const weapon=player.attackSlots?.find(w=>w?.id==='princess-key')||player.attackSlots?.find(w=>w?.id==='decagrammaton');
    if(!weapon){reset();return;}
    const decagrammaton=weapon.id==='decagrammaton';
    if(owner!==player){reset();owner=player;}
    const intervalScale=player.tuningParts?stationaryWeaponIntervalScale(player):1;
    if(intervalScale!==stationaryScale){cooldown*=intervalScale/stationaryScale;gaps=gaps.map(gap=>gap*intervalScale/stationaryScale);stationaryScale=intervalScale;}
    if(delta<=0)return;
    const emitting=(enabled||exMode==='beam')&&(!decagrammaton||exMode==='beam');
    if(player.tuningParts)aim=startingWeaponAim(player,weapon.id,aim);
    const body=getCombatHitbox(player,false);
    const view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
    let remaining=delta;
    while(remaining>1e-8) {
      if(emitting&&cooldown<=1e-8) {
        const body=getCombatHitbox(player,false);
        let sprayAim=aim;
        if(decagrammaton&&exMode==='beam'){
          // Steer the emitter; each round retains the original straight EX cone trajectory.
          let best=null,bestAngle=Infinity,bestDistance=Infinity;
          for(const enemy of getAllEnemies()){
            const target=getEnemyHurtbox(enemy);
            if(target.x+target.rx<view.x||target.x-target.rx>view.x+view.width||target.y+target.ry<view.y||target.y-target.ry>view.y+view.height)continue;
            const angle=Math.atan2(target.y-body.y,target.x-body.x),error=Math.abs(Math.atan2(Math.sin(angle-aim),Math.cos(angle-aim))),distance=Math.hypot(target.x-body.x,target.y-body.y);
            if(error<bestAngle-1e-8||Math.abs(error-bestAngle)<1e-8&&distance<bestDistance){best=angle;bestAngle=error;bestDistance=distance;}
          }
          if(best!==null)sprayAim=best;
        }
        if(shotIndex===0) {
          // Positive randomized gaps sum to exactly one base cycle, preserving total fire rate.
          const weights=Array.from({length:settings.attackCount},()=>.7+random()*.6);
          const total=weights.reduce((sum,value)=>sum+value,0);
          gaps=weights.map(value=>settings.interval*stationaryScale*value/total/(exMode==='beam' ? settings.exFireRateMultiplier : 1));
        }
        {
          const angle=sprayAim+(random()-.5)*settings.spreadRadians*(exMode==='beam'?settings.exSpreadMultiplier:1);
          const dx=Math.cos(angle),dy=Math.sin(angle);
          const offset=1/Math.hypot(dx/body.rx,dy/body.ry)+3+settings.diameter*weaponSizeMultiplier(player)*1.8;
          bullets.push({x:body.x+dx*offset,y:body.y+dy*offset,angle,diameter:settings.diameter*weaponSizeMultiplier(player),rainbowPhase:shots*.618,rainbow:player.tuningParts?rgbTuningActive(player):false,color:exMode==='beam'?'blue':'pink',
            skillAttack:exMode==='beam',pierceLimit:exMode==='beam'?Infinity:settings.hitLimit,speed:settings.speed,age:0,hits:new Map(),hitCount:0});shots++;
        }
        cooldown=gaps[shotIndex];shotIndex=(shotIndex+1)%settings.attackCount;
      }
      const step=Math.min(remaining,emitting?cooldown:1/60,1/60);
      const index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
      for(let i=bullets.length-1;i>=0;i--) {
        const bullet=bullets[i],from={x:bullet.x,y:bullet.y},dt=step;
        bullet.age+=dt;bullet.x+=Math.cos(bullet.angle)*settings.speed*dt;bullet.y+=Math.sin(bullet.angle)*settings.speed*dt;
        for(const enemy of index.querySegment(from,bullet,(bullet.diameter??settings.diameter)*1.8)) {
          if(bullet.hitCount>=bullet.pierceLimit)break;
          if(bullet.age-(bullet.hits.get(enemy.id)??-Infinity)<settings.hitCooldown||!luminousNovaHits(enemy,from,bullet,(bullet.diameter??settings.diameter)*1.8))continue;
          bullet.hits.set(enemy.id,bullet.age);bullet.hitCount++;
          const hit=rollAttackDamage(player,totalWeaponDamage(player,weapon.id,settings.damageMultiplier,[],{projectileCount:4,hitCooldownFrames:15}),random,{target:enemy,skillAttack:bullet.skillAttack});
          const landed=damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,damageGroup:'princess-key'}),living=getEnemy(enemy.id);
          if(landed!==false&&living)applySkillControl(living,Math.cos(bullet.angle)*settings.knockbackSpeed*settings.knockbackSeconds*weaponKnockbackMultiplier(player),
            Math.sin(bullet.angle)*settings.knockbackSpeed*settings.knockbackSeconds*weaponKnockbackMultiplier(player),settings.knockbackSeconds,settings.knockbackSeconds);
        }
        if(princessBulletOffscreen(bullet,view)||bullet.hitCount>=bullet.pierceLimit)bullets.splice(i,1);
      }
      remaining-=step;cooldown=Math.max(0,cooldown-step);
    }
  }
  return {getAuraSources(){return bullets;},ready:Promise.resolve(),reset,update,
    setExMode(active,shooting) {
      const next=active&&shooting?'beam':'normal';
      if(next===exMode)return;
      // Preserve all in-flight rounds and the current firing phase while changing new shots.
      const oldRate=exMode==='beam'?settings.exFireRateMultiplier:1;
      const newRate=next==='beam'?settings.exFireRateMultiplier:1;
      cooldown*=oldRate/newRate;gaps=gaps.map(gap=>gap*oldRate/newRate);
      exMode=next;
    },
    // Reuse Kei's actual plasma renderer: identical pink bloom and continuous tapered tail.
    draw(context,camera){const rainbow=Boolean(owner?.tuningParts&&rgbTuningActive(owner));for(const bullet of bullets){bullet.rainbow=rainbow;drawLuminousPlasma(context,camera,bullet,bullet.diameter??settings.diameter,Infinity);}},
    setAutoattackEnabled(value){enabled=Boolean(value);if(!enabled)bullets=[];},
    get shotsFired(){return shots;},get projectileCount(){return bullets.length;}};
}

/** Despawn only after the complete head bloom and continuous tail clear the current camera. */
export function princessBulletOffscreen(bullet,view) {
  const radius=(bullet.diameter??settings.diameter)/2,padding=radius*luminousNovaSettings.bloomRadiusScale;
  const length=Math.min(radius*(1+luminousNovaSettings.trailLengthRatio),settings.speed*bullet.age);
  const tailX=bullet.x-Math.cos(bullet.angle)*length,tailY=bullet.y-Math.sin(bullet.angle)*length;
  return Math.max(bullet.x,tailX)+padding<view.x||Math.min(bullet.x,tailX)-padding>view.x+view.width||
    Math.max(bullet.y,tailY)+padding<view.y||Math.min(bullet.y,tailY)-padding>view.y+view.height;
}
