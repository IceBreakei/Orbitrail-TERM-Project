import { enemyContactDamageFormula } from './game-config.js';
import { yuukaSettings } from './game-config.js';
import { contactSettings } from './game-config.js';
export { contactSettings } from './game-config.js';
import { getCombatHitbox } from './combat-hitboxes.js';
import { damagePlayer } from './player-stats.js';
import { beginKnockback, advanceKnockback } from './knockback.js';

// Contact reaction settings live in game-config.js.
/** Detect player pass-through with a swept segment rather than endpoint overlap only. */
function contactGeometry(npc, player, motion) {
  const enemyBody = getCombatHitbox(npc, true), playerBody = getCombatHitbox(player, false);
  const rx = enemyBody.rx + playerBody.rx, ry = enemyBody.ry + playerBody.ry;
  const fromX = playerBody.x - motion.x, fromY = playerBody.y - motion.y;
  const lengthSquared = motion.x * motion.x + motion.y * motion.y;
  const scaledLength = (motion.x / rx) ** 2 + (motion.y / ry) ** 2;
  const t = scaledLength ? Math.max(0, Math.min(1,
    ((enemyBody.x - fromX) * motion.x / rx ** 2 +
      (enemyBody.y - fromY) * motion.y / ry ** 2) / scaledLength)) : 1;
  const dx = enemyBody.x - (fromX + motion.x * t);
  const dy = enemyBody.y - (fromY + motion.y * t);
  const distance = Math.hypot(dx, dy);
  const pushing = lengthSquared > 0.0001 &&
    motion.x * (npc.x - fromX) + motion.y * (npc.y - fromY) > 0;
  // At exact overlap, push along player travel; otherwise away from the player.
  const fallbackLength = Math.hypot(motion.x, motion.y) || 1;
  const nx = distance > 0.001 ? dx / distance : lengthSquared ? motion.x / fallbackLength : 1;
  const ny = distance > 0.001 ? dy / distance : lengthSquared ? motion.y / fallbackLength : 0;
  const radius = 1 / Math.hypot(nx / rx, ny / ry);
  return { touching: (dx / rx) ** 2 + (dy / ry) ** 2 < 1, pushing, radius, nx, ny,
    overlap: Math.max(0, radius - Math.hypot(enemyBody.x - playerBody.x, enemyBody.y - playerBody.y)) };
}

/** React to contact, flash once, and pause chase until bounce/push recovery ends. */
export function updateNpcContact(npc, player, motion, delta, move, survivalSeconds = 0) {
  npc.contactCooldown = Math.max(0, (npc.contactCooldown || 0) - delta);
  // Per-enemy attack cooldown is separate from recoil and the player's global I-frames.
  npc.playerHitCooldown = Math.max(0, (npc.playerHitCooldown || 0) - delta);
  const hit = contactGeometry(npc, player, motion);
  if (hit.touching && !(player.contactIFrames > 0) && !(npc.playerHitCooldown > 0)) {
    const baseDamage = npc.contactDamage ?? (npc.type === 'mob' ? contactSettings.mobDamage : contactSettings.playerDamage);
    const damage = npc.perTypeStats ? Math.floor(baseDamage * (npc.contactDamageMultiplier ?? 1)) :
      enemyContactDamageFormula(baseDamage, player.level || 1, survivalSeconds, npc.contactDamageMultiplier ?? 1);
    const damaged = damagePlayer(player, damage);
    if (damaged && npc.type === 'yuuka') npc.playerHitCooldown = yuukaSettings.contactHitInterval;
    if (damaged) player.contactIFrames = contactSettings.iFrameDuration;
  }
  const overrideBounce = npc.contactReaction?.kind === 'bounce' && hit.pushing;
  if (hit.touching && ((!npc.contactReaction && !npc.contactCooldown) || overrideBounce)) {
    const kind = hit.pushing ? 'push' : 'bounce';
    const settings = contactSettings[kind];
    const overlap = hit.overlap;
    const knockback = beginKnockback(npc, hit.nx * (settings.distance + overlap),
      hit.ny * (settings.distance + overlap), settings.travel);
    npc.contactReaction = knockback ? { ...knockback, kind, nx: hit.nx, ny: hit.ny } : null;
    if (!knockback) npc.contactCooldown = contactSettings.cooldown;
    npc.attack = null;
  }
  const reaction = npc.contactReaction;
  if (!reaction) return false;
  const settings = contactSettings[reaction.kind];
  advanceKnockback(npc, reaction, delta, move);
  const pauseChase = npc.contactRecoveryDelay !== false;
  if (pauseChase) npc.moving = false;
  const recovery = pauseChase ? settings.recovery : settings.travel;
  if (reaction.elapsed >= recovery) {
    npc.contactReaction = null;
    npc.contactCooldown = contactSettings.cooldown;
  }
  // Bosses still recoil/flash, but do not skip their AI update or wait afterward.
  return pauseChase;
}
