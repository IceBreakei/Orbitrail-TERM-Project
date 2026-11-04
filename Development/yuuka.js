import { enemyViewportDistance } from './world-state.js';
import { normalSpriteSize } from './scene-metrics.js';
import { yuukaSpawnChanceFormula, yuukaSpawnSettings, harmlessEnemySettings } from './game-config.js';
import { yuukaHpFormula } from './game-config.js';
import { yuukaSettings } from './game-config.js';
export { yuukaSettings } from './game-config.js';
// Balance and automatic spawn probability live in game-config.js.


/** Harmless enemies use fixed HP; running offscreen normally ends their visit. */
export function yuukaHealth(playerDamage) {
  return harmlessEnemySettings.hp;
}

/** Frequently change heading, steering back toward the player when wandering too far. */
export function yuukaMotion(enemy, player, delta, random = Math.random) {
  enemy.erraticTimer = (enemy.erraticTimer || 0) - delta;
  if (enemy.erraticTimer <= 0) {
    enemy.erraticTimer = yuukaSettings.turnMin + random() * (yuukaSettings.turnMax - yuukaSettings.turnMin);
    const dx = player.x - enemy.x, dy = player.y - enemy.y;
    enemy.erraticAngle = Math.hypot(dx, dy) > yuukaSettings.roamRadius
      ? Math.atan2(dy, dx) + (random() - 0.5) * 2 : random() * Math.PI * 2;
  }
  const angle = enemy.erraticAngle;
  const names = ['right','downRight','down','downLeft','left','upLeft','up','upRight'];
  return { direction: names[(Math.round(angle / (Math.PI / 4)) + 8) % 8],
    target: { x: enemy.x + Math.cos(angle) * 10000, y: enemy.y + Math.sin(angle) * 10000 } };
}

/** Track eligible kills since Yuuka last spawned; successful spawns reset cooldown and pity. */
export function createYuukaSpawnCharge() {
  let kills = 0;
  let hasSpawned = false;
  return {
    recordKill() { kills++; },
    recordSpawn() { kills = 0; hasSpawned = true; },
    get kills() { return kills; },
    get remainingCooldown() {
      return Math.max(0, (hasSpawned ? Math.max(yuukaSpawnSettings.unlockKills, yuukaSpawnSettings.cooldownKills)
        : yuukaSpawnSettings.unlockKills) - kills);
    },
    get chance() { return yuukaSpawnChanceFormula(kills, hasSpawned); },
    chanceWithBoss(bossActive) { return yuukaSpawnChanceFormula(kills, hasSpawned, bossActive); },
    roll(random = Math.random, bossActive = false) {
      return this.remainingCooldown === 0 && random() < this.chanceWithBoss(bossActive);
    }
  };
}

/** Roam until lifetime expiry, then run toward an edge before despawning. */
export function updateYuukaPresence(enemy, camera, width, height, delta, random = Math.random) {
  if (!['yuuka', 'sensei'].includes(enemy.type) || delta <= 0) return false;
  enemy.yuukaAge = (enemy.yuukaAge || 0) + delta;
  const distance = enemyViewportDistance(enemy, camera, width, height);
  if (enemy.yuukaAge >= harmlessEnemySettings.lifetimeSeconds) {
    enemy.harmlessEscaping = true;
    enemy.ai = true;
    // Choose the nearest screen edge and continue running out instead of popping away.
    enemy.erraticAngle ??= 0;
    if (enemy.escapeAngle === undefined) {
      const edges = [
        {distance: Math.abs(enemy.x-camera.x), angle: Math.PI},
        {distance: Math.abs(enemy.x-camera.x-width), angle: 0},
        {distance: Math.abs(enemy.y-camera.y), angle: -Math.PI/2},
        {distance: Math.abs(enemy.y-camera.y-height), angle: Math.PI/2}
      ].sort((a,b)=>a.distance-b.distance);
      enemy.escapeAngle = edges[0].angle;
    }
    enemy.erraticAngle = enemy.escapeAngle;
    enemy.erraticTimer = 1;
    return distance > 0; // Only remove once the entire sprite is beyond the viewport.
  }
  if (distance > yuukaSettings.protectedOffscreenLimit) {
    enemy.erraticAngle = Math.atan2(playerCenterY(camera,height)-enemy.y, camera.x+width/2-enemy.x);
    enemy.erraticTimer = 1;
  }
  return false;
}

/** Automatic spawning waits until all living Yuukas, including manual instances, are gone. */
export function canSpawnYuuka(enemies) {
  return !enemies.some(enemy => enemy.type === 'yuuka');
}


function playerCenterY(camera, height) { return camera.y + height / 2; }

/** Each timestamp is rolled once; a frame crossing the timestamp cannot miss the roll. */
export function createHarmlessSpawnSchedule(random = Math.random) {
  const used = new Set();
  return {
    update(seconds, spawn) {
      for (const type of ['yuuka', 'sensei']) {
        for (const timestamp of harmlessEnemySettings[`${type}SpawnSeconds`]) {
          const key = `${type}:${timestamp}`;
          if (seconds < timestamp || used.has(key)) continue;
          used.add(key);
          if (random() < harmlessEnemySettings[`${type}Chance`]) spawn(type);
        }
      }
    }
  };
}
