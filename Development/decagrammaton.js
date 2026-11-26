import { weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import { luminousNovaSettings } from './game-config.js';
import { rollAttackDamage, totalWeaponDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox } from './combat-hitboxes.js';
import { createEnemySpatialIndex } from './enemy-spatial-index.js';
import { luminousNovaHits, drawLuminousPlasma, rememberPlasmaTrail } from './luminous-nova.js';
import { applySkillControl } from './enemy-control.js';

export const decagrammatonSettings={interval:7/60,attackCount:3,speed:15*60,knockbackSeconds:5/60,knockbackSpeed:3*60,
  blue:{damage:.6,hitLimit:7,hitCooldown:15/60,duration:40/60,area:2,sizeScale:.8,fadeOutSeconds:.12},
  pink:{damage:.9,hitLimit:3,hitCooldown:1,duration:40/60,area:1.25}};
export function createDecagrammatonWeapon(){return {id:'decagrammaton',name:'Protocol SUPERNOVA',level:1,maxLevel:1,isSynergy:true,isSuperSynergy:true,
  exSkill:true,icon:'../sprites/attacks/protocolsupernova.png',consumedWeaponIds:['princess-key','aris-laser','luminous-nova'],consumedItemIds:['malkuth-hat']};}

/** Three primary blue shots per cycle, each paired with one secondary pink shot. */
export function createDecagrammatonAttack({random=Math.random}={}) {
  let bullets=[],owner=null,cooldown=0,enabled=true,shots=0,shotIndex=0,gaps=[],exSpray=false;
  const settings=decagrammatonSettings;
  function reset(){bullets=[];owner=null;cooldown=0;shots=0;shotIndex=0;gaps=[];}
  function update(delta,player,aim=0,viewport=null){
    if(!player.attackSlots?.some(w=>w?.id==='decagrammaton')){reset();return;}
    if(owner!==player){reset();owner=player;}
    if(delta<=0)return;
    const body=getCombatHitbox(player,false),view=viewport||{x:body.x-640,y:body.y-360,width:1280,height:720};
    let left=delta;
    while(left>1e-8){
      const enemies=getAllEnemies();
      if(enabled&&!exSpray&&cooldown<=1e-8){
        if(shotIndex===0){
          const weights=Array.from({length:settings.attackCount*2},()=>.7+random()*.6);
          const total=weights.reduce((sum,value)=>sum+value,0);
          gaps=weights.map(value=>settings.interval*value/total);
        }
        cooldown=gaps[shotIndex];
        const candidates=enemies.filter(enemy=>{const b=getEnemyHurtbox(enemy);return b.x+b.rx>=view.x&&b.x-b.rx<=view.x+view.width&&b.y+b.ry>=view.y&&b.y-b.ry<=view.y+view.height;});
        // Choose among targets near the aim line as well as surrounding enemies.
        const aimed=candidates.slice().sort((a,b)=>{
          const score=e=>{const p=getEnemyHurtbox(e);return Math.abs(Math.atan2(Math.sin(Math.atan2(p.y-body.y,p.x-body.x)-aim),Math.cos(Math.atan2(p.y-body.y,p.x-body.x)-aim)));};
          return score(a)-score(b);
        })[0];
        {
          const target=shotIndex===0?aimed:candidates[Math.min(candidates.length-1,Math.floor(random()*candidates.length))];
          {
            const color=shotIndex%2===0?'blue':'pink';
            const spec=settings[color],targetBody=color==='blue'&&target?getEnemyHurtbox(target):null;
            // Resolve the actual firing direction before placing the muzzle on the player's edge.
            const launchAim=targetBody&&Math.hypot(targetBody.x-body.x,targetBody.y-body.y)>1e-8
              ?Math.atan2(targetBody.y-body.y,targetBody.x-body.x):aim;
            const angle=launchAim+(random()-.5)*12*Math.PI/180;
            const combatDiameter=luminousNovaSettings.bulletDiameter*spec.area*(spec.sizeScale??1)*weaponSizeMultiplier(player);
            const diameter=combatDiameter;
            const offset=1/Math.hypot(Math.cos(angle)/body.rx,Math.sin(angle)/body.ry)+luminousNovaSettings.muzzleGap+diameter/2*luminousNovaSettings.bloomRadiusScale;
            bullets.push({x:body.x+Math.cos(angle)*offset,y:body.y+Math.sin(angle)*offset,angle,color,diameter,combatDiameter,fadeOutSeconds:spec.fadeOutSeconds,
              target:color==='blue'?target?.id:null,orbit:random()*Math.PI*2,age:0,speed:settings.speed,trailSpeed:luminousNovaSettings.projectileSpeed*(color==='blue'?diameter/luminousNovaSettings.bulletDiameter:1),accelerating:color!=='blue',hits:new Map(),hitCount:0});shots++;
          }
        }
      shotIndex=(shotIndex+1)%(settings.attackCount*2);
      }
      const step=Math.min(left,1/60,enabled&&!exSpray&&cooldown>1e-8?cooldown:1/60);left-=step;cooldown=Math.max(0,cooldown-step);
      const index=createEnemySpatialIndex(enemies,getEnemyHurtbox);
      for(let i=bullets.length-1;i>=0;i--){
        const b=bullets[i],spec=settings[b.color],from={x:b.x,y:b.y};b.age+=step;
        const target=b.target?getEnemy(b.target):null;
        // A lost target releases homing; keep the last heading for the remaining lifetime.
        if(b.target&&(!target||target.hp<=0))b.target=null;
        if(target&&b.target){
          const t=getEnemyHurtbox(target),radius=Math.max(t.rx,t.ry)*.65*weaponSizeMultiplier(player);
          const near=Math.hypot(b.x-t.x,b.y-t.y)<radius+settings.speed*step*2;
          if(near){b.orbit+=step*14;const x=t.x+Math.cos(b.orbit)*radius,y=t.y+Math.sin(b.orbit)*radius;
            b.angle=Math.atan2(y-b.y,x-b.x);b.x=x;b.y=y;
          }else {b.angle=Math.atan2(t.y-b.y,t.x-b.x);b.x+=Math.cos(b.angle)*settings.speed*step;b.y+=Math.sin(b.angle)*settings.speed*step;}
        }else {b.x+=Math.cos(b.angle)*settings.speed*step;b.y+=Math.sin(b.angle)*settings.speed*step;}
        if(b.color==='blue')rememberPlasmaTrail(b,from,b.diameter/2*(1+luminousNovaSettings.trailLengthRatio));
        for(const enemy of index.querySegment(from,b,b.combatDiameter*1.8)){
          if(b.hitCount>=spec.hitLimit)break;
          if(b.age-(b.hits.get(enemy.id)??-Infinity)<spec.hitCooldown||!luminousNovaHits(enemy,from,b,b.combatDiameter*1.8))continue;
          b.hits.set(enemy.id,b.age);b.hitCount++;
          const hit=rollAttackDamage(player,totalWeaponDamage(player,'decagrammaton',spec.damage,[],{projectileCount:settings.attackCount,hitCooldownFrames:spec.hitCooldown*60}),random,{target:enemy});
          const landed=damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true,damageGroup:'decagrammaton'}),living=getEnemy(enemy.id);
          if(landed!==false&&living)applySkillControl(living,Math.cos(b.angle)*settings.knockbackSpeed*settings.knockbackSeconds*weaponKnockbackMultiplier(player),Math.sin(b.angle)*settings.knockbackSpeed*settings.knockbackSeconds*weaponKnockbackMultiplier(player),settings.knockbackSeconds,settings.knockbackSeconds);
        }
        if(b.age>=spec.duration||b.hitCount>=spec.hitLimit)bullets.splice(i,1);
      }
    }
  }
  return {getAuraSources(){return bullets;},ready:Promise.resolve(),update,reset,draw(context,camera){for(const b of bullets)drawLuminousPlasma(context,camera,b,b.diameter,decagrammatonSettings[b.color].duration);},
    setExMode(active,shooting){exSpray=Boolean(active&&shooting);},
    setAutoattackEnabled(value){enabled=Boolean(value);},get projectileCount(){return bullets.length;},get shotsFired(){return shots;}};
}
