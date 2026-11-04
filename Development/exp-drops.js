import { eliteExpTotalFormula } from './game-config.js';
import { pickupSettings, pickupRangeFormula } from './game-config.js';
import { mobExpFormula, reportSettings } from './game-config.js';
import { lootLandingRadius, pickupMagnet, creditDropChance, secretNoteDropChance, eliteLoot, dropScatter, eliteExpRewards, bossExpRewards } from './game-config.js';
export { lootLandingRadius, pickupMagnet, creditDropChance, secretNoteDropChance, eliteLoot, dropScatter, eliteExpRewards, bossExpRewards } from './game-config.js';
import { yuukaSettings } from './yuuka.js';
import { addPlayerExp, experienceForLevel } from './player-stats.js';
import { statMultiplier, ensureCombatStats } from './combat-stats.js';
import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';

// World-space records survive camera scrolling and map switches for this session.
const drops = new Map();
let nextId = 0;
let getActivePlayer = () => ({ level: 1 });
let isLandingClear = () => true;
 // Clearance for rotated report/credit/note artwork.
const iconWidth = pickupSettings.iconWidth; // EDIT drop size: 25% larger; roughly 30% of Plana's visible height.
const pickupRadius = pickupSettings.walkOverRadius; // EDIT walk-over collection radius in world pixels.
 // Pixels/secÃ‚Â² and pixels/sec.
 // EDIT occasional credit chance (~1.11%).
 // 0.1% per defeated enemy.
// EDIT elite bonus rewards independently of normal-enemy drop rates.

const lootTotals = { credits: 0, secretTechNotes: 0 }; // Shared across avatar swaps.


/** Find walkable ground near the intended landing, even if an enemy died inside an obstacle. */
export function safeDropLanding(x, y) {
  if (isLandingClear(x, y, lootLandingRadius)) return { x, y };
  for (let radius = 24; radius <= 2048; radius += 24) {
    const samples = Math.min(64, Math.ceil(radius / 12) * 8);
    for (let index = 0; index < samples; index++) {
      const angle = index / samples * Math.PI * 2;
      const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius;
      if (isLandingClear(px, py, lootLandingRadius)) return { x: px, y: py };
    }
  }
  return null;
}

/** Redirect a scatter to safe ground; retain unplaceable loot for a later retry. */
export function constrainDropLanding(drop) {
  const flight = drop.scatter;
  const landing = safeDropLanding(flight.x + flight.dx, flight.y + flight.dy);
  drop.pendingLanding = !landing;
  if (landing) {
    flight.dx = landing.x - flight.x;
    flight.dy = landing.y - flight.y;
  }
}

/** Launch loot toward a random nearby landing spot with a small airborne hop. */
export function launchDrop(drop, random = Math.random) {
  const angle = random() * Math.PI * 2;
  const distance = dropScatter.minDistance + random() * (dropScatter.maxDistance - dropScatter.minDistance);
  drop.scatter = { elapsed: 0, x: drop.x, y: drop.y,
    dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance,
    rotation: drop.rotation, spin: (random() - 0.5) * Math.PI };
  constrainDropLanding(drop);
  return drop;
}

/** Animate the outward toss before enabling pickup attraction or collection. */
export function updateDropScatter(drop, delta) {
  if (!drop.scatter) return false;
  if (drop.pendingLanding) {
    drop.landingRetry = (drop.landingRetry || 0) - delta;
    if (drop.landingRetry <= 0) { constrainDropLanding(drop); drop.landingRetry = 0.5; }
    if (drop.pendingLanding) return true;
  }
  const flight = drop.scatter;
  flight.elapsed += Math.max(0, delta);
  const t = Math.min(1, flight.elapsed / dropScatter.duration);
  const progress = 1 - (1 - t) ** 2;
  drop.x = flight.x + flight.dx * progress;
  drop.y = flight.y + flight.dy * progress;
  drop.lift = 4 * dropScatter.hopHeight * t * (1 - t);
  drop.rotation = flight.rotation + flight.spin * progress;
  if (t === 1) { delete drop.scatter; drop.lift = 0; }
  return true;
}

/** Read a snapshot of collected session inventory, including spendable awakening notes. */
export function getLootTotals() {
  return { ...lootTotals };
}

/** Award File Credits once when its opening completes. */
export function gainCredits(amount) {
  if(!Number.isFinite(amount)||amount<0)return false;
  lootTotals.credits+=Math.floor(amount);return true;
}

/** Spend run Credits atomically; rejected purchases never modify the balance. */
export function spendCredits(amount) {
  if(!Number.isInteger(amount)||amount<0||lootTotals.credits<amount)return false;
  lootTotals.credits-=amount;return true;
}

/** Spend collected notes atomically; failed awakenings never consume currency. */
export function spendSecretTechNotes(amount) {
  if (!Number.isInteger(amount) || amount <= 0 || lootTotals.secretTechNotes < amount) return false;
  lootTotals.secretTechNotes -= amount;
  return true;
}

/** Inspect all ground loot, including credits and Secret Tech Notes. */
export function getGroundLoot() {
  return [...drops.values()];
}

/** Discard uncollected loot on a map change; collected inventory remains intact. */
export function clearGroundLoot() {
  drops.clear();
}

/** Spawn a specific ground pickup for repeatable admin testing. */
export function spawnTestDrop(kind, value, x, y) {
  if (!['exp', 'credits', 'secretTechNotes'].includes(kind)) return;
  if (!Number.isFinite(value) || value < 1) return;
  const drop = { id: ++nextId, kind, value: Math.floor(value),
    tier: reportTier(value), x, y, rotation: Math.random() * Math.PI * 2 };
  drops.set(drop.id, drop);
  launchDrop(drop);
  return drop;
}

/** Apply one pickup's reward without coupling inventory to the controlled avatar. */
function collectDrop(drop, player) {
  drops.delete(drop.id);
  if (drop.kind === 'exp') addPlayerExp(player, drop.value);
  else lootTotals[drop.kind] += drop.value;
}

/** Burst Yuuka credits throughout a disk, with angular coverage in every direction. */
export function dropYuukaCredits(enemy, defeated = false, random = Math.random) {
  const count = defeated ? yuukaSettings.deathCredits : yuukaSettings.hitCredits;
  const radius = bossExpRewards.maxDistance * yuukaSettings.burstRadiusMultiplier;
  const angleOffset = random() * Math.PI * 2;
  const rewards = [];
  for (let index = 0; index < count; index++) {
    const drop = { id: ++nextId, kind: 'credits', value: 1, x: enemy.x,
      y: enemy.y + (enemy.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding,
      rotation: random() * Math.PI * 2 };
    drops.set(drop.id, drop);
    launchDrop(drop, random);
    if (defeated) {
      const angle = angleOffset + (index + random()) / count * Math.PI * 2;
      // Square root distributes credits by area, throughout the whole radius.
      const distance = Math.sqrt(random()) * radius;
      drop.scatter.dx = Math.cos(angle) * distance;
      drop.scatter.dy = Math.sin(angle) * distance;
      constrainDropLanding(drop);
    }
    rewards.push(drop);
  }
  return rewards;
}

/** Roll independent bonus drops, allowing both rewards on the same defeat. */
export function dropEnemyLoot(enemy, random = Math.random) {
  if (['yuuka','sensei'].includes(enemy.type)) return dropYuukaCredits(enemy, true, random);
  const credits = random() < (enemy.elite ? eliteLoot.creditChance : creditDropChance);
  const note = random() < (enemy.elite ? eliteLoot.noteChance : secretNoteDropChance);
  for (const [kind, awarded] of [['credits', credits], ['secretTechNotes', note]]) {
    if (!awarded) continue;
    const drop = {
      id: ++nextId, kind, value: kind === 'credits' && enemy.elite ? eliteLoot.creditAmount : 1,
      x: enemy.x,
      y: enemy.y + (enemy.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding,
      rotation: random() * Math.PI * 2
    };
    drops.set(drop.id, drop);
    launchDrop(drop, random);
  }
}

/** Select artwork by EXP value; the highest supplied file is named Report 3. */
export function reportTier(value) {
  return value > reportSettings.thirdMax ? 3 : value >= reportSettings.thirdMin ? 2 : value >= reportSettings.secondMin ? 1 : 0;
}

/** Roll a report's EXP value: elites get Report 1 (80%) or Report 2 (20%). */
export function rollEnemyExp(random = Math.random, elite = false) {
  if (elite) {
    return random() < reportSettings.eliteSecondChance
      ? reportSettings.secondMin + Math.floor(random() * (reportSettings.secondMax - reportSettings.secondMin + 1))
      : reportSettings.thirdMin + Math.floor(random() * (reportSettings.thirdMax - reportSettings.thirdMin + 1));
  }
  const uncommon = random() >= reportSettings.commonChance;
  return uncommon ? reportSettings.secondMin + Math.floor(random() * (reportSettings.secondMax - reportSettings.secondMin + 1))
    : reportSettings.firstMin + Math.floor(random() * (reportSettings.firstMax - reportSettings.firstMin + 1));
}

/** Expose ground records for inspection without deleting off-screen reports. */
export function getExpDrops() {
  return [...drops.values()].filter(drop => drop.kind === 'exp');
}



/** Scale elite rewards down, cap their combined EXP, and preserve positive report pickups. */
export function rollEliteReports(random = Math.random, override, player = getActivePlayer()) {
  const values = Array.from({ length: eliteExpRewards.count }, () =>
    Math.max(reportSettings.secondMin, Math.floor(override ?? rollEnemyExp(random, true))));
  let deficit = eliteExpRewards.minimumTotal - values.reduce((sum, value) => sum + value, 0);
  const indices = values.map((_, index) => index).sort((a, b) => values[b] - values[a]);
  for (const index of indices) {
    if (deficit <= 0) break;
    const extra = Math.min(deficit, Math.max(0, reportSettings.thirdMax - values[index]));
    values[index] += extra;
    deficit -= extra;
  }
  const rolledTotal = values.reduce((sum, value) => sum + value, 0);
  const total = eliteExpTotalFormula(rolledTotal, player?.level || 1);
  const count = Math.min(values.length, total);
  if (!count) return [];
  // Give every report one point, then share the remainder by its original roll weight.
  const weights = values.slice(0, count);
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  const rewards = weights.map(weight => 1 + Math.floor((total - count) * weight / weightTotal));
  let remaining = total - rewards.reduce((sum, value) => sum + value, 0);
  for (let index = 0; remaining > 0; index = (index + 1) % count, remaining--) rewards[index]++;
  return rewards;
}

// Boss reward settings live in game-config.js.


/** Split a level-scaled boss reward into positive reports without losing EXP. */
export function rollBossReports(player, random = Math.random, fixedTotal) {
  if (Number.isFinite(fixedTotal) && fixedTotal > 0) {
    const total = Math.round(fixedTotal);
    const count = Math.min(total, Math.max(bossExpRewards.minimumReports, Math.ceil(total/reportSettings.thirdMax)));
    return Array.from({length:count}, (_,i)=>Math.floor(total/count)+(i<total%count?1:0));
  }
  const requirement = experienceForLevel(player?.level || 1);
  const minimum = Math.max(bossExpRewards.minimumReports,
    Math.ceil(requirement * bossExpRewards.minLevels));
  const maximum = Math.max(minimum, Math.floor(requirement * bossExpRewards.maxLevels));
  const total = minimum + Math.floor(random() * (maximum - minimum + 1));
  const count = Math.max(bossExpRewards.minimumReports, Math.ceil(total / reportSettings.thirdMax));
  const base = Math.floor(total / count), remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

/** Divide player level by (2 + report tier), add 3, then round halves upward. */
export function standardMobExp(player, tier = 0) {
  return mobExpFormula(player?.level || 1, tier);
}

/** Drop a full-circle boss burst, five elite reports, or one ordinary report. */
export function dropEnemyExp(enemy, random = Math.random) {
  const reports = [];
  if (['yuuka','sensei'].includes(enemy.type)) return reports;
  const boss = enemy.boss === true || (enemy.boss !== false && ['iroha', 'shiroko'].includes(enemy.type));
  // Roll artwork first so its tier bonus does not depend on the resulting EXP.
  const standardMob = (enemy.type === 'mob' || enemy.standard) && !boss && !enemy.elite && enemy.expReward == null;
  const mobTier = standardMob ? (random() < reportSettings.commonChance ? 0 : 1) : undefined;
  const values = boss ? rollBossReports(getActivePlayer(), random, enemy.expReward) : (enemy.elite && !enemy.miniBoss) || enemy.type === 'yuuka' ? rollEliteReports(random, enemy.expReward)
    : [Math.floor(enemy.expReward ?? ((enemy.type === 'mob' || enemy.standard)
      ? standardMobExp(getActivePlayer(), mobTier) : rollEnemyExp(random)))];
  const burstAngle = boss ? random() * Math.PI * 2 : 0;
  for (const [index, value] of values.entries()) {
    const drop = dropExpReport(enemy, random, value, mobTier);
    if (!drop) continue;
    if (boss) {
      // One report per angular sector guarantees coverage in every direction.
      const angle = burstAngle + (index + random() * 0.5) / values.length * Math.PI * 2;
      const distance = bossExpRewards.minDistance + random() *
        (bossExpRewards.maxDistance - bossExpRewards.minDistance);
      drop.scatter.dx = Math.cos(angle) * distance;
      drop.scatter.dy = Math.sin(angle) * distance;
      constrainDropLanding(drop);
    }
    reports.push(drop);
  }
  return reports;
}

/** Create one scattered report; explicit admin EXP overrides remain supported. */
function dropExpReport(enemy, random, value, tier = reportTier(value)) {
  if (!Number.isFinite(value) || value <= 0) return;
  const drop = {
    id: ++nextId, kind: 'exp', value, tier, x: enemy.x,
    y: enemy.y + (enemy.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding,
    rotation: random() * Math.PI * 2
  };
  drops.set(drop.id, drop);
  launchDrop(drop, random);
  return drop;
}

/** Load report graphics once and provide collection/rendering for the preview. */
export function createExpPickups(getPlayer, options = {}) {
  isLandingClear = options.isLandingClear || (() => true);
  getActivePlayer = getPlayer; // Resolve the controlled avatar at the moment a boss dies.
  const lootStatus = document.querySelector('#player-loot-status');
  const tools = document.querySelector('#loot-tools');
  if (tools) {
    tools.querySelectorAll('[data-loot-action]').forEach(button => {
      button.addEventListener('click', () => {
        const player = getPlayer();
        const action = button.dataset.lootAction;
        if (action === 'clear') drops.clear();
        else if (action === 'collect') {
          for (const drop of drops.values()) collectDrop(drop, player);
        } else if (action === 'reset') {
          lootTotals.credits = 0;
          lootTotals.secretTechNotes = 0;
        } else {
          const amount = Number(tools.querySelector('[name="loot-value"]').value);
          spawnTestDrop(action, Math.min(1000000, amount), player.x + 80,
            player.y + (player.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding);
        }
      });
    });
  }
  const icons = Array.from({ length: 4 }, (_, tier) => {
    const image = new Image();
    image.src = `../sprites/icons/Exp_Report_${tier}.png`;
    return image;
  });
  const ready = Promise.all(icons.map(image => image.decode()));
  const creditIcon = new Image();
  creditIcon.src = '../sprites/icons/credits.png';
  const creditReady = creditIcon.decode();
  const noteIcon = new Image();
  noteIcon.src = '../sprites/icons/Ultimate_Skill_Book.png';
  const noteReady = noteIcon.decode();

  /** Sweep direct pickups, then accelerate attracted loot toward the active avatar. */
  function update(player, previous, delta = 0) {
    const footOffset = (player.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding;
    const start = { x: previous.x, y: previous.y + footOffset };
    const end = { x: player.x, y: player.y + footOffset };
    const dx = end.x - start.x, dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    for (const drop of drops.values()) {
      // Let the toss finish so contact kills cannot instantly swallow the drops.
      if (updateDropScatter(drop, delta)) continue;
      const fraction = lengthSquared ? Math.max(0, Math.min(1,
        ((drop.x - start.x) * dx + (drop.y - start.y) * dy) / lengthSquared)) : 0;
      const sweptDistance = Math.hypot(drop.x - start.x - dx * fraction, drop.y - start.y - dy * fraction);
      if (drop.pickupTarget !== player) {
        drop.attracted = false;
        drop.walkOverPickup = false;
        drop.pickupSpeed = 0;
        drop.pickupTarget = player;
      }
      // Walking over loot begins the same center-bound flight as a magnet pickup.
      // Arona can finish these pickups without gaining any attraction radius.
      if (sweptDistance <= pickupRadius) drop.walkOverPickup = true;
      const range = pickupRangeFormula(ensureCombatStats(player).pickupPercent, player.pickupRange ?? 40);
      if (!range && !drop.walkOverPickup) {
        // Swapping to an avatar without attraction stops pending magnets immediately.
        drop.attracted = false;
        drop.pickupSpeed = 0;
        continue;
      }
      // Magnet detection follows the sprite center; walk-over detection stays at feet.
      const centerFraction = lengthSquared ? Math.max(0, Math.min(1,
        ((drop.x - previous.x) * dx + (drop.y - previous.y) * dy) / lengthSquared)) : 0;
      const centerDistance = Math.hypot(drop.x - previous.x - dx * centerFraction,
        drop.y - previous.y - dy * centerFraction);
      if (drop.walkOverPickup || centerDistance <= range) drop.attracted = true;
      if (drop.attracted) {
        const targetX = player.x - drop.x, targetY = player.y - drop.y;
        const distance = Math.hypot(targetX, targetY);
        const time = Math.max(0, delta);
        const speed = drop.pickupSpeed || 0;
        drop.pickupSpeed = Math.min(pickupMagnet.maxSpeed, speed + pickupMagnet.acceleration * time);
        const travel = Math.min(distance, (speed + drop.pickupSpeed) / 2 * time);
        if (distance > 0) {
          drop.x += targetX / distance * travel;
          drop.y += targetY / distance * travel;
        }
        // Rendered beneath actors: disappear only on arrival at the actual center.
        if (distance - travel <= 0.5) collectDrop(drop, player);
      }
    }
    if (lootStatus) lootStatus.textContent = `Credits: ${lootTotals.credits} | Secret Tech Notes: ${lootTotals.secretTechNotes} | Ground drops: ${drops.size}`;
  }

  /** Draw only visible reports beneath actors, keeping their orientation fixed. */
  function draw(context, camera, width, height) {
    for (const drop of drops.values()) {
      if (drop.pendingLanding) continue;
      const x = drop.x - camera.x, y = drop.y - camera.y - (drop.lift || 0);
      if (x < -iconWidth || y < -iconWidth || x > width + iconWidth || y > height + iconWidth) continue;
      const icon = drop.kind === 'exp' ? icons[drop.tier]
        : drop.kind === 'credits' ? creditIcon : noteIcon;
      const sourceWidth = icon.naturalWidth;
      const sourceHeight = icon.naturalHeight;
      if (!sourceWidth) continue;
      const iconHeight = iconWidth * sourceHeight / sourceWidth;
      context.save();
      context.translate(x, y);
      context.rotate(drop.rotation);
      context.drawImage(icon, -iconWidth / 2, -iconHeight / 2, iconWidth, iconHeight);
      context.restore();
    }
  }
  return { ready: Promise.all([ready, creditReady, noteReady]), update, draw, clear: clearGroundLoot };
}
