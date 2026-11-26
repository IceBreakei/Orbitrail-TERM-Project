import { deathSettings, gachaSettings } from './game-config.js';
export { deathSettings, gachaSettings } from './game-config.js';
// Visual remnants are separate from living NPCs: no AI, collisions, or rewards.
const deaths = new Map();
const gachaEffects = new Map();
let gachaIcon;



/** Load the supplied gacha artwork before the preview begins. */
export function loadEnemyDeathGraphics() {
  gachaIcon = new Image();
  gachaIcon.src = '../sprites/icons/Gacha_Ticket.png';
  return gachaIcon.decode();
}

/** Calculate a fast eased rise, brief stop, then expansion and disappearance. */
export function gachaPose(effect) {
  const rise = Math.min(1, effect.elapsed / gachaSettings.rise);
  const pop = Math.max(0, Math.min(1,
    (effect.elapsed - gachaSettings.rise - gachaSettings.hold) / gachaSettings.pop));
  return { x: effect.x, y: effect.y - effect.height * (1 - (1 - rise) ** 3),
    scale: 0.75 + 0.25 * rise + 0.65 * pop,
    opacity: 1 - pop, behind: rise < 0.55 };
}

/** Freeze the defeated pose and launch it away from the source of the hit. */
export function beginEnemyDeath(enemy, source, { knockback = true } = {}) {
  const dx = source ? enemy.x - source.x : enemy.contactReaction?.nx ?? 1;
  const dy = source ? enemy.y - source.y : enemy.contactReaction?.ny ?? 0;
  const length = Math.hypot(dx, dy);
  const death = { elapsed: 0, originX: enemy.x, originY: enemy.y,
    nx: length ? dx / length : 1, ny: length ? dy / length : 0, opacity: 1, knockback };
  deaths.set(enemy.id, { ...enemy, death, transition: null, moving: false });
  gachaEffects.set(enemy.id, { x: enemy.x, y: enemy.y, elapsed: 0,
    height: (enemy.spriteSize || 112) / 2 + 28 });
}

/** Advance every remnant, including offscreen ones, and remove after the fade. */
export function updateEnemyDeaths(delta) {
  for (const [id, effect] of gachaEffects) {
    effect.elapsed += delta;
    if (effect.elapsed >= gachaSettings.rise + gachaSettings.hold + gachaSettings.pop) gachaEffects.delete(id);
  }
  for (const [id, enemy] of deaths) {
    const death = enemy.death;
    death.elapsed += delta;
    const progress = Math.min(1, death.elapsed / deathSettings.duration);
    const distance = death.knockback === false ? 0 : deathSettings.distance * (1 - (1 - progress) ** 3);
    enemy.x = death.originX + death.nx * distance;
    enemy.y = death.originY + death.ny * distance;
    const fade = Math.max(0, Math.min(1,
      (death.elapsed - deathSettings.fadeStart) / (deathSettings.duration - deathSettings.fadeStart)));
    death.opacity = 1 - fade * fade;
    if (progress === 1) deaths.delete(id);
  }
}

/** Render the rising icon behind bodies first, then above them as it pops. */
export function drawGachaDeaths(context, camera, width, height, behind) {
  if (!gachaIcon?.naturalWidth) return;
  for (const effect of gachaEffects.values()) {
    const pose = gachaPose(effect);
    const x = pose.x - camera.x, y = pose.y - camera.y;
    if (pose.behind !== behind || x < -100 || x > width + 100 || y < -100 || y > height + 100) continue;
    const w = gachaSettings.width * pose.scale;
    const h = w * gachaIcon.naturalHeight / gachaIcon.naturalWidth;
    context.save();
    context.globalAlpha = pose.opacity;
    context.drawImage(gachaIcon, x - w / 2, y - h / 2, w, h);
    context.restore();
  }
}

/** Return visual-only remnants for the same camera culling as normal enemies. */
export function getEnemyDeaths() {
  return [...deaths.values()];
}
