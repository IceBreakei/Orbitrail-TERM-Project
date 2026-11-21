import { beginKnockback, advanceKnockback } from './knockback.js';

/** Stun independently of displacement, respecting knockback resistance and absolute immunity. */
export function applySkillControl(enemy, dx, dy, stunSeconds, travelSeconds, options = {}) {
  enemy.stunRemaining = Math.max(enemy.stunRemaining || 0, stunSeconds);
  enemy.skillKnockback = beginKnockback(enemy, dx, dy, travelSeconds, options);
  enemy.contactReaction = null; enemy.attack = null; enemy.moving = false;
}

/** Resolve stun before AI/contact so a stunned enemy cannot move or damage the player. */
export function updateEnemyControl(enemy, delta, move) {
  if(enemy.frozenRemaining>0){
    enemy.frozenRemaining=Math.max(0,enemy.frozenRemaining-delta);
    if(enemy.frozenRemaining<1e-6)enemy.frozenRemaining=0;
    enemy.moving=false;return true; // Freeze also holds knockback and attack timers.
  }
  const stunned = enemy.stunRemaining > 0;
  if(stunned)enemy.stunVisualElapsed=(enemy.stunVisualElapsed||0)+delta;
  else delete enemy.stunVisualElapsed;
  if (!stunned && !enemy.skillKnockback) return false;
  enemy.stunRemaining = Math.max(0, (enemy.stunRemaining || 0) - delta);
  if (enemy.stunRemaining < 1e-6) enemy.stunRemaining = 0;
  const knockback = enemy.skillKnockback;
  if (knockback) {
    if (!advanceKnockback(enemy, knockback, delta, move)) delete enemy.skillKnockback;
  }
  if (stunned) enemy.moving = false;
  return stunned;
}
