import { planaSkillSettings, umbrellaSettings } from './game-config.js';
import { getAllEnemies, getEnemy, damageEnemy } from './world-state.js';
import { getCombatHitbox, getEnemyHurtbox, segmentHitsBody } from './combat-hitboxes.js';
import { rollUmbrellaDamage, umbrellaBaseDamage } from './weapon-progression.js';
import { skillCastSettings } from './game-config.js';
import { applySkillControl } from './enemy-control.js';

// SOURCE IMAGE crops: each opening pose is independent; unequal widths avoid adjacent-frame bleed.
export const umbrellaOpeningFrames = [
  [99,228,70,304],[308,228,109,304],[504,228,178,304],[727,228,222,304],
  [978,228,258,304],[1258,228,272,304],[1547,228,293,304],[1846,228,317,304]
];

/** Sweep a broad projectile capsule against an enemy's scaled body ellipse. */
export function umbrellaSkillHits(enemy, from, to, radius = planaSkillSettings.hitRadius) {
  const body = getEnemyHurtbox(enemy);
  return segmentHitsBody({ ...body, rx: body.rx + radius, ry: body.ry + radius }, from.x, from.y, to.x, to.y);
}

/** Open Plana's umbrella, then launch it forward with a path-clearing knockback/stun. */
export function createPlanaUmbrellaSkill() {
  const image = new Image(); image.src = new URL('../sprites/attacks/plana umbrella.png', import.meta.url).href;
  const ready = image.decode();
  let projectiles = [];
  return {
    ready,
    cast(player, angle, damageMultiplier = skillCastSettings.damageAverage, getLaunchAngle) {
      projectiles.push({ owner: player, angle, getLaunchAngle, x: player.x, y: player.y, elapsed: 0, tailElapsed: 0,
        damageMultiplier: Number.isFinite(damageMultiplier)
          ? Math.max(skillCastSettings.damageMinimum, Math.min(skillCastSettings.damageMaximum, damageMultiplier))
          : skillCastSettings.damageAverage,
        distance: 0, hits: new Set(), trail: [], baseDamage: umbrellaBaseDamage() });
    },
    reset() { projectiles = []; },
    update(delta) {
      const s = planaSkillSettings;
      for (const projectile of projectiles) {
        const previousTime = projectile.elapsed;
        const launchTime = s.openingSeconds + s.prelaunchSeconds;
        for (const point of projectile.trail) point.age += delta;
        projectile.trail = projectile.trail.filter(point => point.age < s.trailSeconds);
        if (projectile.distance >= s.maxDistance) {
          projectile.tailElapsed += delta;
          continue;
        }
        projectile.elapsed += delta;
        // Follow the arrow only during fade-in; the open-pose hold and flight use the locked angle.
        if (previousTime < s.openingSeconds && projectile.getLaunchAngle) {
          const aim = projectile.getLaunchAngle();
          if (Number.isFinite(aim)) projectile.angle = aim;
        }
        const ux = Math.cos(projectile.angle), uy = Math.sin(projectile.angle);
        if (previousTime < launchTime) {
          projectile.x = projectile.owner.x + ux * umbrellaSettings.baseRadius;
          projectile.y = projectile.owner.y + uy * umbrellaSettings.baseRadius;
        }
        const flightTime = Math.max(0, projectile.elapsed - Math.max(previousTime, launchTime));
        if (!flightTime) continue;
        const from = { x: projectile.x, y: projectile.y };
        const step = Math.min(s.maxDistance - projectile.distance, s.projectileSpeed * flightTime);
        projectile.x += ux * step; projectile.y += uy * step; projectile.distance += step;
        const to = { x: projectile.x, y: projectile.y };
        // Spatial sampling fills gaps even when a fast projectile travels far in one frame.
        const samples = Math.max(1, Math.ceil(step / s.trailSpacing));
        for (let i = 0; i < samples; i++) {
          const t = i / samples;
          projectile.trail.push({ x: from.x + (to.x - from.x) * t,
            y: from.y + (to.y - from.y) * t, age: (1 - t) * step / s.projectileSpeed });
        }
        projectile.trail = projectile.trail.slice(-s.maxTrailImages);
        for (const enemy of getAllEnemies()) {
          if (projectile.hits.has(enemy.id) || !umbrellaSkillHits(enemy, from, to)) continue;
          projectile.hits.add(enemy.id);
          const hit = rollUmbrellaDamage(projectile.owner, projectile.baseDamage, Math.random, projectile.damageMultiplier, enemy);
          const landed = damageEnemy(enemy.id, hit.damage, projectile.owner, hit.type, { canMiss: true });
          if (landed === false) continue; // A dodged attack cannot apply stun or knockback.
          const living = getEnemy(enemy.id);
          if (living) {
            // Push sideways away from the flight lane, with a smaller forward component.
            const side = (enemy.x - from.x) * -uy + (enemy.y - from.y) * ux;
            const sign = Math.abs(side) > .01 ? Math.sign(side) : projectile.hits.size % 2 ? 1 : -1;
            applySkillControl(living, -uy * sign * s.knockbackDistance + ux * s.knockbackDistance * .25,
              ux * sign * s.knockbackDistance + uy * s.knockbackDistance * .25, s.stunSeconds, s.knockbackSeconds, { ignoreKnockbackResistance: s.ignoreKnockbackResistance });
          }
        }
      }
      projectiles = projectiles.filter(projectile => projectile.distance < s.maxDistance || projectile.tailElapsed < s.trailSeconds);
    },
    draw(context, camera) {
      if (!image.naturalWidth) return;
      const s = planaSkillSettings;
      /** Draw one opening pose or blurred open-umbrella afterimage in world space. */
      function drawPose(projectile, point, index, opacity, blur = 0, scale = 1) {
        const [x, y, width, height] = umbrellaOpeningFrames[index];
        const length = s.displayLength * scale;
        context.save();
        context.globalAlpha = opacity;
        context.filter = blur ? `blur(${blur}px)` : 'none';
        context.translate(point.x - camera.x, point.y - camera.y);
        context.rotate(projectile.angle + Math.PI / 2);
        context.drawImage(image, x, y, width, height,
          -length * width / height / 2, -length / 2, length * width / height, length);
        context.restore();
      }
      for (const projectile of projectiles) {
        const launchTime = s.openingSeconds + s.prelaunchSeconds;
        if (projectile.elapsed < launchTime) {
          // Fade up as the sheet opens, then hold the open pose briefly before release.
          const progress = Math.min(1, projectile.elapsed / s.openingSeconds);
          const eased = progress * progress * (3 - 2 * progress);
          drawPose(projectile, projectile, Math.min(7, Math.floor(progress * 8)),
            eased, 0, .85 + .15 * eased);
          continue;
        }
        for (const point of projectile.trail) {
          const life = Math.max(0, 1 - point.age / s.trailSeconds);
          drawPose(projectile, point, 7, .085 * life * life, s.trailBlur);
        }
        // A soft continuous streak connects the sampled silhouettes into one swift blur.
        if (projectile.trail.length > 1) {
          context.save();
          context.globalAlpha = Math.max(0, 1 - projectile.tailElapsed / s.trailSeconds);
          context.filter = `blur(${s.trailBlur}px)`;
          const first = projectile.trail[0];
          const gradient = context.createLinearGradient(first.x-camera.x, first.y-camera.y,
            projectile.x-camera.x, projectile.y-camera.y);
          gradient.addColorStop(0, '#70dfff00');
          gradient.addColorStop(1, '#b9f4ff66');
          context.strokeStyle = gradient;
          context.lineWidth = s.displayLength * .26;
          context.lineCap = 'round';
          context.beginPath();
          context.moveTo(first.x-camera.x, first.y-camera.y);
          context.lineTo(projectile.x-camera.x, projectile.y-camera.y);
          context.stroke();
          context.restore();
        }
        const headOpacity = Math.max(0, 1 - projectile.tailElapsed / .08);
        drawPose(projectile, projectile, 7, headOpacity);
      }
    }
  };
}
