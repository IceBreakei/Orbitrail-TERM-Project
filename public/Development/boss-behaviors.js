import {weakenedAttackMultiplier} from './weak-tuning.js';
import {eraseTuningProjectiles} from './neutralization-tuning.js';
import { drawArtilleryExplosion, artilleryExplosionDuration } from './artillery-explosion.js';
import { drawLuminousPlasma } from './luminous-nova.js?plasma-orange=2';
import { arisuBodyCenterOffsetY, neruBodyCenterOffsetY } from './game-config.js';
import { bossBehaviorSettings as settings, contactSettings, spriteDisplayPadding, normalSpriteSize } from './game-config.js';
import { damagePlayer } from './player-stats.js';
import { getCombatHitbox } from './combat-hitboxes.js';

/** Solve horizontal shell interception, including windup, travel time and player velocity. */
export function irohaCannonIntercept(npc,player,delta,motion={x:0,y:0}) {
  const s=settings.iroha,body=getCombatHitbox(player,false);
  const vx=delta>0?(motion.x||0)/delta:0,vy=delta>0?(motion.y||0)/delta:0;
  const barrelY=npc.y+s.cannonOffsetY,clearance=s.cannonWarningWidth/2+body.ry;
  const earliest=s.cannonWindupSeconds+s.cannonFireDelay;
  const options=[];
  for(const side of [-1,1]) {
    const muzzle=npc.x+side*(npc.spriteSize||200)*.35;
    const relativeSpeed=side*s.cannonSpeed-vx;
    if(Math.abs(relativeSpeed)>1e-8) {
      const impactTime=(body.x-muzzle+side*s.cannonSpeed*earliest)/relativeSpeed;
      if(impactTime>=earliest&&impactTime-earliest<=settings.projectileLifetime&&Math.abs(body.y+vy*impactTime-barrelY)<=clearance)
        options.push({angle:side<0?Math.PI:0,fireAt:earliest,impactTime});
    }
    if(Math.abs(vy)>1e-8) {
      const impactTime=(barrelY-body.y)/vy;
      const flight=(body.x+vx*impactTime-muzzle)/(side*s.cannonSpeed);
      const fireAt=impactTime-flight;
      if(flight>=0&&flight<=settings.projectileLifetime&&fireAt>=earliest&&fireAt<=earliest+s.cannonMaxInterceptWait)
        options.push({angle:side<0?Math.PI:0,fireAt,impactTime});
    }
  }
  return options.sort((a,b)=>a.fireAt-b.fireAt||a.impactTime-b.impactTime)[0]||null;
}

/** Position-based pool, recalculated once when Iroha starts an attack. */
export function irohaAttackChances(npc,player) {
  const dx=Math.abs(player.x-npc.x),dy=Math.abs(player.y-npc.y);
  // Symmetric sigmoid over each quadrant: rapid change through 30?60deg, 50/50 at 45deg.
  const position=Math.atan2(dy,dx)/(Math.PI/2),power=settings.iroha.attackAngleExponent;
  const horizontal=(1-position)**power,vertical=position**power;
  const cannon=dx===0&&dy===0?.5:horizontal/(horizontal+vertical);
  return {cannon,artillery:1-cannon};
}
export function irohaAttackChoice(npc,player,delta,motion={x:0,y:0},random=Math.random) {
  const pool=irohaAttackChances(npc,player,delta,motion);
  return random()<pool.cannon?'cannon':'artillery';
}

/** Cardinal movement produces +; diagonal movement produces X. */
export function irohaArtilleryPoints(npc,player,motion={x:0,y:0},viewport={width:1280,height:720}) {
  const dx=Math.abs(motion.x||0),dy=Math.abs(motion.y||0);
  const diagonal=Math.max(dx,dy)>1e-6&&Math.min(dx,dy)/Math.max(dx,dy)>.4;
  const s=settings.iroha;
  // Keep a compact cluster of equal circles, with neighboring edges slightly overlapping.
  // Fit the + footprint using the configured coverage of the shorter visible dimension; X is its 45deg rotation.
  const radius=Math.min(viewport.width,viewport.height)*s.artilleryCoverage/(2*(1+s.artilleryCircleSpacing));
  const spacing=radius*s.artilleryCircleSpacing,angle=diagonal?Math.PI/4:0;
  return [{x:player.x,y:player.y,radius},...Array.from({length:4},(_,i)=>({
    x:player.x+Math.cos(angle+i*Math.PI/2)*spacing,
    y:player.y+Math.sin(angle+i*Math.PI/2)*spacing,radius}))];
}

/** Continuous same-direction movement, measured once per simulation tick, not per boss. */
export function createSteadyMovementTracker() {
  let owner=null,seconds=0,heading=null,vx=0,vy=0;
  return {update(delta,player,motion={x:0,y:0}) {
    if(delta<=0)return;
    if(owner!==player){owner=player;seconds=0;heading=null;}
    const length=Math.hypot(motion.x||0,motion.y||0);
    if(length<.01){seconds=0;heading=null;vx=vy=0;return;}
    const direction={x:motion.x/length,y:motion.y/length};
    if(!heading||direction.x*heading.x+direction.y*heading.y<.995){seconds=0;heading=direction;}
    seconds+=delta;vx=motion.x/delta;vy=motion.y/delta;
  },get seconds(){return seconds;},get velocity(){return {x:vx,y:vy};}};
}

/** Boss action state, projectiles and warned area attacks; Shiroko keeps ordinary chase AI. */
export function createBossBehaviors({random=Math.random}={}) {
  const bullets=[],zones=[],warnings=new Map(),landingShadows=new Map(),movement=createSteadyMovementTracker();
  let shakeRemaining=0,shakeElapsed=0;
  function hit(player,amount,attacker,projectile=false) {
    if(player.contactIFrames>0)return false;
    if(damagePlayer(player,attacker?.weakRemaining>0?Math.floor(amount*weakenedAttackMultiplier(attacker)):amount,{projectile})){player.contactIFrames=contactSettings.iFrameDuration;if(attacker)attacker.secondsSincePlayerHit=0;return true;}
    return false;
  }
  function fire(npc,angle,speed,radius=5,options={}) {
    if(bullets.length>=settings.projectileLimit)return;
    bullets.push({owner:npc.id,ownerType:npc.type,x:npc.x,y:npc.y,previousX:npc.x,previousY:npc.y,
      vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius,age:0,damage:npc.contactDamage||1,...options});
  }
  function zone(npc,x,y,delay,radius) { zones.push({owner:npc.id,x,y,remaining:delay,radius,damage:npc.contactDamage||1}); }
  function begin(npc,name,extra={}) { npc.bossAction={name,elapsed:0,...extra};npc.gifElapsed=0;npc.moving=false; }
  function finish(npc) {landingShadows.delete(npc.id);npc.bossAction=null;npc.bossSquash=1;npc.bossVisualOffsetY=0;npc.attack=null;}
  function startIroha(npc,name,player,delta,motion,extra={}) {
    const s=settings.iroha;
    const intercept=name==='cannon'?(irohaCannonIntercept(npc,player,delta,motion)||{
      angle:player.x<npc.x?Math.PI:player.x>npc.x?0:npc.facing==='right'?0:Math.PI,
      fireAt:s.cannonWindupSeconds+s.cannonFireDelay
    }):null;
    if(intercept)npc.facing=Math.cos(intercept.angle)<0?'left':'right';
    begin(npc,name,{...intercept,...extra});
    npc.attack={name,facing:npc.facing||'left',elapsed:0,walkElapsed:npc.elapsed||0};
  }
  /** Return true while this controller owns movement; otherwise use ordinary chasing. */
  function updateNpc(npc,player,delta,viewport,playerMotion={x:0,y:0},chaseDuringAction=()=>{}) {
    const s=settings[npc.type];
    if(!s||!npc.ai||delta<=0)return false;
    npc.bossCooldown=(npc.bossCooldown??s.interval)-delta;
    if(!npc.bossAction&&npc.bossCooldown<=0) {
      npc.bossCooldown=s.interval;npc.bossMoveIndex=(npc.bossMoveIndex||0)+1;
      if(npc.type==='arisu')begin(npc,'chargeUp',{clip:'charge',angle:Math.atan2(player.y-npc.y,player.x-npc.x)});
      if(npc.type==='iroha') {
        const name=irohaAttackChoice(npc,player,delta,playerMotion,random);
        const before=name==='cannon'&&random()>=1-s.artilleryBeforeCannonChance;
        startIroha(npc,before?'artillery':name,player,delta,playerMotion,before?{nextAction:'cannon'}:{});
      }
      if(npc.type==='neru')begin(npc,npc.bossMoveIndex%2?'shoot':'compress',npc.bossMoveIndex%2?{clip:'shoot',nextBullet:0,pattern:npc.bossMoveIndex%4===3?'stream':'radial',streamIndex:0}:{});
    }
    const action=npc.bossAction;if(!action)return false;
    action.elapsed+=delta;npc.moving=false;
    if(npc.type==='iroha')chaseDuringAction(npc);
    if(action.name==='chargeUp') {
      const center={x:npc.x+(npc.spriteHurtbox?.offsetX||0),y:npc.y+arisuBodyCenterOffsetY(npc)};
      if(!action.aimLocked) {
        action.angle=Math.atan2(player.y-center.y,player.x-center.x);
        action.targetX=player.x;action.targetY=player.y;
        if(action.elapsed>=s.trackingSeconds-1e-8)action.aimLocked=true;
      }
      npc.facing=Math.cos(action.angle)<0?'left':'right';
      warnings.set(npc.id,{x:center.x,y:center.y,angle:action.angle,progress:Math.min(1,action.elapsed/s.chargeUpSeconds),length:Math.hypot(viewport.width,viewport.height)+npc.spriteSize,width:s.warningWidth});
    }
    if(action.name==='chargeUp'&&action.elapsed>=s.chargeUpSeconds-1e-8) {
      const angle=action.angle;warnings.delete(npc.id);
      // Measure along the warned ray from the same visible body center used for aiming.
      // Dividing by a nearly horizontal/vertical component can create enormous dash ranges.
      const dx=Math.cos(angle),dy=Math.sin(angle);
      const originX=npc.x+(npc.spriteHurtbox?.offsetX||0);
      const originY=npc.y+arisuBodyCenterOffsetY(npc);
      const targetDistance=Math.max(0,(player.x-originX)*dx+(player.y-originY)*dy);
      // Preserve the full dash launch speed at every distance; braking remains timed.
      const launchSpeed=s.chargeSpeed;
      const brakeAt=targetDistance;
      begin(npc,'charge',{angle,travelled:0,targetDistance,brakeAt,launchSpeed,speed:launchSpeed,brakingElapsed:0});
    } else if(action.name==='charge') {
      // Keep the direction locked, but pass the player's current position along that ray.
      // Otherwise a fleeing player can move beyond the old warning-time braking point.
      if(action.brakingElapsed===0) {
        const centerX=npc.x+(npc.spriteHurtbox?.offsetX||0);
        const centerY=npc.y+arisuBodyCenterOffsetY(npc);
        const remaining=(player.x-centerX)*Math.cos(action.angle)+(player.y-centerY)*Math.sin(action.angle);
        action.brakeAt=action.travelled+Math.max(0,remaining);
      }
      // Once braking begins, retain its bounded travel and timed return to chase.
      const before=Math.min(delta,Math.max(0,action.brakeAt-action.travelled)/action.launchSpeed);
      const after=delta-before;
      let travel=before*action.launchSpeed;
      if(after>0) {
        // Front-load braking while retaining a continuous 1.5s ease to zero.
        // Analytic integration bounds post-target travel to the configured distance.
        const duration=s.decelerationSeconds;
        const power=Math.max(1,action.launchSpeed*duration/s.brakingDistance-1);
        const previous=Math.min(duration,action.brakingElapsed);
        const next=Math.min(duration,previous+after);
        travel+=action.launchSpeed*duration/(power+1)*
          ((1-previous/duration)**(power+1)-(1-next/duration)**(power+1));
        action.brakingElapsed=next;
        action.speed=action.launchSpeed*(1-next/duration)**power;
      }
      const distance=travel;action.travelled+=distance;
      const x=npc.x,y=npc.y;npc.x+=Math.cos(action.angle)*distance;npc.y+=Math.sin(action.angle)*distance;
      npc.facing=Math.cos(action.angle)<0?'left':'right';npc.moving=true;
      const body=getCombatHitbox(player,false),dx=npc.x-x,dy=npc.y-y;
      const t=Math.max(0,Math.min(1,((body.x-x)*dx+(body.y-y)*dy)/(dx*dx+dy*dy||1)));
      if(Math.hypot(body.x-x-dx*t,body.y-y-dy*t)<body.rx+s.chargeRadius)hit(player,s.chargeDamage,npc);
      if(action.brakingElapsed>=s.decelerationSeconds-1e-8) {
        finish(npc);npc.bossCooldown=s.interval;npc.moving=false;
        npc.gifElapsed=0;npc.contactReaction=null;
        return false; // Resume ordinary chase in this same NPC update, with the normal animation.
      }
    } else if(action.name==='recover') {
      if(npc.type==='neru'&&action.squashFrom!=null){
        const t=Math.min(1,action.elapsed/s.recoverySeconds);npc.bossSquash=action.squashFrom+(1-action.squashFrom)*(1-(1-t)**3);
      }
      if(action.elapsed>=s.recoverySeconds){finish(npc);if(npc.type==='neru'){npc.bossCooldown=s.interval;return false;}}
    } else if(npc.type==='iroha') {
      const cannon=action.name==='cannon',windup=cannon?s.cannonWindupSeconds:.4;
      const fireAt=cannon?(action.fireAt??windup+s.cannonFireDelay):windup;
      if(npc.attack) {
        // The supplied cannon sheet first flashes at frame 2; release the shell on that pose.
        const frameSeconds=(npc.attacks?.cannon?.frameDuration||110)/1000;
        const animationStart=cannon?fireAt-s.cannonFireFrame*frameSeconds:0;
        npc.attack.elapsed=Math.max(0,action.elapsed-animationStart)*1000+1e-6;
      }
      if(cannon&&!action.fired) {
        const x=npc.x+Math.cos(action.angle)*(npc.spriteSize||200)*.35;
        const y=npc.y+s.cannonOffsetY;
        warnings.set(npc.id,{x,y,angle:action.angle,progress:Math.min(1,action.elapsed/fireAt),
          length:viewport.width+(npc.spriteSize||200),width:s.cannonWarningWidth,back:(npc.spriteSize||200)*.55});
      }
      if(!action.fired&&action.elapsed>=fireAt-1e-8) {
        action.fired=true;warnings.delete(npc.id);
        if(cannon)fire(npc,action.angle,s.cannonSpeed,s.cannonWarningWidth/2,{
          x:npc.x+Math.cos(action.angle)*(npc.spriteSize||200)*.35,y:npc.y+s.cannonOffsetY,cannon:true,angle:action.angle,speed:s.cannonSpeed,color:'orange'});
        else {
          let target=player;
          if(movement.seconds>=s.artilleryLeadAfter-1e-8&&random()<s.artilleryLeadChance) {
            const velocity=movement.velocity,length=Math.hypot(velocity.x,velocity.y);
            const seconds=Math.min(s.artilleryLeadSeconds,length?s.artilleryMaxLead/length:0);
            target={x:player.x+velocity.x*seconds,y:player.y+velocity.y*seconds};
          }
          for(const [index,point] of irohaArtilleryPoints(npc,target,playerMotion,viewport).entries())zones.push({owner:npc.id,...point,
          radius:point.radius,damage:npc.contactDamage||1,artillery:true,age:0,impactOffset:index*s.artilleryStaggerSeconds,
          side:npc.x<=point.x?-1:1,detonated:false});
        }
      }
      if(action.elapsed>=(cannon?fireAt+s.cannonSeconds-s.cannonWindupSeconds-s.cannonFireDelay:s.artillerySeconds)) {
        if(action.nextAction==='cannon')startIroha(npc,'cannon',player,delta,playerMotion);
        else if(cannon&&random()>=1-s.artilleryAfterCannonChance)startIroha(npc,'artillery',player,delta,playerMotion);
        else {finish(npc);npc.bossCooldown=s.interval;}
      }
    } else if(action.name==='shoot') {
      while(action.nextBullet<=Math.min(action.elapsed,s.shootSeconds)) {
        if(action.pattern==='stream') {
          const target=getCombatHitbox(player);
          const originY=npc.y+neruBodyCenterOffsetY(npc);
          const angle=Math.atan2(target.y-originY,target.x-npc.x);
          const lane=(action.streamIndex++%2===0?-1:1)*s.streamLaneOffset;
          fire(npc,angle,s.streamBulletSpeed,s.bulletRadius,{plasma:true,piercing:true,angle,speed:s.streamBulletSpeed,color:'orange',
            x:npc.x-Math.sin(angle)*lane,y:originY+Math.cos(angle)*lane});
        } else {
          for(let i=0;i<s.bulletCount;i++){const angle=i/s.bulletCount*Math.PI*2+action.nextBullet*1.3;fire(npc,angle,s.bulletSpeed,s.bulletRadius,{plasma:true,angle,speed:s.bulletSpeed,color:'orange',piercing:true});}
        }
        action.nextBullet+=action.pattern==='stream'?s.streamBulletInterval:s.bulletInterval;
      }
      if(action.elapsed>=s.shootSeconds)finish(npc);
    } else if(action.name==='compress') {
      const squish=Math.min(1,action.elapsed/s.compressSeconds);
      npc.bossSquash=1-.45*squish*squish*(3-2*squish);
      if(action.elapsed>=s.compressSeconds-1e-8) {
        begin(npc,'leap',{fromX:npc.x,fromY:npc.y,targetX:npc.x,targetY:npc.y+(npc.spriteSize||300)/2-spriteDisplayPadding,aimLocked:false});

      }
    } else if(action.name==='leap') {
      const trackStart=s.leapRiseSeconds+s.shadowFadeSeconds;
      const trackEnd=trackStart+s.leapTrackingSeconds;
      const fallStart=trackEnd+s.leapLockSeconds;
      if(!action.aimLocked){
        const playerFeet=player.y+(player.spriteSize||normalSpriteSize)/2-spriteDisplayPadding;
        const dx=player.x-action.targetX,dy=playerFeet-action.targetY,length=Math.hypot(dx,dy);
        const trackingDelta=Math.max(0,Math.min(action.elapsed,trackEnd)-Math.max(action.elapsed-delta,trackStart));
        const speed=Math.max(s.shadowChaseSpeed,Math.hypot(playerMotion.x||0,playerMotion.y||0)/delta*1.5);
        const step=Math.min(length,speed*trackingDelta);
        if(length>0){action.targetX+=dx/length*step;action.targetY+=dy/length*step;}
        if(action.elapsed>=trackEnd-1e-8)action.aimLocked=true;
      }
      const height=viewport.height+(npc.spriteSize||300)+Math.max(0,npc.y-viewport.y);
      if(action.elapsed<s.leapRiseSeconds) {
        const rise=Math.min(1,action.elapsed/s.leapRiseSeconds),ease=rise*rise*(3-2*rise);
        npc.bossVisualOffsetY=-height*ease;
        npc.bossSquash=.55+.45*ease;
      } else {
        npc.bossSquash=1;
        npc.x=action.targetX;npc.y=action.targetY-(npc.spriteSize||300)/2+spriteDisplayPadding;
        if(action.airHeight==null)action.airHeight=height;
        const drop=Math.max(0,Math.min(1,(action.elapsed-fallStart)/s.leapFallSeconds));
        npc.bossVisualOffsetY=-action.airHeight*(1-drop*drop);
      }
      if(action.elapsed>=s.leapRiseSeconds&&npc.y+(npc.spriteSize||300)/2-spriteDisplayPadding+npc.bossVisualOffsetY<=viewport.y) {
        landingShadows.set(npc.id,{x:action.targetX,y:action.targetY,radius:s.landingRadius*s.shadowScale,
          opacity:Math.min(1,(action.elapsed-s.leapRiseSeconds)/s.shadowFadeSeconds),
          growth:Math.min(1,(action.elapsed-s.leapRiseSeconds)/s.shadowFadeSeconds),locked:action.aimLocked});
      } else if(action.elapsed<s.leapRiseSeconds)landingShadows.delete(npc.id);
      if(action.elapsed>=fallStart+s.leapFallSeconds-1e-8) {
        const body=getCombatHitbox(player,false);
        if(Math.hypot(body.x-action.targetX,body.y-action.targetY)<s.landingRadius+body.rx)hit(player,npc.contactDamage||1,npc);
        landingShadows.delete(npc.id);npc.bossVisualOffsetY=0;
        npc.bossSquash=s.impactSquash;begin(npc,'recover',{squashFrom:s.impactSquash});
        shakeRemaining=s.impactShakeSeconds;shakeElapsed=0;
      }
    }
    return true;
  }
  /** Advance attacks with swept projectile checks and the player's shared damage I-frames. */
  function updateEffects(delta,player,alive,playerMotion={x:0,y:0}) {
    movement.update(delta,player,playerMotion);
    shakeRemaining=Math.max(0,shakeRemaining-delta);shakeElapsed+=delta;
    const body=getCombatHitbox(player,false),live=new Set(alive.map(n=>n.id));
    const frozenOwners=new Set(alive.filter(owner=>owner.frozenRemaining>0).map(owner=>owner.id));
    for(const id of landingShadows.keys())if(!alive.some(n=>n.id===id&&n.bossAction?.name==='leap'))landingShadows.delete(id);
    for(const id of warnings.keys())if(!live.has(id)||!alive.find(n=>n.id===id&&(n.bossAction?.name==='chargeUp'||n.bossAction?.name==='cannon'&&!n.bossAction.fired)))warnings.delete(id);
    for(let i=bullets.length-1;i>=0;i--) {
      const b=bullets[i];if(frozenOwners.has(b.owner))continue;
      b.age+=delta;b.previousX=b.x;b.previousY=b.y;b.x+=b.vx*delta;b.y+=b.vy*delta;
      const dx=b.x-b.previousX,dy=b.y-b.previousY;
      const t=Math.max(0,Math.min(1,((body.x-b.previousX)*dx+(body.y-b.previousY)*dy)/(dx*dx+dy*dy||1)));
      const touching=Math.hypot(body.x-b.previousX-dx*t,body.y-b.previousY-dy*t)<body.rx+b.radius;
      if(touching&&delta>0&&(!(b.cannon||b.piercing)||!b.hitPlayer)){
        const landed=hit(player,b.damage,alive.find(owner=>owner.id===b.owner),true);if((b.cannon||b.piercing)&&landed)b.hitPlayer=true;
      }
      if(touching&&delta>0&&!b.cannon&&!b.piercing||b.age>settings.projectileLifetime||!live.has(b.owner))bullets.splice(i,1);
    }
    for(let i=zones.length-1;i>=0;i--) {
      const z=zones[i];if(frozenOwners.has(z.owner))continue;
      if(!z.artillery)z.remaining-=delta;
      if(!live.has(z.owner)){zones.splice(i,1);continue;}
      if(z.artillery) {
        z.age+=delta;
        const impact=settings.iroha.artilleryDelay+(z.impactOffset||0)+settings.iroha.artilleryFallSeconds;
        if(!z.detonated&&z.age>=impact){z.detonated=true;if(Math.hypot(body.x-z.x,body.y-z.y)<z.radius+body.rx)hit(player,z.damage,alive.find(owner=>owner.id===z.owner),true);}
        if(z.age>=impact+artilleryExplosionDuration)zones.splice(i,1);
        continue;
      }
      if(z.remaining<=0){if(Math.hypot(body.x-z.x,body.y-z.y)<z.radius+body.rx)hit(player,z.damage,alive.find(owner=>owner.id===z.owner));zones.splice(i,1);}
    }
  }
  /** Draw attack cues and bullets in world space, with no hitstop or gameplay pauses. */
  function draw(context,camera) {
    context.save();context.lineWidth=2;
    for(const shadow of landingShadows.values()) {
      if(shadow.opacity<=0)continue;
      const x=shadow.x-camera.x,y=shadow.y-camera.y;
      context.fillStyle=`rgba(15,12,28,${.35*(shadow.opacity??1)})`;
      const grow=shadow.growth??1,scale=.35+.65*grow*grow*(3-2*grow);
      context.beginPath();context.ellipse(x,y,shadow.radius*scale,shadow.radius*.45*scale,0,0,Math.PI*2);context.fill();

    }
    for(const w of warnings.values()) {
      context.save();context.translate(w.x-camera.x,w.y-camera.y);context.rotate(w.angle);
      const half=w.width/2,back=w.back||0;
      context.fillStyle='rgba(255,45,70,.16)';context.fillRect(-back,-half,w.length+back,w.width);
      context.strokeStyle='rgba(255,85,100,.65)';context.strokeRect(-back,-half,w.length+back,w.width);
      // Twin inner lines converge on the dash axis as the windup expires.
      const closing=half*(1-w.progress);
      context.strokeStyle='rgba(255,160,165,.85)';context.beginPath();
      context.moveTo(-back,-closing);context.lineTo(w.length,-closing);
      context.moveTo(-back,closing);context.lineTo(w.length,closing);context.stroke();
      context.restore();
    }
    for(const z of zones){
      const localAge=z.artillery?z.age-(z.impactOffset||0):0;
      if(z.artillery&&localAge<0)continue;
      const impact=settings.iroha.artilleryDelay+settings.iroha.artilleryFallSeconds;
      // Each ring starts with its shell's stagger and remains until that shell lands.
      if(!z.artillery||localAge<impact) {
        context.strokeStyle='#ff5264';context.fillStyle='rgba(255,60,90,.12)';context.beginPath();
        context.arc(z.x-camera.x,z.y-camera.y,z.radius,0,Math.PI*2);context.fill();context.stroke();
        if(z.artillery){
          const progress=Math.min(1,localAge/impact);
          context.strokeStyle='rgba(255,180,185,.9)';context.lineWidth=3;context.beginPath();
          context.arc(z.x-camera.x,z.y-camera.y,Math.max(1,z.radius*(1-progress)),0,Math.PI*2);context.stroke();context.lineWidth=2;
        }
      }
      if(z.artillery&&localAge>=settings.iroha.artilleryDelay) {
        const elapsed=localAge-settings.iroha.artilleryDelay;
        if(elapsed<settings.iroha.artilleryFallSeconds) {
          const t=elapsed/settings.iroha.artilleryFallSeconds;
          const x=z.x+z.side*260*(1-t),y=z.y-500*(1-t);
          drawLuminousPlasma(context,camera,{x,y,angle:Math.atan2(500,-z.side*260),
            speed:Math.hypot(260,500)/settings.iroha.artilleryFallSeconds,age:elapsed,color:'orange'},
            settings.iroha.cannonWarningWidth/3.6*settings.iroha.artilleryShellScale,Infinity);
        } else drawArtilleryExplosion(context,camera,z,elapsed-settings.iroha.artilleryFallSeconds);
      }
    }
    for(const b of bullets){
      if(b.plasma){drawLuminousPlasma(context,camera,b,settings.neru.bulletDiameter,settings.projectileLifetime);continue;}
      if(b.cannon){drawLuminousPlasma(context,camera,{...b,color:'orange'},settings.iroha.cannonWarningWidth/3.6,settings.projectileLifetime);continue;}
      context.fillStyle='#61deff';context.strokeStyle='#e5fcff';context.beginPath();context.arc(b.x-camera.x,b.y-camera.y,b.radius,0,Math.PI*2);context.fill();context.stroke();}

    context.restore();
  }
  return {eraseProjectiles:args=>eraseTuningProjectiles({...args,projectiles:bullets}),updateNpc,updateEffects,draw,get screenShake(){
    if(shakeRemaining<=0)return {x:0,y:0};
    const strength=settings.neru.impactShakeStrength*shakeRemaining/settings.neru.impactShakeSeconds;
    return {x:Math.sin(shakeElapsed*91+1)*strength,y:Math.cos(shakeElapsed*113)*strength};
  },get projectileCount(){return bullets.length;},get zoneCount(){return zones.length;}};
}
