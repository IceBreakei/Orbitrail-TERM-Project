import { palaceStatuePityDistance } from './game-config.js';
import { palaceRareChance, palaceRareWeights, palaceCommonWeights } from './game-config.js';
export { palaceRareChance, palaceRareWeights, palaceCommonWeights } from './game-config.js';
import { worldSeed, canStand, resolveObstacleMotion } from './tile-world.js';
import { mapSizeMultiplier } from './map-bounds.js';
import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';

export const palaceTileFiles = [
  'palace-hall-single-angel.png', 'palace-hall-single-column.png',
  'palace-hall-single-knight.png', 'palace-hall-single-pit.png',
  'palace-hall-mixed-four.png', 'palace-hall-variation-a.png',
  'palace-hall-variation-b.png',
  'exec-0f3168a5-cfa4-4915-9533-1ddd11cfce6f.png',
  'mansion-decagrammaton-statue-stone.png', 'palace-hall-duo-statue-walkways.png',
  'palace-hall-kei-statue-obstacles.png', 'mansion-vending-a-single-stone.png',
  'mansion-vending-b-pit-stone.png'
];


// Single-layout group totals 100; multi-layout group totals 130 (30% more likely).

export const palaceRareStart = palaceCommonWeights.length;
// Same directional guarantee as Stage 1: <=20 outward, <=40 across the origin.
export const palaceStatueGuarantee = {
  indices: [palaceTileFiles.indexOf('mansion-decagrammaton-statue-stone.png'),
    palaceTileFiles.indexOf('palace-hall-duo-statue-walkways.png')], pityDistance: palaceStatuePityDistance
};

// EDIT source-pixel boxes [left, top, right, bottom]. For rare statues, only
// the PEDESTAL base is solid; other objects on the same tile keep full boxes.
const angel = [260, 425, 410, 650];
const column = [440, 970, 625, 1125];
const knight = [510, 435, 625, 680];
const pit = [365, 745, 560, 945];
const variationA = [[255, 345, 405, 565], [515, 995, 700, 1185]];
const variationB = [[530, 260, 630, 415], [275, 615, 425, 755], [520, 890, 660, 1035], [305, 1190, 410, 1340]];
export const palaceObstacleBoxes = [
  [angel], [column], [knight], [pit],
  [[550, 265, 685, 455], [250, 630, 430, 810], [545, 945, 705, 1105], [220, 1220, 420, 1375]],
  variationA, variationB,
  [[490, 915, 675, 1015], [195, 1105, 470, 1240]],
  [[390, 835, 510, 910]],
  [[325, 900, 615, 975]],
  [[295, 825, 495, 900], [550, 1035, 670, 1135], [270, 1185, 435, 1365]],
  [[310, 635, 510, 925]],
  [[510, 430, 680, 740], [295, 1020, 440, 1165]]
];

// Approximate source-space statue silhouettes for drawing actors behind them.
// Collision still uses the pedestal box, never this taller silhouette.
export const palaceStatues = {
  [palaceRareStart]: { baseBottom: 1015, polygon: [[560,470],[615,515],[680,485],[720,545],[795,580],[740,630],[810,690],[785,800],[710,875],[675,925],[675,1015],[490,1015],[490,925],[430,860],[400,760],[420,655],[470,585],[435,535],[510,550]] },
  [palaceRareStart + 1]: { baseBottom: 910, polygon: [[440,495],[475,535],[500,505],[535,560],[575,590],[535,640],[520,730],[505,835],[510,910],[390,910],[390,835],[360,760],[385,660],[400,575]] },
  [palaceRareStart + 2]: { baseBottom: 975, polygon: [[400,565],[440,595],[460,570],[500,620],[550,605],[590,660],[650,675],[620,730],[680,790],[635,845],[615,900],[615,975],[325,975],[325,900],[270,850],[250,765],[290,685],[340,635],[370,655]] },
  [palaceRareStart + 3]: { baseBottom: 900, polygon: [[380,425],[420,465],[425,520],[465,570],[470,670],[495,745],[470,825],[495,900],[295,900],[295,825],[255,775],[235,690],[255,610],[300,565],[330,480]] }
};

/** Coordinate hash shared in spirit and seed with the other procedural stages. */
function palaceRandom(row, salt, seed) {
  let hash = Math.imul(row | 0, 0x1f123bb5) ^ Math.imul(salt, 0x5f356495) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

/** Choose within a weighted pool without altering the pool's overall chance. */
function weightedIndex(value, weights) {
  let remaining = value * weights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < weights.length; i++) {
    remaining -= weights[i];
    if (remaining < 0) return i;
  }
  return weights.length - 1;
}

/** Resolve the exact 5% rare pool followed by its conditional 10/5/5/10/35/35 split. */
export function palaceTileFromRolls(poolRoll, variantRoll) {
  return poolRoll < palaceRareChance ? palaceRareStart + weightedIndex(variantRoll, palaceRareWeights)
    : weightedIndex(variantRoll, palaceCommonWeights);
}

/** Preserve the original natural 5% rare-pool rolls before guarantee overrides. */
export function palaceBaseTileIndex(row, seed = worldSeed) {
  return palaceTileFromRolls(palaceRandom(row, 11, seed), palaceRandom(row, 12, seed));
}

/** Share one pity stream between the duo and decagrammaton statues in each direction. */
export function createPalaceTileSelector(seed = worldSeed) {
  if (seed === 0) return row => Math.abs(row) % palaceTileFiles.length;
  const streams = { up: [{ distance: 0 }], down: [{ distance: 0 }] };
  const eligible = index => palaceStatueGuarantee.indices.includes(index);
  return function tileAt(row) {
    if (row === 0) return palaceBaseTileIndex(0, seed);
    const sign = row < 0 ? -1 : 1, distance = Math.abs(row);
    const statues = sign < 0 ? streams.up : streams.down;
    while (statues[statues.length - 1].distance < distance) {
      const previous = statues[statues.length - 1].distance;
      let next;
      for (let step = 1; step <= palaceStatueGuarantee.pityDistance; step++) {
        const column = sign * (previous + step);
        const index = palaceBaseTileIndex(column, seed);
        if (eligible(index) || step === palaceStatueGuarantee.pityDistance) {
          // Both variants have equal natural weights (5% of the rare pool each).
          next = { distance: previous + step, index: eligible(index) ? index
            : palaceStatueGuarantee.indices[Math.floor(palaceRandom(column, 13, seed) * palaceStatueGuarantee.indices.length)] };
          break;
        }
      }
      statues.push(next);
    }
    let low = 1, high = statues.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (statues[mid].distance === distance) return statues[mid].index;
      if (statues[mid].distance < distance) low = mid + 1;
      else high = mid - 1;
    }
    return palaceBaseTileIndex(row, seed);
  };
}

const palaceSelectors = new Map();
/** Stable seeded choice with shared statue guarantees and no dependence on visit order. */
export function palaceTileIndex(row, seed = worldSeed) {
  if (!palaceSelectors.has(seed)) palaceSelectors.set(seed, createPalaceTileSelector(seed));
  return palaceSelectors.get(seed)(row);
}

/** Keep the enlarged width and a 2px seam overlap while scrolling vertically. */
export function palaceMetrics(viewportWidth) {
  const scale = viewportWidth * mapSizeMultiplier / 941;
  const height = 1672 * scale;
  return { scale, width: 941 * scale, height, stride: height - 2 };
}

/** Return obstacle rectangles only for nearby vertical tiles. */
export function palaceObstaclesIn(map, width, left, top, right, bottom) {
  const metrics = palaceMetrics(width), boxes = [];
  const first = Math.floor((top - map.originY - 2) / metrics.stride);
  const last = Math.floor((bottom - map.originY) / metrics.stride);
  for (let row = first; row <= last; row++) {
    for (const [x1, y1, x2, y2] of palaceObstacleBoxes[palaceTileIndex(row)]) {
      const box = { left: map.originX + x1 * metrics.scale, right: map.originX + x2 * metrics.scale,
        top: map.originY + row * metrics.stride + y1 * metrics.scale,
        bottom: map.originY + row * metrics.stride + y2 * metrics.scale };
      if (box.right >= left && box.left <= right) boxes.push(box);
    }
  }
  return boxes;
}

/** Reject NPC spawns inside the same obstacle boxes used by movement. */
export function canStandInPalace(character, x, y, map, width) {
  return canStand(character, x, y, (...region) => palaceObstaclesIn(map, width, ...region));
}

/** Reuse substepped collision and axis sliding from Stage 3. */
export function resolvePalaceMotion(character, fromX, fromY, toX, toY, map, width) {
  return resolveObstacleMotion(character, fromX, fromY, toX, toY,
    (...region) => palaceObstaclesIn(map, width, ...region));
}

/** Render only rows that intersect the camera, without allocating tile objects. */
export function drawPalaceWorld(context, map, camera, width, height) {
  const metrics = palaceMetrics(width);
  const first = Math.floor((camera.y - map.originY - 2) / metrics.stride);
  const last = Math.floor((camera.y + height - map.originY) / metrics.stride);
  for (let row = first; row <= last; row++) {
    const x = Math.round(map.originX - camera.x);
    const y = Math.round(map.originY + row * metrics.stride - camera.y);
    const bottom = Math.round(map.originY + row * metrics.stride + metrics.height - camera.y);
    context.drawImage(map.tiles[palaceTileIndex(row)].image, x, y, Math.round(metrics.width), bottom - y);
  }
}

/** Redraw only a statue silhouette over an actor standing behind its pedestal. */
export function drawPalaceOcclusion(context, character, map, camera, width, opacity = 1) {
  const metrics = palaceMetrics(width), size = character.spriteSize || normalSpriteSize;
  const footY = character.y + size / 2 - spriteDisplayPadding;
  const first = Math.floor((character.y - size - map.originY) / metrics.stride);
  const last = Math.floor((character.y + size - map.originY) / metrics.stride);
  for (let row = first; row <= last; row++) {
    const index = palaceTileIndex(row), statue = palaceStatues[index];
    const originY = map.originY + row * metrics.stride;
    if (!statue || footY >= originY + statue.baseBottom * metrics.scale) continue;
    context.save();
    context.globalAlpha *= opacity;
    context.beginPath();
    context.rect(character.x - camera.x - size / 2, character.y - camera.y - size / 2, size, size);
    context.clip();
    context.beginPath();
    statue.polygon.forEach(([x,y], i) => {
      const px = map.originX + x * metrics.scale - camera.x;
      const py = originY + y * metrics.scale - camera.y;
      if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
    });
    context.closePath();
    context.clip();
    context.drawImage(map.tiles[index].image, map.originX - camera.x, originY - camera.y, metrics.width, metrics.height);
    context.restore();
  }
}
