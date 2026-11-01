import { normalSpriteSize } from './scene-metrics.js';
import { damagePlayer } from './player-stats.js';
import { damageEnemy } from './world-state.js';

// EDIT reaction distance/timing independently of normal chase speed.
export const contactSettings = {
  bounce: { distance: 52, travel: 0.18, recovery: 0.6 },
  push: { distance: 14, travel: 0.09, recovery: 0.18 },
  cooldown: 0.12,
  playerDamage: 10, // EDIT default HP lost per accepted contact hit.
  enemyDamage: 10,
  iFrameDuration: 0.5 // Seconds; shared protection against every overlapping enemy.
};

/** Detect player pass-through with a swept segment rather than endpoint overlap only. */
function contactGeometry(npc, player, motion) {
  const radius = ((npc.spriteSize || normalSpriteSize) +
    (player.spriteSize || normalSpriteSize)) * 0.18;
  const fromX = player.x - motion.x, fromY = player.y - motion.y;
  const lengthSquared = motion.x * motion.x + motion.y * motion.y;
  const t = lengthSquared ? Math.max(0, Math.min(1,
    ((npc.x - fromX) * motion.x + (npc.y - fromY) * motion.y) / lengthSquared)) : 1;
  const dx = npc.x - (fromX + motion.x * t);
  const dy = npc.y - (fromY + motion.y * t);
  const distance = Math.hypot(dx, dy);
  const pushing = lengthSquared > 0.0001 &&
    motion.x * (npc.x - fromX) + motion.y * (npc.y - fromY) > 0;
  // At exact overlap, push along player travel; otherwise away from the player.
  const fallbackLength = Math.hypot(motion.x, motion.y) || 1;
  return { touching: distance < radius, pushing, radius,
    nx: distance > 0.001 ? dx / distance : lengthSquared ? motion.x / fallbackLength : 1,
    ny: distance > 0.001 ? dy / distance : lengthSquared ? motion.y / fallbackLength : 0 };
}

/** React to contact, flash once, and pause chase until bounce/push recovery ends. */
export function updateNpcContact(npc, player, motion, delta, move) {
  npc.contactCooldown = Math.max(0, (npc.contactCooldown || 0) - delta);
  const hit = contactGeometry(npc, player, motion);
  if (hit.touching && !(player.contactIFrames > 0)) {
    damagePlayer(player, contactSettings.playerDamage);
    player.contactIFrames = contactSettings.iFrameDuration;
    damageEnemy(npc.id, contactSettings.enemyDamage, player);
    if (npc.hp <= 0) return true;
  }
  const overrideBounce = npc.contactReaction?.kind === 'bounce' && hit.pushing;
  if (hit.touching && ((!npc.contactReaction && !npc.contactCooldown) || overrideBounce)) {
    const kind = hit.pushing ? 'push' : 'bounce';
    const settings = contactSettings[kind];
    const overlap = Math.max(0, hit.radius - Math.hypot(npc.x - player.x, npc.y - player.y));
    npc.contactReaction = {
      kind, elapsed: 0, nx: hit.nx, ny: hit.ny,
      distance: settings.distance + overlap, applied: 0
    };
    npc.attack = null;
  }
  const reaction = npc.contactReaction;
  if (!reaction) return false;
  const settings = contactSettings[reaction.kind];
  reaction.elapsed += delta;
  const t = Math.min(1, reaction.elapsed / settings.travel);
  const distance = reaction.distance * (1 - (1 - t) * (1 - t));
  const step = distance - reaction.applied;
  move(npc, reaction.nx * step, reaction.ny * step);
  reaction.applied = distance;
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
