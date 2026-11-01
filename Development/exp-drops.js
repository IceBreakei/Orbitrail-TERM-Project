import { addPlayerExp } from './player-stats.js';
import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';

// World-space records survive camera scrolling and map switches for this session.
const drops = new Map();
let nextId = 0;
const iconWidth = 28; // EDIT ground report size in display pixels.
const pickupRadius = 26; // EDIT walk-over collection radius in world pixels.
export const creditDropChance = 1 / 90; // EDIT occasional credit chance (~1.11%).
export const secretNoteDropChance = 0.001; // 0.1% per defeated enemy.
const lootTotals = { credits: 0, secretTechNotes: 0 }; // Shared across avatar swaps.

/** Read session inventory; spending and attack upgrades will be implemented later. */
export function getLootTotals() {
  return { ...lootTotals };
}

/** Inspect all ground loot, including credits and Secret Tech Notes. */
export function getGroundLoot() {
  return [...drops.values()];
}

/** Spawn a specific ground pickup for repeatable admin testing. */
export function spawnTestDrop(kind, value, x, y) {
  if (!['exp', 'credits', 'secretTechNotes'].includes(kind)) return;
  if (!Number.isFinite(value) || value < 1) return;
  const drop = { id: ++nextId, kind, value: Math.floor(value),
    tier: reportTier(value), x, y, rotation: Math.random() * Math.PI * 2 };
  drops.set(drop.id, drop);
  return drop;
}

/** Apply one pickup's reward without coupling inventory to the controlled avatar. */
function collectDrop(drop, player) {
  drops.delete(drop.id);
  if (drop.kind === 'exp') addPlayerExp(player, drop.value);
  else lootTotals[drop.kind] += drop.value;
}

/** Roll independent bonus drops, allowing both rewards on the same defeat. */
export function dropEnemyLoot(enemy, random = Math.random) {
  const credits = random() < creditDropChance;
  const note = random() < secretNoteDropChance;
  for (const [kind, awarded] of [['credits', credits], ['secretTechNotes', note]]) {
    if (!awarded) continue;
    const drop = {
      id: ++nextId, kind, value: 1,
      x: enemy.x + (kind === 'credits' ? -18 : 18),
      y: enemy.y + (enemy.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding,
      rotation: random() * Math.PI * 2
    };
    drops.set(drop.id, drop);
  }
}

/** Select artwork by EXP value; the highest supplied file is named Report 3. */
export function reportTier(value) {
  return value >= 50 ? 3 : value >= 20 ? 2 : value >= 11 ? 1 : 0;
}

/** Expose ground records for inspection without deleting off-screen reports. */
export function getExpDrops() {
  return [...drops.values()].filter(drop => drop.kind === 'exp');
}

/** Place one report at the defeated enemy's feet, preserving its exact reward. */
export function dropEnemyExp(enemy) {
  const value = Math.floor(enemy.expReward ?? 5);
  if (!Number.isFinite(value) || value <= 0) return;
  const drop = {
    id: ++nextId, kind: 'exp', value, tier: reportTier(value), x: enemy.x,
    y: enemy.y + (enemy.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding,
    rotation: Math.random() * Math.PI * 2
  };
  drops.set(drop.id, drop);
  return drop;
}

/** Load report graphics once and provide collection/rendering for the preview. */
export function createExpPickups(getPlayer) {
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
  // Temporary paper-note graphic until a Secret Tech Note asset is supplied.
  const noteIcon = document.createElement('canvas');
  noteIcon.width = 28;
  noteIcon.height = 28;
  const noteContext = noteIcon.getContext('2d');
  noteContext.fillStyle = '#173954';
  noteContext.fillRect(4, 1, 20, 26);
  noteContext.fillStyle = '#e2faff';
  noteContext.fillRect(6, 3, 16, 22);
  noteContext.fillStyle = '#4aaedc';
  for (let y = 8; y <= 20; y += 4) noteContext.fillRect(9, y, 10, 2);

  /** Sweep the player's feet so moving over a report cannot skip collection. */
  function update(player, previous) {
    const footOffset = (player.spriteSize || normalSpriteSize) / 2 - spriteDisplayPadding;
    const start = { x: previous.x, y: previous.y + footOffset };
    const end = { x: player.x, y: player.y + footOffset };
    const dx = end.x - start.x, dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    for (const drop of drops.values()) {
      const fraction = lengthSquared ? Math.max(0, Math.min(1,
        ((drop.x - start.x) * dx + (drop.y - start.y) * dy) / lengthSquared)) : 0;
      if (Math.hypot(drop.x - start.x - dx * fraction, drop.y - start.y - dy * fraction) <= pickupRadius) {
        collectDrop(drop, player);
      }
    }
    if (lootStatus) lootStatus.textContent = `Credits: ${lootTotals.credits} | Secret Tech Notes: ${lootTotals.secretTechNotes} | Ground drops: ${drops.size}`;
  }

  /** Draw only visible reports beneath actors, keeping their orientation fixed. */
  function draw(context, camera, width, height) {
    for (const drop of drops.values()) {
      const x = drop.x - camera.x, y = drop.y - camera.y;
      if (x < -iconWidth || y < -iconWidth || x > width + iconWidth || y > height + iconWidth) continue;
      const icon = drop.kind === 'exp' ? icons[drop.tier]
        : drop.kind === 'credits' ? creditIcon : noteIcon;
      const sourceWidth = icon === noteIcon ? icon.width : icon.naturalWidth;
      const sourceHeight = icon === noteIcon ? icon.height : icon.naturalHeight;
      if (!sourceWidth) continue;
      const iconHeight = iconWidth * sourceHeight / sourceWidth;
      context.save();
      context.translate(x, y);
      context.rotate(drop.rotation);
      context.drawImage(icon, -iconWidth / 2, -iconHeight / 2, iconWidth, iconHeight);
      context.restore();
    }
  }
  return { ready: Promise.all([ready, creditReady]), update, draw };
}
