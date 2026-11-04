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
  function reset(){bullets=[];owner=null;cooldown=0;shots=0;gaps=[];shotIndex=0;}
  function update(delta,player,aim=0,viewport=null) {
    if(!player.attackSlots?.some(w=>w?.id==='princess-key')){reset();return;}
    if(owner!==player){reset();owner=player;}
    if((!enabled&&exMode==='normal')||delta<=0)return;
    const body=getCombatHitbox(player,false);
    const view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
    let remaining=delta;
    while(remaining>1e-8) {
      if(cooldown<=1e-8) {
        const body=getCombatHitbox(player,false);
        if(shotIndex===0) {
          // Positive randomized gaps sum to exactly one base cycle, preserving total fire rate.
          const weights=Array.from({length:settings.attackCount},()=>.7+random()*.6);
          const total=weights.reduce((sum,value)=>sum+value,0);
          gaps=weights.map(value=>settings.interval*value/total/(exMode==='beam' ? settings.exFireRateMultiplier : 1));
        }
        {
          const angle=aim+(random()-.5)*settings.spreadRadians*(exMode==='beam'?settings.exSpreadMultiplier:1);
          const dx=Math.cos(angle),dy=Math.sin(angle);
          const offset=1/Math.hypot(dx/body.rx,dy/body.ry)+3+settings.diameter*1.8;
          bullets.push({x:body.x+dx*offset,y:body.y+dy*offset,angle,color:exMode==='beam'?'blue':'pink',
            pierceLimit:exMode==='beam'?Infinity:settings.hitLimit,speed:settings.speed,age:0,hits:new Map(),hitCount:0});shots++;
        }
        cooldown=gaps[shotIndex];shotIndex=(shotIndex+1)%settings.attackCount;
      }
      const step=Math.min(remaining,cooldown,1/60);
      const index=createEnemySpatialIndex(getAllEnemies(),getEnemyHurtbox);
      for(let i=bullets.length-1;i>=0;i--) {
        const bullet=bullets[i],from={x:bullet.x,y:bullet.y},dt=step;
        bullet.age+=dt;bullet.x+=Math.cos(bullet.angle)*settings.speed*dt;bullet.y+=Math.sin(bullet.angle)*settings.speed*dt;
        for(const enemy of index.querySegment(from,bullet,settings.diameter*1.8)) {
          if(bullet.hitCount>=bullet.pierceLimit)break;
          if(bullet.age-(bullet.hits.get(enemy.id)??-Infinity)<settings.hitCooldown||!luminousNovaHits(enemy,from,bullet,settings.diameter*1.8))continue;
          bullet.hits.set(enemy.id,bullet.age);bullet.hitCount++;
          const hit=rollAttackDamage(player,totalWeaponDamage(player,'princess-key',settings.damageMultiplier,[],{projectileCount:4,hitCooldownFrames:15}),random,{target:enemy});
          const landed=damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,damageGroup:'princess-key'}),living=getEnemy(enemy.id);
          if(landed!==false&&living)applySkillControl(living,Math.cos(bullet.angle)*settings.knockbackSpeed*settings.knockbackSeconds,
            Math.sin(bullet.angle)*settings.knockbackSpeed*settings.knockbackSeconds,settings.knockbackSeconds,settings.knockbackSeconds);
        }
        if(princessBulletOffscreen(bullet,view)||bullet.hitCount>=bullet.pierceLimit)bullets.splice(i,1);
      }
      remaining-=step;cooldown=Math.max(0,cooldown-step);
    }
  }
  return {ready:Promise.resolve(),reset,update,
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
    draw(context,camera){for(const bullet of bullets)drawLuminousPlasma(context,camera,bullet,settings.diameter,Infinity);},
    setAutoattackEnabled(value){enabled=Boolean(value);if(!enabled)bullets=[];},
    get shotsFired(){return shots;},get projectileCount(){return bullets.length;}};
}

/** Despawn only after the complete head bloom and continuous tail clear the current camera. */
export function princessBulletOffscreen(bullet,view) {
  const radius=settings.diameter/2,padding=radius*luminousNovaSettings.bloomRadiusScale;
  const length=Math.min(radius*(1+luminousNovaSettings.trailLengthRatio),settings.speed*bullet.age);
  const tailX=bullet.x-Math.cos(bullet.angle)*length,tailY=bullet.y-Math.sin(bullet.angle)*length;
  return Math.max(bullet.x,tailX)+padding<view.x||Math.min(bullet.x,tailX)-padding>view.x+view.width||
    Math.max(bullet.y,tailY)+padding<view.y||Math.min(bullet.y,tailY)-padding>view.y+view.height;
}
