import { endlessEliteSettings, eliteChance, eliteChanceFormula } from './game-config.js';

/** Own one repeatable endless elite buildup, followed by a forced boss wave. */
export function createEndlessBuildup(onBossReady) {
  let seconds = 0;
  let ready = false;
  return {
    get phase() {
      if (ready) return 'ready';
      if (seconds < endlessEliteSettings.rampStartSeconds) return 'normal';
      if (seconds < endlessEliteSettings.rampEndSeconds) return 'ramp';
      return 'elites';
    },
    get seconds() { return seconds; },
    // Admin shortcut starts the constant elite phase immediately.
    startElites() { seconds = endlessEliteSettings.rampEndSeconds; ready = false; },
    get eliteChance() { return ready ? eliteChance : eliteChanceFormula(seconds); },
    spawnRate(normalRate) {
      if (ready || seconds < endlessEliteSettings.rampStartSeconds) return normalRate;
      const progress = Math.max(0, Math.min(1, (seconds - endlessEliteSettings.rampStartSeconds) /
        Math.max(1, endlessEliteSettings.rampEndSeconds - endlessEliteSettings.rampStartSeconds)));
      return Math.round(normalRate + (endlessEliteSettings.maxSpawnRate - normalRate) * progress);
    },
    update(delta, { endless, bossAlive, spawning }) {
      if (!endless || bossAlive) { seconds = 0; ready = false; return; }
      if (!spawning || ready || !Number.isFinite(delta)) return;
      seconds += Math.max(0, delta);
      if (seconds >= endlessEliteSettings.rampEndSeconds + endlessEliteSettings.constantEliteSeconds) {
        ready = true; // Restore ordinary arrivals before killing elites or requesting the boss.
        onBossReady();
      }
    }
  };
}
