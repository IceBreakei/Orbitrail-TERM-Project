import { arisWeaponSettings, attackTimeFormula, supernovaSkillSettings, arisBeamVisualSettings } from './game-config.js';
import { statMultiplier, ensureCombatStats, rollAttackDamage, totalWeaponDamage } from './combat-stats.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { applySkillControl } from './enemy-control.js';
import { drawFiringRings } from './firing-rings.js';

/** Create Supernova with independent automatic and EX attacks. */
export function createArisWeapon() {
  return { id: 'aris-laser', name: 'Supernova', icon: '../sprites/attacks/Weapon_Icon_Arisu.png',
    level: 1, iconRotation: -45, exSkill: true };
}

/** Find the equipped laser, independently of every other automatic weapon. */
export function getArisWeapon(player) {
  return player.attackSlots?.find(weapon => weapon?.id === 'aris-laser');
}

/** Size bonuses add to base width; level7 adds a rear beam to each volley. */
export function arisLevelStats(player) {
  const level = Math.max(1, Math.min(7, getArisWeapon(player)?.level || 1));
  return { level, size: 1 + (level >= 2 ? .3 : 0) + (level >= 6 ? .5 : 0),
    damage: level >= 4 ? 1.5 : 1,
    interval: arisWeaponSettings.attackInterval - (level >= 3 ? .5 : 0) - (level >= 5 ? .5 : 0),
    beams: level >= 7 ? 2 : 1 };
}

/** Roll the supplied27-33base damage range, then weapon levels and player ATK/crit. */
export function rollArisDamage(player, random = Math.random, target, damageMod = 1) {
  const s = arisWeaponSettings;
  return rollAttackDamage(player, totalWeaponDamage(player, 'aris-laser', s.damageMultiplier,
    [(arisLevelStats(player).damage - 1) * 100],
    { projectileCount: arisLevelStats(player).beams, hitCooldownFrames: s.hitCooldown * 60 }), random, { target, damageMod });
}

/** Invisible piercing capsule starts at the player, bridging the decorative muzzle gap. */
export function arisBeamHits(enemy, origin, angle, width, length = arisWeaponSettings.beamLength) {
  const body = getEnemyHurtbox(enemy);
  return segmentHitsBody({ ...body, rx: body.rx + width / 2, ry: body.ry + width / 2 },
    origin.x, origin.y, origin.x + Math.cos(angle) * length, origin.y + Math.sin(angle) * length);
}

/** Own an independent automatic laser cycle alongside all other equipped autoattacks. */
export function createArisAttack({getWeapon=getArisWeapon,specialHitCooldown=supernovaSkillSettings.hitCooldown,
  rollSpecialDamage=(player,enemy,multiplier)=>rollArisDamage(player,Math.random,enemy,multiplier),onSpecialHit=()=>{}}={}) {
  let autoattackEnabled = true;
  let special = null;
  let owner = null, cooldown = 0, clock = 0, volleys = [];
  const hitTimes = new Map();
  function clear() { special = null; owner = null; cooldown = 0; clock = 0; volleys = []; hitTimes.clear(); }
  const s = arisWeaponSettings;
  const image = new Image();
  image.src = new URL('../sprites/attacks/Weapon_Icon_Arisu.png', import.meta.url).href;
  const ready = image.decode();
  return {
    ready,
    reset: clear,
    /** Remove automatic volleys only; an active EX continues updating and dealing damage. */
    setAutoattackEnabled(enabled) { autoattackEnabled=Boolean(enabled); if(!autoattackEnabled) volleys=[]; },
    /** Start a continuous, independently aimable EX; shared per-target cooldown prevents frame damage. */
    cast(player, angle, damageMultiplier = 1.5, getAngle = () => angle) {
      if (owner !== player) { clear(); owner = player; }
      volleys = []; // Cancel the current automatic beam before the EX opening.
      special = { player, angle, getAngle, damageMultiplier, elapsed: 0, hits: new Map() };
    },
    update(delta, player, aim) {
      if (!getWeapon(player)) { clear(); return; }
      if (owner !== player) { clear(); owner = player; }
      clock += delta;
      if (special) {
        special.elapsed += delta;
        special.angle = special.getAngle();
        if (supernovaBeamPhase(special.elapsed).finished || special.player !== player) special = null;
      }
      for (const [id, time] of hitTimes) if (clock-time > s.hitCooldown+s.beamSeconds) hitTimes.delete(id);
      if (autoattackEnabled && !special) cooldown = Math.max(0, cooldown - delta);
      if (autoattackEnabled && !special && cooldown <= 0) {
        const stats = arisLevelStats(player);
        volleys.push({ elapsed: 0, angles: stats.beams === 2 ? [aim, aim + Math.PI] : [aim],
          width: s.beamWidth * stats.size, origin: arisBeamAnchor(player) });
        cooldown = attackTimeFormula(stats.interval, ensureCombatStats(player).hastePercent);
      }
      const active = [...volleys];
      if (special && supernovaBeamPhase(special.elapsed).damaging) active.push({ elapsed: special.elapsed, angles: [special.angle], width: supernovaSkillSettings.beamWidth,
        origin: arisBeamAnchor(player), special: true });
      for (const volley of active) {
        const start = volley.elapsed;
        volley.elapsed += delta;
        volley.origin = arisBeamAnchor(player);
        if (volley.special || start < s.beamSeconds) for (const enemy of getAllEnemies()) {
          const times = volley.special ? special.hits : hitTimes;
          const lastHit = times.get(enemy.id);
          if (lastHit !== undefined && clock - lastHit < (volley.special ? specialHitCooldown : s.hitCooldown) - 1e-8) continue;
          const angle = volley.angles.find(value => arisBeamHits(enemy, volley.origin, value, volley.width));
          if (angle === undefined) continue;
          times.set(enemy.id, clock); // A missed attack also cannot reroll every frame.
          const hit = volley.special?rollSpecialDamage(player,enemy,special.damageMultiplier):rollArisDamage(player,Math.random,enemy,1);
          const landed = damageEnemy(enemy.id, hit.damage, player, hit.type, { canMiss: true });
          if(volley.special&&landed!==false)onSpecialHit(enemy,hit,player);
          const living = getEnemy(enemy.id);
          if (landed !== false && living) {
            if (volley.special) {
              const control = supernovaKnockback(living, volley.origin, angle, volley.width);
              applySkillControl(living, control.x, control.y, supernovaSkillSettings.knockbackSeconds,
                supernovaSkillSettings.knockbackSeconds,
                { ignoreKnockbackResistance: supernovaSkillSettings.ignoreKnockbackResistance });
            } else {
              const distance = s.knockbackSpeed * s.knockbackSeconds;
              applySkillControl(living, Math.cos(angle) * distance, Math.sin(angle) * distance,
                s.knockbackSeconds, s.knockbackSeconds, { ignoreKnockbackResistance: s.ignoreKnockbackResistance });
            }
          }
        }
      }
      volleys = volleys.filter(volley => volley.elapsed < s.beamSeconds * arisBeamVisualSettings.durationMultiplier);
    },
    draw(context, camera) {
      const visible = [...volleys];
      const phase = special ? supernovaBeamPhase(special.elapsed) : null;
      if (special && image.naturalWidth) {
        // This entire pass is drawn before the player: the gun emerges from behind her.
        const pose = supernovaWeaponPose(special.elapsed, special.player, special.angle);
        context.save();
        const anchor = arisBeamAnchor(special.player);
        context.translate(anchor.x-camera.x, anchor.y-camera.y);
        context.rotate(special.angle);
        context.globalAlpha = pose.opacity;
        const height = pose.length * image.naturalHeight/image.naturalWidth;
        context.shadowColor = '#63eaff'; context.shadowBlur = 12*pose.opacity;
        context.drawImage(image, pose.offset-pose.length/2, -height/2, pose.length, height);
        if(special.elapsed>=arisBeamVisualSettings.openingSeconds&&phase.beamAge<0) {
          const charge=Math.min(1,(special.elapsed-arisBeamVisualSettings.openingSeconds)/arisBeamVisualSettings.prelaunchSeconds);
          const muzzle=arisBeamOffset(anchor,special.angle,true)+supernovaSkillSettings.beamStartAdjustment;
          const radius=4+12*charge;
          context.globalCompositeOperation='lighter';context.shadowBlur=0;
          const light=context.createRadialGradient(muzzle,0,0,muzzle,0,radius*2);
          light.addColorStop(0,'rgba(235,255,255,.85)');light.addColorStop(.4,'rgba(90,215,255,.4)');light.addColorStop(1,'rgba(50,160,255,0)');
          context.fillStyle=light;context.beginPath();context.arc(muzzle,0,radius*2,0,Math.PI*2);context.fill();
          context.strokeStyle='rgba(160,240,255,.6)';context.lineWidth=1;
          context.beginPath();context.arc(muzzle,0,24*(1-charge)+3,0,Math.PI*2);context.stroke();
          for(let i=0;i<5;i++) {
            const angle=i*Math.PI*2/5+special.elapsed*2,distance=8+(1-charge)*24;
            context.beginPath();context.arc(muzzle+Math.cos(angle)*distance,Math.sin(angle)*distance,1.2,0,Math.PI*2);context.fill();
          }
        }
        context.restore();
      }
      if(special&&phase.beamAge>=0) {
        const anchor=arisBeamAnchor(special.player),muzzle=arisBeamOffset(anchor,special.angle,true)+supernovaSkillSettings.beamStartAdjustment;
        drawFiringRings(context,anchor.x-camera.x+Math.cos(special.angle)*muzzle,
          anchor.y-camera.y+Math.sin(special.angle)*muzzle,special.angle,phase.beamAge,supernovaSkillSettings.beamWidth*.55,true);
      }
      if (special && phase.beamAge >= 0 && !phase.beamFinished) visible.push({ elapsed: phase.beamAge, angles: [special.angle], origin: arisBeamAnchor(special.player),
        width: supernovaSkillSettings.beamWidth, special: true });
      for (const volley of visible) {
        const activeDuration = volley.special ? supernovaSkillSettings.duration : s.beamSeconds;
        const visualDuration = activeDuration * arisBeamVisualSettings.durationMultiplier;
        const collapse = Math.max(.06, visualDuration-activeDuration);
        const pulse = 1 + arisBeamVisualSettings.pulseDepth *
          Math.sin(volley.elapsed*Math.PI*2*arisBeamVisualSettings.pulsesPerSecond) ** 8;
        const thickness = Math.max(0, Math.min(1, volley.elapsed/.025,
          (visualDuration-volley.elapsed)/collapse)) * pulse;
        for (const angle of volley.angles) {
          context.save();
          context.translate(volley.origin.x - camera.x, volley.origin.y - camera.y);
          context.rotate(angle);
          // Shift only the EX light cone toward the gun; the weapon emergence stays anchored.
          const offset = arisBeamOffset(volley.origin,angle,volley.special) +
            (volley.special ? supernovaSkillSettings.beamStartAdjustment : 0);
          const cone = arisBeamVisualSettings.coneLength;
          // Additive bloom spreads blue/cyan light around the beam without changing its hit area.
          const visual = arisBeamVisualSettings;
          const layers = [
            [visual.bloomSpread, `rgba(36,151,255,${visual.bloomOpacity})`, visual.bloomBlur, 'lighter'],
            [2.1, `rgba(112,243,255,${visual.bloomOpacity})`, visual.bloomBlur*.5, 'lighter'],
            [2.2, '#219bff88', visual.outerBlur, 'source-over'],
            [1.3, '#51e6ffdd', visual.innerBlur, 'source-over'],
            [.55, '#f1ffff', 1.5, 'source-over']
          ];
          for (const [scale, color, blur, blend] of layers) {
            context.globalCompositeOperation = blend;
            const half = volley.width * scale * thickness / 2;
            context.filter = `blur(${blur}px)`;
            context.fillStyle = color;
            // Curved shoulders and a rounded nose soften the former triangular opening.
            context.beginPath(); context.moveTo(offset, 0);
            context.bezierCurveTo(offset, -half*.35, offset+cone*.45, -half, offset+cone, -half);
            context.lineTo(s.beamLength, -half); context.lineTo(s.beamLength, half);
            context.lineTo(offset+cone, half);
            context.bezierCurveTo(offset+cone*.45, half, offset, half*.35, offset, 0);
            context.closePath(); context.fill();
          }
          context.restore();
        }
      }
    }
  };
}


/** Sweep toward the closest beam edge, plus a small forward shove.
 * Include projected body radius so even large enemies clear the beam at zero resistance.
 * Shared knockback still respects resistance, collisions and absolute immunity.
 */
export function supernovaKnockback(enemy, origin, angle, width) {
  const body = getCombatHitbox(enemy, true);
  const forwardX = Math.cos(angle), forwardY = Math.sin(angle);
  const sideX = -forwardY, sideY = forwardX;
  const offset = (body.x-origin.x)*sideX + (body.y-origin.y)*sideY;
  const sign = offset < 0 ? -1 : 1;
  const radius = Math.hypot(body.rx*sideX, body.ry*sideY);
  const distance = Math.max(0, width/2 + radius + supernovaSkillSettings.knockbackClearance - Math.abs(offset));
  return {
    x: sideX*sign*distance + forwardX*supernovaSkillSettings.forwardKnockback,
    y: sideY*sign*distance + forwardY*supernovaSkillSettings.forwardKnockback
  };
}


/** Pure presentation timing; only the active3seconds authorize EX damage. */
export function supernovaBeamPhase(elapsed) {
  const openingDuration = arisBeamVisualSettings.openingSeconds + arisBeamVisualSettings.prelaunchSeconds;
  const beamAge = elapsed-openingDuration;
  return { openingDuration, beamAge,
    damaging: beamAge >= 0 && beamAge < supernovaSkillSettings.duration,
    beamFinished: beamAge >= supernovaSkillSettings.duration * arisBeamVisualSettings.durationMultiplier,
    finished: beamAge >= supernovaSkillSettings.duration * arisBeamVisualSettings.durationMultiplier +
      arisBeamVisualSettings.weaponReturnSeconds };
}


/** Fade and slide out from the player's center, hold through firing/tail, then return. */
export function supernovaWeaponPose(elapsed, player = {label:'Plana',x:0,y:0}, angle = 0) {
  const visual = arisBeamVisualSettings;
  const phase = supernovaBeamPhase(elapsed);
  const smooth = value => { const t = Math.max(0, Math.min(1, value)); return t*t*(3-2*t); };
  const emerge = smooth(elapsed/visual.openingSeconds);
  const returnStart = phase.openingDuration + supernovaSkillSettings.duration*visual.durationMultiplier;
  const returning = smooth((elapsed-returnStart)/visual.weaponReturnSeconds);
  const progress = emerge*(1-returning);
  return {opacity:progress, offset:(arisBeamOffset(arisBeamAnchor(player),angle,true)-visual.weaponLength/2)*progress,
    length:visual.weaponLength};
}


/** Use the real player collider center, including its vertical sprite offset. */
export function arisBeamAnchor(player) { return getCombatHitbox(player, false); }

/** Automatic beam starts 10px beyond the collider; EX adds its independent muzzle gap. */
export function arisBeamOffset(anchor, angle, special = false) {
  const rx = Math.max(anchor.rx || 0, 0.000001), ry = Math.max(anchor.ry || 0, 0.000001);
  return 1/Math.hypot(Math.cos(angle)/rx,Math.sin(angle)/ry) + supernovaSkillSettings.hitboxGap + (special ? supernovaSkillSettings.extraMuzzleGap : 0);
}
