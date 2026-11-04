import { bossBehaviorSettings as settings, contactSettings } from './game-config.js';
import { damagePlayer } from './player-stats.js';
import { getCombatHitbox } from './combat-hitboxes.js';

/** Boss action state, projectiles and warned area attacks; Shiroko keeps ordinary chase AI. */
export function createBossBehaviors() {
  const bullets=[],zones=[];
  function hit(player,amount) {
    if(player.contactIFrames>0)return;
    if(damagePlayer(player,amount))player.contactIFrames=contactSettings.iFrameDuration;
  }
  function fire(npc,angle,speed,radius=5) {
    if(bullets.length>=settings.projectileLimit)return;
    bullets.push({owner:npc.id,x:npc.x,y:npc.y,previousX:npc.x,previousY:npc.y,
      vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,radius,age:0,damage:npc.contactDamage||1});
  }
  function zone(npc,x,y,delay,radius) { zones.push({owner:npc.id,x,y,remaining:delay,radius,damage:npc.contactDamage||1}); }
  function begin(npc,name,extra={}) { npc.bossAction={name,elapsed:0,...extra};npc.gifElapsed=0;npc.moving=false; }
  function finish(npc) {npc.bossAction=null;npc.bossSquash=1;npc.bossVisualOffsetY=0;npc.attack=null;}
  /** Return true while this controller owns movement; otherwise use ordinary chasing. */
  function updateNpc(npc,player,delta,viewport) {
    const s=settings[npc.type];
    if(!s||!npc.ai||delta<=0)return false;
    npc.bossCooldown=(npc.bossCooldown??s.interval)-delta;
    if(!npc.bossAction&&npc.bossCooldown<=0) {
      npc.bossCooldown=s.interval;npc.bossMoveIndex=(npc.bossMoveIndex||0)+1;
      if(npc.type==='arisu')begin(npc,'chargeUp',{clip:'charge'});
      if(npc.type==='iroha') {
        const name=npc.bossMoveIndex%2?'cannon':'artillery';begin(npc,name);
        npc.attack={name,facing:npc.facing||'left',elapsed:0,walkElapsed:npc.elapsed||0};
      }
      if(npc.type==='neru')begin(npc,npc.bossMoveIndex%2?'shoot':'compress',npc.bossMoveIndex%2?{clip:'shoot',nextBullet:0}:{});
    }
    const action=npc.bossAction;if(!action)return false;
    action.elapsed+=delta;npc.moving=false;
    if(action.name==='chargeUp'&&action.elapsed>=s.chargeUpSeconds) {
      const angle=Math.atan2(player.y-npc.y,player.x-npc.x);
      begin(npc,'charge',{angle,distance:Math.hypot(viewport.width,viewport.height)+npc.spriteSize});
    } else if(action.name==='charge') {
      const distance=Math.min(s.chargeSpeed*delta,action.distance);
      const x=npc.x,y=npc.y;npc.x+=Math.cos(action.angle)*distance;npc.y+=Math.sin(action.angle)*distance;action.distance-=distance;
      npc.facing=Math.cos(action.angle)<0?'left':'right';npc.moving=true;
      const body=getCombatHitbox(player,false),dx=npc.x-x,dy=npc.y-y;
      const t=Math.max(0,Math.min(1,((body.x-x)*dx+(body.y-y)*dy)/(dx*dx+dy*dy||1)));
      if(Math.hypot(body.x-x-dx*t,body.y-y-dy*t)<body.rx+30)hit(player,npc.contactDamage||1);
      // Stop after crossing the far viewport edge, never home during a charge.
      const outside=npc.x<viewport.x-80||npc.x>viewport.x+viewport.width+80||npc.y<viewport.y-80||npc.y>viewport.y+viewport.height+80;
      if(action.distance<=0||(action.elapsed>.2&&outside))begin(npc,'recover');
    } else if(action.name==='recover') {
      if(action.elapsed>=s.recoverySeconds)finish(npc);
    } else if(npc.type==='iroha') {
      if(npc.attack)npc.attack.elapsed=action.elapsed*1000;
      if(!action.fired&&action.elapsed>=.4) {
        action.fired=true;
        if(action.name==='cannon')fire(npc,Math.atan2(player.y-npc.y,player.x-npc.x),420,12);
        else for(const [dx,dy] of [[0,0],[-100,60],[100,60]])zone(npc,player.x+dx,player.y+dy,s.artilleryDelay,s.artilleryRadius);
      }
      if(action.elapsed>=(action.name==='cannon'?s.cannonSeconds:s.artillerySeconds))finish(npc);
    } else if(action.name==='shoot') {
      while(action.nextBullet<=Math.min(action.elapsed,s.shootSeconds)) {
        for(let i=0;i<s.bulletCount;i++)fire(npc,i/s.bulletCount*Math.PI*2+action.nextBullet*1.3,s.bulletSpeed);
        action.nextBullet+=s.bulletInterval;
      }
      if(action.elapsed>=s.shootSeconds)finish(npc);
    } else if(action.name==='compress') {
      npc.bossSquash=1-.45*Math.min(1,action.elapsed/s.compressSeconds);
      if(action.elapsed>=s.compressSeconds) {
        begin(npc,'leap',{fromX:npc.x,fromY:npc.y,targetX:player.x,targetY:player.y});
        zone(npc,player.x,player.y,s.leapSeconds,s.landingRadius);npc.bossSquash=1;
      }
    } else if(action.name==='leap') {
      const t=Math.min(1,action.elapsed/s.leapSeconds);
      npc.x=action.fromX+(action.targetX-action.fromX)*t;npc.y=action.fromY+(action.targetY-action.fromY)*t;
      npc.bossVisualOffsetY=-Math.sin(Math.PI*t)*s.leapHeight;
      if(t>=1){npc.bossVisualOffsetY=0;begin(npc,'recover');}
    }
    return true;
  }
  /** Advance attacks with swept projectile checks and the player's shared damage I-frames. */
  function updateEffects(delta,player,alive) {
    const body=getCombatHitbox(player,false),live=new Set(alive.map(n=>n.id));
    for(let i=bullets.length-1;i>=0;i--) {
      const b=bullets[i];b.age+=delta;b.previousX=b.x;b.previousY=b.y;b.x+=b.vx*delta;b.y+=b.vy*delta;
      const dx=b.x-b.previousX,dy=b.y-b.previousY;
      const t=Math.max(0,Math.min(1,((body.x-b.previousX)*dx+(body.y-b.previousY)*dy)/(dx*dx+dy*dy||1)));
      const touching=Math.hypot(body.x-b.previousX-dx*t,body.y-b.previousY-dy*t)<body.rx+b.radius;
      if(touching&&delta>0)hit(player,b.damage);
      if(touching&&delta>0||b.age>settings.projectileLifetime||!live.has(b.owner))bullets.splice(i,1);
    }
    for(let i=zones.length-1;i>=0;i--) {
      const z=zones[i];z.remaining-=delta;
      if(!live.has(z.owner)){zones.splice(i,1);continue;}
      if(z.remaining<=0){if(Math.hypot(body.x-z.x,body.y-z.y)<z.radius+body.rx)hit(player,z.damage);zones.splice(i,1);}
    }
  }
  /** Draw attack cues and bullets in world space, with no hitstop or gameplay pauses. */
  function draw(context,camera) {
    context.save();context.lineWidth=2;
    for(const z of zones){context.strokeStyle='#ff5264';context.fillStyle='rgba(255,60,90,.12)';context.beginPath();context.arc(z.x-camera.x,z.y-camera.y,z.radius,0,Math.PI*2);context.fill();context.stroke();}
    for(const b of bullets){context.fillStyle='#61deff';context.strokeStyle='#e5fcff';context.beginPath();context.arc(b.x-camera.x,b.y-camera.y,b.radius,0,Math.PI*2);context.fill();context.stroke();}
    context.restore();
  }
  return {updateNpc,updateEffects,draw,get projectileCount(){return bullets.length;},get zoneCount(){return zones.length;}};
}
