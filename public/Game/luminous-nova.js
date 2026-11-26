import { weaponSizeMultiplier, weaponKnockbackMultiplier } from './game-config.js';
import {stationaryWeaponIntervalScale} from './tuning-parts.js';
import {startingWeaponAim} from './tuning-parts.js';
import {rgbTuningActive,rainbowTrailGradient,rainbowPlasmaColor} from './rgb-tuning.js';
import { luminousNovaSettings, attackTimeFormula } from './game-config.js';
import { ensureCombatStats, rollAttackDamage, totalWeaponDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { applySkillControl } from './enemy-control.js';

/** Equip Kei's automatic weapon and its independent aura EX skill. */
export function createLuminousNovaWeapon() {
  return {id:'luminous-nova',name:'Luminous Nova',level:1,maxLevel:luminousNovaSettings.maxLevel,
    icon:'../sprites/attacks/Weapon_Icon_Kei.png',iconRotation:-45,exSkill:true};
}
export function getLuminousNova(player) {return player.attackSlots?.find(weapon=>weapon?.id==='luminous-nova');}

/** Fire-rate bonuses are absolute multiples of the base cycle, never cumulative multipliers. */
export function luminousNovaLevelStats(player) {
  const level=Math.max(1,Math.min(7,getLuminousNova(player)?.level||1));
  const fireRate=1+Number(level>=3)+Number(level>=5)+Number(level>=7);
  return {level,fireRate,interval:luminousNovaSettings.attackInterval/fireRate,
    damageMultiplier:(level>=2?1.2:1)*(level>=4?1.3:1),knockback:level>=6};
}

/** Damage levels multiply base damage; flat enhancements split over the base-cycle projectile count. */
export function rollLuminousNovaDamage(player,random=Math.random,target) {
  const stats=luminousNovaLevelStats(player);
  return rollAttackDamage(player,totalWeaponDamage(player,'luminous-nova',luminousNovaSettings.damageMultiplier,
    [(stats.damageMultiplier-1)*100],{projectileCount:stats.fireRate,hitCooldownFrames:10}),random,{target});
}

/** Sweep the spherical head so fast plasma rounds cannot tunnel past enemies. */
export function luminousNovaHits(enemy,from,to,radius=luminousNovaSettings.bulletDiameter/2*luminousNovaSettings.bloomRadiusScale) {
  const body=getEnemyHurtbox(enemy);
  return segmentHitsBody({...body,rx:body.rx+radius,ry:body.ry+radius},from.x,from.y,to.x,to.y);
}

/** Independent aimed, unlimited-piercing automatic plasma weapon. */
export function createLuminousNovaAttack({random=Math.random}={}) {
  const s=luminousNovaSettings;
  let owner=null,cooldown=0,bullets=[],enabled=true,shots=0,skillFinishing=false;
  let stationaryScale=1;
  function reset(){stationaryScale=1;owner=null;cooldown=0;bullets=[];shots=0;}
  function fire(player,aim) {
    const origin=getCombatHitbox(player,false);
    // Follow the shared arrow/crosshair aim and keep that direction throughout this shot.
    const angle=player.tuningParts?startingWeaponAim(player,'luminous-nova',Number.isFinite(aim)?aim:0):(Number.isFinite(aim)?aim:0);
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const edge=1/Math.hypot(dx/origin.rx,dy/origin.ry);
    const diameter=s.bulletDiameter*weaponSizeMultiplier(player);
    const offset=edge+s.muzzleGap+diameter/2*s.bloomRadiusScale;
    if(bullets.length<s.maxProjectiles){bullets.push({x:origin.x+dx*offset,y:origin.y+dy*offset,angle,diameter,rainbowPhase:shots*.618,rainbow:player.tuningParts?rgbTuningActive(player):false,age:0,travel:0,accelerating:true,hits:new Map()});shots++;}
    return true;
  }
  /** Move and expire each shot independently; pierce all targets with a per-shot hit cooldown. */
  function advance(delta,player) {
    for(let i=bullets.length-1;i>=0;i--) {
      const bullet=bullets[i],step=Math.min(delta,s.duration-bullet.age),from={x:bullet.x,y:bullet.y};
      // Integrate the speed ramp analytically so acceleration is independent of frame rate.
      const distanceAt=age=>s.projectileSpeed*(age<s.accelerationSeconds?age*age/(2*s.accelerationSeconds):age-s.accelerationSeconds/2);
      const distance=distanceAt(bullet.age+step)-distanceAt(bullet.age);
      bullet.age+=step;bullet.travel+=distance;
      bullet.x+=Math.cos(bullet.angle)*distance;bullet.y+=Math.sin(bullet.angle)*distance;
      for(const enemy of getAllEnemies()) {
        if(bullet.age-(bullet.hits.get(enemy.id)??-Infinity)<s.hitCooldown-1e-8||!luminousNovaHits(enemy,from,bullet,(bullet.diameter??s.bulletDiameter)/2*s.bloomRadiusScale))continue;
        bullet.hits.set(enemy.id,bullet.age); // A missed hit cannot retry every frame.
        const hit=rollLuminousNovaDamage(player,random,enemy);
        const landed=damageEnemy(enemy.id,hit.damage,player,hit.type,{canMiss:true});
        const living=getEnemy(enemy.id);
        if(landed!==false&&living&&luminousNovaLevelStats(player).knockback) {
          const distance=s.knockbackSpeed*s.knockbackSeconds*weaponKnockbackMultiplier(player);
          applySkillControl(living,Math.cos(bullet.angle)*distance,Math.sin(bullet.angle)*distance,
            s.knockbackSeconds,s.knockbackSeconds);
        }
      }
      if(bullet.age>=s.duration-1e-8)bullets.splice(i,1);
    }
  }
  /** Stagger shots over the2.5s base cycle; Haste changes cadence, not lifetime or hit cooldown. */
  function update(delta,player,aim=0) {
    if(!getLuminousNova(player)){reset();return;}
    if(owner!==player){reset();owner=player;}
    const intervalScale=player.tuningParts?stationaryWeaponIntervalScale(player):1;cooldown*=intervalScale/stationaryScale;stationaryScale=intervalScale;
    if(!enabled||delta<=0)return;
    if(skillFinishing){advance(delta,player);return;}
    let remaining=delta;
    while(remaining>1e-8) {
      if(cooldown<=1e-8) {
        fire(player,aim);
        cooldown=attackTimeFormula(luminousNovaLevelStats(player).interval*stationaryScale,ensureCombatStats(player).hastePercent);
      }
      const step=Math.min(remaining,cooldown,s.hitCooldown/2);
      advance(step,player);cooldown=Math.max(0,cooldown-step);remaining-=step;
    }
  }
  /** Draw every active pink round using the shared spherical plasma renderer. */
  function draw(context,camera) {const rainbow=Boolean(owner?.tuningParts&&rgbTuningActive(owner));for(const bullet of bullets){bullet.rainbow=rainbow;drawLuminousPlasma(context,camera,bullet,bullet.diameter);}}
  return {getAuraSources(){return bullets;},ready:Promise.resolve(),reset,update,draw,
    setSkillFinishing(value){skillFinishing=Boolean(value);},
    setAutoattackEnabled(value){enabled=Boolean(value);if(!enabled)bullets=[];},
    get projectileCount(){return bullets.length;},get shotsFired(){return shots;}};
}


/** Keep a bounded path for steering projectiles; straight bullets retain their existing renderer. */
export function rememberPlasmaTrail(bullet,from,maxLength) {
  const trail=bullet.trail??=[{x:from.x,y:from.y,distance:0}];
  const last=trail.at(-1),step=Math.hypot(bullet.x-last.x,bullet.y-last.y);
  if(step<.25)return;
  trail.push({x:bullet.x,y:bullet.y,distance:last.distance+step});
  while(trail.length>2&&(trail.at(-1).distance-trail[1].distance>maxLength||trail.length>48))trail.shift();
}

/** Convert actual traveled positions to the plasma head's local coordinates, newest first. */
export function plasmaTrailPoints(bullet,maxLength) {
  if(!(bullet.trail?.length>1)||!(maxLength>1e-8))return null;
  const points=[{x:0,y:0,distance:0}],cos=Math.cos(bullet.angle),sin=Math.sin(bullet.angle);
  let previous={x:bullet.x,y:bullet.y},distance=0;
  for(let i=bullet.trail.length-1;i>=0;i--){
    const p=bullet.trail[i],length=Math.hypot(p.x-previous.x,p.y-previous.y);if(length<1e-8)continue;
    const fraction=Math.min(1,(maxLength-distance)/length),x=previous.x+(p.x-previous.x)*fraction,y=previous.y+(p.y-previous.y)*fraction;
    distance+=length*fraction;const dx=x-bullet.x,dy=y-bullet.y;
    points.push({x:dx*cos+dy*sin,y:-dx*sin+dy*cos,distance});
    if(fraction<1||distance>=maxLength)break;previous=p;
  }
  return points.length>1?points:null;
}

/** Shared spherical plasma rendering; the EX changes diameter without changing the normal weapon. */
export function drawLuminousPlasma(context,camera,bullet,diameter=luminousNovaSettings.bulletDiameter,duration=luminousNovaSettings.duration) {
  const s=luminousNovaSettings,radius=diameter/2;
  // Preserve gradient opacity and pale hot highlights while tinting the full plasma effect.
  const tint=value=>{
    if(bullet.rainbow)return rainbowPlasmaColor(value,bullet.age*160+(bullet.rainbowPhase||0)*360);
    if(bullet.color==='orange') {
      const orange=(r,g,b)=>[Number(r),Math.round(80+Number(g)*.60),Math.round(Number(g)*.20)];
      if(value.startsWith('#'))return '#'+orange(parseInt(value.slice(1,3),16),parseInt(value.slice(3,5),16),parseInt(value.slice(5,7),16)).map(n=>n.toString(16).padStart(2,'0')).join('');
      return value.replace(/(rgba?\()(\d+),(\d+),(\d+)/,(_,prefix,r,g,b)=>prefix+orange(r,g,b).join(','));
    }
    return bullet.color!=='blue'?value:value.startsWith('#')
      ? '#'+value.slice(3,5)+value.slice(5,7)+value.slice(1,3)
      : value.replace(/(rgba?\()(\d+),(\d+),(\d+)/, '$1$3,$4,$2');
  };
  // Skip the whole effect once both its head and longest wake have left the canvas.
  const reach=radius*(1+s.trailLengthRatio+s.bloomRadiusScale);
  const screenX=bullet.x-camera.x,screenY=bullet.y-camera.y;
  if(context.canvas&&(screenX+reach<0||screenY+reach<0||screenX-reach>context.canvas.width||screenY-reach>context.canvas.height))return;
  context.save();context.translate(bullet.x-camera.x,bullet.y-camera.y);context.rotate(bullet.angle);
  const fadeOut=Math.max(0,Math.min(1,(duration-bullet.age)/(bullet.fadeOutSeconds??.06)));
  const endOpacity=bullet.fadeOutSeconds?fadeOut*fadeOut*(3-2*fadeOut):fadeOut;
  const fade=endOpacity*Math.min(1,bullet.age/s.fadeInSeconds);
  // Only leave a wake along positions reached after acceleration, never behind the muzzle.
  const wakeAge=bullet.accelerating?Math.max(0,bullet.age-s.accelerationSeconds):bullet.age;
  context.globalAlpha=fade;
  context.globalCompositeOperation='lighter';
  // A broad soft halo and a tighter luminous rim keep small shots bright without enlarging their core.
  const halo=context.createRadialGradient(0,0,0,0,0,radius*3.6);
  halo.addColorStop(0,tint('rgba(255,225,252,.95)'));halo.addColorStop(.25,tint('rgba(255,125,229,.75)'));
  halo.addColorStop(.55,tint('rgba(244,48,186,.35)'));halo.addColorStop(1,tint('rgba(220,35,180,0)'));
  context.fillStyle=halo;
  context.beginPath();context.arc(0,0,radius*3.6,0,Math.PI*2);context.fill();
  context.filter='none';
  const rim=context.createRadialGradient(0,0,radius*.5,0,0,radius*1.6);
  rim.addColorStop(0,tint('rgba(255,224,252,.7)'));rim.addColorStop(.45,tint('rgba(255,99,216,.4)'));rim.addColorStop(1,tint('rgba(255,55,196,0)'));
  context.fillStyle=rim;context.beginPath();context.arc(0,0,radius*1.6,0,Math.PI*2);context.fill();
  const trailLength=Math.min(radius*(1+s.trailLengthRatio),(bullet.trailSpeed??bullet.speed??s.projectileSpeed)*wakeAge);
  const path=plasmaTrailPoints(bullet,trailLength),end=path?.at(-1)||{x:-trailLength,y:0};
  const tail=bullet.rainbow?rainbowTrailGradient(context,end.x,end.y,0,0):context.createLinearGradient(end.x,end.y,0,0);
  if(!bullet.rainbow){
  tail.addColorStop(0,tint('rgba(239,61,194,0)'));tail.addColorStop(.15,tint('rgba(255,80,210,.35)'));
  tail.addColorStop(.45,tint('rgba(255,130,230,.75)'));tail.addColorStop(.75,tint('rgba(255,200,248,.95)'));tail.addColorStop(1,tint('#fff5ff'));}
  /** Draw a connected tapered wake behind the spherical head, with a narrow luminous spine. */
  function drawTrail(width) {
    if(path){
      const total=path.at(-1).distance,left=[],right=[];
      for(let i=0;i<path.length;i++){
        const p=path[i],before=path[Math.max(0,i-1)],after=path[Math.min(path.length-1,i+1)];
        const dx=after.x-before.x,dy=after.y-before.y,length=Math.hypot(dx,dy)||1;
        const half=radius*width*(1-p.distance/total);
        left.push({x:p.x-dy/length*half,y:p.y+dx/length*half});right.push({x:p.x+dy/length*half,y:p.y-dx/length*half});
      }
      context.beginPath();context.moveTo(left[0].x,left[0].y);
      for(const p of left.slice(1))context.lineTo(p.x,p.y);
      for(let i=right.length-1;i>=0;i--)context.lineTo(right[i].x,right[i].y);
      context.fill();return;
    }
    context.beginPath();context.moveTo(-trailLength,0);
    context.bezierCurveTo(-trailLength*.65,-radius*width*.2,-radius*1.4,-radius*width,0,-radius*width);
    context.lineTo(0,radius*width);
    context.bezierCurveTo(-radius*1.4,radius*width,-trailLength*.65,radius*width*.2,-trailLength,0);context.fill();
  }
  // Wide additive bloom underneath the bright tail makes its fading gradient feel emissive.
  context.fillStyle=tail;context.globalAlpha=fade*.65;
  drawTrail(2.2);
  context.globalAlpha=fade;
  drawTrail(1.15);
  context.filter='none';drawTrail(.7);
  // A second thin pass reads as hot plasma rather than a translucent flat tail.
  drawTrail(.22);
  // Pure additive light fades to transparency: no opaque sphere, colored rim or hard outline.
  const light=context.createRadialGradient(0,0,0,0,0,radius*2);
  light.addColorStop(0,tint('rgba(255,250,255,.95)'));
  light.addColorStop(.2,tint('rgba(255,235,252,.8)'));
  light.addColorStop(.45,tint('rgba(255,185,239,.45)'));
  light.addColorStop(.7,tint('rgba(255,125,220,.15)'));
  light.addColorStop(1,tint('rgba(255,100,210,0)'));
  context.fillStyle=light;
  context.beginPath();context.arc(0,0,radius*2,0,Math.PI*2);context.fill();context.restore();

}
