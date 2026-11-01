// Visual remnants are separate from living NPCs: no AI, collisions, or rewards.
const deaths = new Map();
export const deathSettings = { duration: 0.38, fadeStart: 0.12, distance: 48 };

/** Freeze the defeated pose and launch it away from the source of the hit. */
export function beginEnemyDeath(enemy, source) {
  const dx = source ? enemy.x - source.x : enemy.contactReaction?.nx ?? 1;
  const dy = source ? enemy.y - source.y : enemy.contactReaction?.ny ?? 0;
  const length = Math.hypot(dx, dy);
  const death = { elapsed: 0, originX: enemy.x, originY: enemy.y,
    nx: length ? dx / length : 1, ny: length ? dy / length : 0, opacity: 1 };
  deaths.set(enemy.id, { ...enemy, death, transition: null, moving: false });
}

/** Advance every remnant, including offscreen ones, and remove after the fade. */
export function updateEnemyDeaths(delta) {
  for (const [id, enemy] of deaths) {
    const death = enemy.death;
    death.elapsed += delta;
    const progress = Math.min(1, death.elapsed / deathSettings.duration);
    const distance = deathSettings.distance * (1 - (1 - progress) ** 3);
    enemy.x = death.originX + death.nx * distance;
    enemy.y = death.originY + death.ny * distance;
    const fade = Math.max(0, Math.min(1,
      (death.elapsed - deathSettings.fadeStart) / (deathSettings.duration - deathSettings.fadeStart)));
    death.opacity = 1 - fade * fade;
    if (progress === 1) deaths.delete(id);
  }
}

/** Return visual-only remnants for the same camera culling as normal enemies. */
export function getEnemyDeaths() {
  return [...deaths.values()];
}
