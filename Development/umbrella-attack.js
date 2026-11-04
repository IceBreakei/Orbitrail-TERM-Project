import { umbrellaSettings, attackTimeFormula } from './game-config.js';
export { umbrellaSettings } from './game-config.js';
import { getAllEnemies, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { umbrellaLevelStats, rollUmbrellaDamage } from './weapon-progression.js';
import { statMultiplier, ensureCombatStats } from './combat-stats.js';

// EDIT attack balance and timing here. Interval is measured start to start:
// 1.5 seconds total = 0.2 seconds swinging + 1.3 seconds before the next swing.
const crop = { x: 100, y: 228, width: 68, height: 304 };

/** Ease into a swift central slash, then decelerate at the end of a 180Ãƒâ€šÃ‚Â° sweep. */
export function umbrellaSwingAngle(aim, elapsed, duration = umbrellaSettings.duration) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const arc = umbrellaSettings.arcDegrees * Math.PI / 180;
  return aim - arc / 2 + eased * arc;
}

/** Test the swept blade sector so fast swings cannot skip enemies between frames. */
export function umbrellaHits(player, enemy, fromAngle, toAngle, areaScale = 1) {
  areaScale *= umbrellaSettings.sizeScale;
  const body = getEnemyHurtbox(enemy);
  const dx = body.x - player.x, dy = body.y - player.y;
  const distance = Math.hypot(dx, dy);
  const radius = Math.max(body.rx, body.ry);
  if (distance > umbrellaSettings.reach * areaScale + radius) return false;
  if (distance + radius < umbrellaSettings.damageInnerRadius * areaScale) return false;
  // Subdivide the swept sector into blade segments at most 2 degrees apart.
  const samples = Math.max(1, Math.ceil(Math.abs(toAngle - fromAngle) / (Math.PI / 90)));
  for (let i = 0; i <= samples; i++) {
    const angle = fromAngle + (toAngle - fromAngle) * i / samples;
    const x = Math.cos(angle), y = Math.sin(angle);
    if (segmentHitsBody(body,
      player.x + x * umbrellaSettings.damageInnerRadius * areaScale, player.y + y * umbrellaSettings.damageInnerRadius * areaScale,
      player.x + x * umbrellaSettings.reach * areaScale, player.y + y * umbrellaSettings.reach * areaScale)) return true;
  }
  return false;
}

/** Load the umbrella and own its repeating attack, hit tracking, and motion trail. */
export function createUmbrellaAttack() {
  const image = new Image();
  image.src = '../sprites/attacks/plana umbrella.png';
  const ready = image.decode();
  // Composite the dense trail first, then blur once instead of per afterimage.
  const trailCanvas = document.createElement('canvas');
  const trailCenter = Math.ceil(umbrellaSettings.reach + umbrellaSettings.trailBlur * 4 + 8);
  trailCanvas.width = trailCanvas.height = trailCenter * 2;
  const trailContext = trailCanvas.getContext('2d');
  let autoattackEnabled = true;
  let owner;
  let cycle = 0;
  let swing;
  let clock = 0;
  const hitTimes = new Map();

  /** Cancel attacks on avatar/loadout changes and start one sweep per configured attack interval. */
  function update(delta, player, aim) {
    if (!autoattackEnabled) return;
    const equipped = player.attackSlots?.some(item => item?.id === 'plana-umbrella');
    if (!equipped) { owner = null; swing = null; cycle = 0; clock = 0; hitTimes.clear(); return; }
    if (owner !== player) { owner = player; swing = null; cycle = 0; clock = 0; hitTimes.clear(); }
    clock += delta;
    for (const [id, time] of hitTimes) if (clock-time > umbrellaSettings.interval+umbrellaSettings.hitCooldown) hitTimes.delete(id);
    cycle = Math.max(0, cycle - delta);
    if (!swing && cycle <= 0) {
      const haste = 1; // Haste changes attack intervals, never swing duration or trails.
      const upgrades = umbrellaLevelStats(player);
      swing = { aim, areaScale: upgrades.areaScale, awakened: upgrades.awakened, elapsed: 0, previous: umbrellaSwingAngle(aim, 0), hits: new Set(), haste,
        duration: umbrellaSettings.duration / haste, linger: umbrellaSettings.trailLinger / haste };
      cycle = attackTimeFormula(umbrellaSettings.interval * upgrades.intervalMultiplier, ensureCombatStats(player).hastePercent);
    }
    if (swing) {
      const wasAttacking = swing.elapsed < swing.duration;
      swing.elapsed += delta;
      const angle = umbrellaSwingAngle(swing.aim, swing.elapsed, swing.duration);
      for (const enemy of wasAttacking ? getAllEnemies() : []) {
        if (!swing.hits.has(enemy.id) && clock - (hitTimes.get(enemy.id) ?? -Infinity) >= umbrellaSettings.hitCooldown - 1e-8 && umbrellaHits(player, enemy, swing.previous, angle, swing.areaScale)) {
          swing.hits.add(enemy.id);
          hitTimes.set(enemy.id, clock);
          const hit = rollUmbrellaDamage(player, undefined, Math.random, 1, enemy);
          damageEnemy(enemy.id, hit.damage, player, hit.type, { canMiss: true });
        }
      }
      swing.previous = angle;
      if (swing.elapsed >= swing.duration + swing.linger) swing = null;
    }
  }

  /** Draw one handle-anchored closed umbrella pose, pointing along the swing. */
  function drawBlade(context, angle, alpha) {
    context.save();
    context.rotate(angle + Math.PI / 2);
    context.globalAlpha = alpha;
    const length = umbrellaSettings.reach - umbrellaSettings.baseRadius;
    const width = length * crop.width / crop.height;
    if (swing.awakened && alpha === 1) { context.shadowColor = '#ffe271'; context.shadowBlur = 5; }
    context.drawImage(image, crop.x, crop.y, crop.width, crop.height,
      -width / 2, -umbrellaSettings.reach, width, length);
    context.restore();
  }

  /** Blur original umbrella sprite afterimages across the full sweep, without color overlays. */
  function draw(outputContext, camera) {
    if (!swing || !image.naturalWidth) return;
    const context = trailContext;
    context.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    context.save();
    context.translate(trailCenter, trailCenter);
    const angle = umbrellaSwingAngle(swing.aim, swing.elapsed, swing.duration);
    const visualTime = Math.min(swing.elapsed, swing.duration);
    const fade = (1 - Math.max(0, (swing.elapsed - swing.duration) / swing.linger)) ** 1.5;
    // Sample by ANGLE, not time: fast parts of the swing need more overlapping
    // poses, otherwise evenly timed ghosts separate into individual umbrellas.
    // Retain sprite afterimages across the whole travelled sweep. Their natural
    // dark/magenta colors come directly from the umbrella artwork, with no tint.
    const trailStart = umbrellaSwingAngle(swing.aim, 0, swing.duration);
    const span = angle - trailStart;
    const samples = Math.min(umbrellaSettings.maxAfterimages,
      Math.ceil(span / umbrellaSettings.trailAngleStep));
    for (let i = 0; i < samples; i++) {
      const weight = i / samples;
      drawBlade(context, trailStart + span * weight,
        (0.018 + 0.032 * weight * weight) * fade);
    }
    context.restore();
    outputContext.save();
    outputContext.translate(owner.x - camera.x, owner.y - camera.y);
    const size = swing.areaScale * umbrellaSettings.sizeScale;
    outputContext.scale(size, size);
    outputContext.filter = `blur(${umbrellaSettings.trailBlur}px)`;
    outputContext.drawImage(trailCanvas, -trailCenter, -trailCenter);
    outputContext.filter = 'none';
    // The actual umbrella ends on time; only its soft trail lingers afterward.
    if (swing.elapsed < swing.duration) drawBlade(outputContext, angle, 1);
    outputContext.restore();
  }

  /** Clear a pending swing when the scene is reset. */
  function reset() { owner = null; swing = null; cycle = 0; clock = 0; hitTimes.clear(); }
  return { ready, update, draw, reset,
    /** Stop the current swing immediately; this toggle does not control EX skills. */
    setAutoattackEnabled(enabled) { autoattackEnabled=Boolean(enabled); if(!autoattackEnabled) reset(); }
  };
}

