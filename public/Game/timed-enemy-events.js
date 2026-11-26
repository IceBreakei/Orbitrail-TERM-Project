import { timedEnemyEvents, playerSettings } from './game-config.js';

/** Filled circular cluster: golden-angle spacing avoids square rows and hollow rings. */
export function clusterSpawnPoints(anchor, count, spacing) {
  const radius=spacing*Math.sqrt(Math.max(0,count-1))/2;
  const goldenAngle=Math.PI*(3-Math.sqrt(5));
  return Array.from({length:count},(_,i)=>{
    const distance=count>1?radius*Math.sqrt(i/(count-1)):0;
    const angle=i*goldenAngle;
    return {x:anchor.x+Math.cos(angle)*distance,y:anchor.y+Math.sin(angle)*distance};
  });
}

/** Place each scheduled formation once; retry invalid anchors/full capacity without duplicates. */
export function createTimedEnemyEvents(getPoints, spawn, events = timedEnemyEvents, warn = () => {}) {
  const pending = new Map();
  return { update(seconds) {
    for (const event of events) {
      if (seconds<event.timeSeconds-(event.warningSeconds || 0)) continue;
      let state=pending.get(event.id);
      if (!state) { state={index:0,points:null};pending.set(event.id,state); }
      if (event.lifetimeSeconds != null && seconds >= event.timeSeconds+event.lifetimeSeconds) {
        state.index=event.count; continue;
      }
      if (state.index>=event.count) continue;
      state.points ??= getPoints(event);
      if (!state.points) continue;
      if (seconds<event.timeSeconds) {
        if (!state.warned) { warn(event,state.points);state.warned=true; }
        continue;
      }
      while (state.index<event.count) {
        if (!spawn(event,state.points[state.index])) break;
        state.index++;
      }
    }
  }};
}


/** Lock a horde's course at spawn; it never homes toward later player positions. */
export function hordeMotion(enemy) {
  const angle = enemy.chargeAngle ?? 0;
  const directions=['right','downRight','down','downLeft','left','upLeft','up','upRight'];
  return {direction:directions[(Math.round(angle/(Math.PI/4))+8)%8],
    target:{x:enemy.x+Math.cos(angle)*10000,y:enemy.y+Math.sin(angle)*10000}};
}


/** Two opposite straight walls; split odd counts without losing enemies. */
export function wallSpawnPoints(bounds, count, vertical = true) {
  const first=Math.ceil(count/2), second=count-first;
  return [first,second].flatMap((amount,side)=>Array.from({length:amount},(_,i)=>{
    const t=amount>1?i/(amount-1):.5;
    return vertical?{x:side?bounds.right:bounds.left,y:bounds.top+t*(bounds.bottom-bounds.top)}:
      {x:bounds.left+t*(bounds.right-bounds.left),y:side?bounds.bottom:bounds.top};
  }));
}

/** Only numeric overrides replace the enemy defaults; unspecified stats remain intact. */
export function timedEventStatOverrides(event, base = {}) {
  const stats=event?.stats;
  if (!stats || typeof stats!=='object') return {};
  return {...(Number.isFinite(stats.hp)?{hp:stats.hp,maxHp:stats.hp}:{}),
    ...(Number.isFinite(stats.atk)?{contactDamage:stats.atk}:
      Number.isFinite(stats.atkMultiplier)?{contactDamage:base.contactDamage*stats.atkMultiplier}:{}),
    ...(Number.isFinite(stats.spd)?{movementSpeedMultiplier:stats.spd*playerSettings.speed/playerSettings.movementBase}:Number.isFinite(stats.spdMultiplier)?{movementSpeedMultiplier:base.movementSpeedMultiplier*stats.spdMultiplier}:{}),
    ...(Number.isFinite(stats.exp)?{expReward:stats.exp}:{})};
}


/** Evenly spaced complete circle around the player's position at formation creation. */
export function ringSpawnPoints(center, count, radius) {
  return Array.from({length:count},(_,i)=>{
    const angle=i/count*Math.PI*2;
    return {x:center.x+Math.cos(angle)*radius,y:center.y+Math.sin(angle)*radius};
  });
}


/** One straight line perpendicular to its fixed charge direction. */
export function stampedeSpawnPoints(anchor, target, count, spacing) {
  const angle=Math.atan2(target.y-anchor.y,target.x-anchor.x);
  return Array.from({length:count},(_,i)=>{
    const side=(i-(count-1)/2)*spacing;
    return {x:anchor.x-Math.sin(angle)*side,y:anchor.y+Math.cos(angle)*side,chargeAngle:angle};
  });
}


/** Push a point beyond the viewport, including the full sprite and a safety gap. */
export function offscreenEventPoint(point, viewport, spriteSize, gap = 24) {
  const cx=viewport.x+viewport.width/2, cy=viewport.y+viewport.height/2;
  const hx=viewport.width/2+spriteSize/2+gap, hy=viewport.height/2+spriteSize/2+gap;
  let dx=point.x-cx, dy=point.y-cy;
  if (Math.abs(dx)>=hx || Math.abs(dy)>=hy) return {...point};
  if (!dx && !dy) dx=1;
  const scale=Math.min(dx?hx/Math.abs(dx):Infinity,dy?hy/Math.abs(dy):Infinity);
  return {...point,x:cx+dx*scale,y:cy+dy*scale};
}
