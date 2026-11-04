import { knockbackSettings } from './game-config.js';
import { getCombatHitbox, segmentHitsBody } from './combat-hitboxes.js';

/** Age resistance in gameplay seconds, retaining any configured base resistance. */
export function updateKnockbackResistance(enemy, delta) {
  if (enemy.knockbackIdleSeconds === undefined) return;
  enemy.knockbackIdleSeconds += Math.max(0, delta);
  if (enemy.knockbackIdleSeconds >= knockbackSettings.resetSeconds - 1e-8) enemy.knockbackResistanceBonus = 0;
  enemy.knockbackResistance = Math.min(knockbackSettings.maxResistance,
    Math.max(0, enemy.baseKnockbackResistance || 0) + (enemy.knockbackResistanceBonus || 0));
}

/** Scale speed by existing resistance, then add a stack for subsequent knockbacks. */
export function beginKnockback(enemy, dx, dy, duration, { ignoreKnockbackResistance = false } = {}) {
  // Absolute immunity also blocks attacks that bypass resistance.
  if (enemy.knockbackImmune || !(duration > 0) || !(Math.hypot(dx, dy) > 0)) return null;
  updateKnockbackResistance(enemy, 0);
  const resistance = Math.min(knockbackSettings.maxResistance,
    Math.max(0, enemy.baseKnockbackResistance || 0) + (enemy.knockbackResistanceBonus || 0));
  const scale = ignoreKnockbackResistance ? 1 : 1 - resistance;
  enemy.knockbackResistanceBonus = Math.min(knockbackSettings.maxResistance,
    Math.round(((enemy.knockbackResistanceBonus || 0) + knockbackSettings.resistancePerHit) * 1e6) / 1e6);
  enemy.knockbackIdleSeconds = 0;
  enemy.knockbackResistance = Math.min(knockbackSettings.maxResistance,
    Math.max(0, enemy.baseKnockbackResistance || 0) + enemy.knockbackResistanceBonus);
  return { dx: dx * scale, dy: dy * scale, duration, elapsed: 0, applied: 0, stopped: false };
}

/** Stop displacement without removing an independent stun or contact recovery timer. */
export function stopEnemyKnockback(enemy) {
  if (enemy.skillKnockback) enemy.skillKnockback.stopped = true;
  if (enemy.contactReaction) enemy.contactReaction.stopped = true;
}

/** Travel at constant effect speed until duration expires or the mover reports collision. */
export function advanceKnockback(enemy, motion, delta, move) {
  motion.elapsed += Math.max(0, delta);
  const progress = Math.min(1, motion.elapsed / motion.duration);
  const step = progress - motion.applied;
  if (!motion.stopped && step > 0 && move(enemy, motion.dx * step, motion.dy * step) === false) motion.stopped = true;
  motion.applied = progress;
  return !motion.stopped && progress < 1;
}

/** Sweep living enemies and sample solid scenery; never slide or pass through a collision. */
export function createKnockbackMover(getEnemies, isClear) {
  return (enemy, dx, dy) => {
    const start = getCombatHitbox(enemy, true);
    const length = Math.hypot(dx, dy);
    if (!length) return true;
    const candidates = getEnemies().filter(other => other !== enemy && (!enemy.id || other.id !== enemy.id))
      .map(other => ({ other, body: getCombatHitbox(other, true) }))
      .filter(({ body }) => Math.abs(body.x - start.x) <= Math.abs(dx) + body.rx + start.rx &&
        Math.abs(body.y - start.y) <= Math.abs(dy) + body.ry + start.ry);
    const stepSize = Math.max(.25, Math.min(knockbackSettings.collisionStep, start.rx / 2, start.ry / 2));
    const steps = Math.max(1, Math.ceil(length / stepSize));
    const stepX = dx / steps, stepY = dy / steps;
    for (let i = 0; i < steps; i++) {
      const x = enemy.x + stepX, y = enemy.y + stepY;
      const body = getCombatHitbox({ ...enemy, x, y }, true);
      const previous = getCombatHitbox(enemy, true);
      const hit = candidates.find(({ body: other }) => segmentHitsBody({ ...other,
        rx: other.rx + body.rx, ry: other.ry + body.ry }, previous.x, previous.y, body.x, body.y));
      if (hit || !isClear(enemy, x, y)) {
        stopEnemyKnockback(enemy);
        if (hit) stopEnemyKnockback(hit.other);
        return false;
      }
      enemy.x = x; enemy.y = y;
    }
    return true;
  };
}
