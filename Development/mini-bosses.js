import { enemyTypeStats, eliteSizeMultiplier } from './game-config.js';
import { combatHitboxes } from './combat-hitboxes.js';
import { normalSpriteSize } from './scene-metrics.js';

/** Mega Mob shares Mob's animation and body geometry, enlarged for mini-boss visibility. */
export function createMegaMob(template) {
  return {...template,label:'Mega Mob',miniBoss:true,boss:false,standard:false,special:true,
    spriteSize:(template.spriteSize || normalSpriteSize)*(template.megaSizeMultiplier ?? eliteSizeMultiplier),
    combatHitbox:combatHitboxes.mob};
}

/** Retry blocked/full-population placements; consume the one-shot only on success. */
export function createMiniBossSchedule() {
  const spawned = new Set();
  return { update(seconds, spawn) {
    for (const [type, profile] of Object.entries(enemyTypeStats)) {
      if (!['megaMob','megaSweeper'].includes(type) || profile.spawnAtSeconds == null || seconds < profile.spawnAtSeconds || spawned.has(type)) continue;
      if (spawn(type)) spawned.add(type);
    }
  }};
}


/** Mega Sweeper uses the existing Sweeper art/animation at the former elite scale. */
export function createMegaSweeper(template) {
  return {...createMegaMob(template),label:'Mega Sweeper'};
}
