import { tileWeights, newyearRareSpawns, newyearRegionGuarantee } from './game-config.js';
export { tileWeights, newyearRareSpawns, newyearRegionGuarantee } from './game-config.js';
import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';
import { mapSizeMultiplier } from './map-bounds.js';
import { runSeed } from './run-seed.js';
// All procedural maps share this run's seed; coordinate generation stays stable.
export const worldSeed = runSeed;
export const tileFiles = [
  ...Array.from({ length: 6 }, (_, index) => `playarea 3-${index + 1}.png`),
  'newyear-regular-07-single-ema.png', 'newyear-regular-08-two-obstacles.png',
  'newyear-regular-09-three-obstacles.png', 'newyear-regular-10-four-obstacles.png',
  'newyear-rare-grand-shrine.png', 'newyear-rare-lantern-stage.png'
];



export const tileWidth = 960 * mapSizeMultiplier;
export const tileHeight = 720 * mapSizeMultiplier;
export const tileOverlap = 2; // EDIT shared edge overlap in world pixels to hide seams.
const tileStrideX = tileWidth - tileOverlap;
const tileStrideY = tileHeight - tileOverlap;
const sourceScale = tileWidth / 1448;

// EDIT obstacle rectangles in SOURCE IMAGE pixels: [left, top, right, bottom].
// These deliberately cover the obstacle artwork, excluding its cast shadow.
export const obstacleBoxes = [
  [[1030, 25, 1425, 330], [165, 725, 370, 910]],
  [[1020, 95, 1300, 345], [870, 480, 1040, 665], [170, 755, 400, 950]],
  [[1040, 110, 1290, 350], [175, 735, 325, 915]],
  [[930, 175, 1160, 370], [230, 410, 455, 600], [875, 695, 1060, 850]],
  [[1020, 95, 1300, 345], [165, 300, 365, 470], [795, 475, 1060, 685], [170, 755, 400, 950]],
  [[735, 95, 1055, 300], [185, 270, 400, 455], [1040, 515, 1315, 770], [260, 715, 495, 895]],
  [[320, 380, 590, 650]],
  [[220, 225, 540, 450], [910, 600, 1280, 865]],
  [[185, 195, 515, 460], [950, 300, 1170, 475], [580, 685, 820, 870]],
  [[235, 185, 500, 410], [955, 195, 1200, 435], [250, 640, 500, 880], [970, 650, 1210, 870]],
  // Rare silhouettes use fitted bands instead of one oversized empty-corner box.
  [[630,10,810,70],[525,65,920,140],[205,135,1240,205],[165,200,1285,250],
    [80,250,1365,375],[38,375,1408,550],[55,550,1395,740],[155,740,1295,805],
    [260,800,1188,860],[460,850,997,892],[550,890,892,933]],
  [[495,193,970,250],[425,250,1035,340],[460,340,995,435],
    [390,435,1065,610],[375,610,1075,810],[552,810,895,822]]
];

/** Produce a stable weighted tile index for positive or negative grid coordinates. */
function newyearRandom(column, row, seed, salt = 0) {
  let hash = Math.imul(column | 0, 0x1f123bb5) ^ Math.imul(row | 0, 0x5f356495) ^ seed ^ Math.imul(salt, 0x6c8e9cf5);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return hash / 4294967296;
}

/** Natural rare chances are independent of the weighted ordinary layout pool. */
export function newyearBaseTileIndex(column, row, seed = worldSeed) {
  const rare = newyearRandom(column, row, seed, 1);
  if (rare < newyearRareSpawns.grandShrine) return 10;
  if (rare < newyearRareSpawns.grandShrine + newyearRareSpawns.lanternStage) return 11;
  let value = newyearRandom(column, row, seed) * tileWeights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < tileWeights.length; i++) {
    value -= tileWeights[i];
    if (value < 0) return i;
  }
  return tileWeights.length - 1;
}

/** Guarantee a shared rare tile per grid-aligned 20x20 region, independent of visits. */
export function createNewyearTileSelector(seed = worldSeed,
  naturalIndex = (column, row) => newyearBaseTileIndex(column, row, seed)) {
  // A compact 4x3 repeating gallery places all twelve tiles around spawn.
  if (seed === 0) return (column, row) => ((row % 3 + 3) % 3) * 4 + ((column % 4 + 4) % 4);
  const emptyRegions = new Map(); // Only one boolean per inspected guarantee region.
  const rare = index => index === 10 || index === 11;
  return function tileAt(column, row) {
    const natural = naturalIndex(column, row);
    if (rare(natural)) return natural;
    const size = newyearRegionGuarantee.size;
    const regionX = Math.floor(column / size), regionY = Math.floor(row / size);
    const originX = regionX * size, originY = regionY * size;
    const forcedX = originX + Math.floor(newyearRandom(regionX, regionY, seed, 2) * size);
    const forcedY = originY + Math.floor(newyearRandom(regionX, regionY, seed, 3) * size);
    // Only the region's one fallback candidate needs to inspect its natural rolls.
    if (column !== forcedX || row !== forcedY) return natural;
    const key = `${regionX},${regionY}`;
    if (!emptyRegions.has(key)) {
      let empty = true;
      scan: for (let y = originY; y < originY + size; y++) {
        for (let x = originX; x < originX + size; x++) {
          if (rare(naturalIndex(x, y))) { empty = false; break scan; }
        }
      }
      emptyRegions.set(key, empty);
    }
    if (!emptyRegions.get(key)) return natural;
    const shrineRatio = newyearRareSpawns.grandShrine /
      (newyearRareSpawns.grandShrine + newyearRareSpawns.lanternStage);
    return newyearRandom(regionX, regionY, seed, 4) < shrineRatio ? 10 : 11;
  };
}

const newyearSelectors = new Map();
/** Stable coordinate choice for the shared run seed and its regional guarantee. */
export function tileIndex(column, row, seed = worldSeed) {
  if (!newyearSelectors.has(seed)) newyearSelectors.set(seed, createNewyearTileSelector(seed));
  return newyearSelectors.get(seed)(column, row);
}

/** Query obstacle rectangles only for tiles touched by a local world region. */
export function obstaclesIn(left, top, right, bottom) {
  const rectangles = [];
  for (let row = Math.floor((top - tileOverlap) / tileStrideY); row <= Math.floor(bottom / tileStrideY); row++) {
    for (let column = Math.floor((left - tileOverlap) / tileStrideX); column <= Math.floor(right / tileStrideX); column++) {
      for (const box of obstacleBoxes[tileIndex(column, row)]) {
        rectangles.push({
          left: column * tileStrideX + box[0] * sourceScale,
          top: row * tileStrideY + box[1] * sourceScale,
          right: column * tileStrideX + box[2] * sourceScale,
          bottom: row * tileStrideY + box[3] * sourceScale
        });
      }
    }
  }
  return rectangles;
}

/** Use a small foot-level rectangle for collision rather than transparent sprite padding. */
function footprint(character, x, y) {
  const size = character.spriteSize || normalSpriteSize;
  const halfWidth = size * 0.14;
  const halfHeight = size * 0.06;
  const groundY = y + size / 2 - spriteDisplayPadding;
  return { left: x - halfWidth, right: x + halfWidth, top: groundY - halfHeight, bottom: groundY + halfHeight };
}

/** Return penetration depth; zero means no overlap. */
function penetration(a, b) {
  if (a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom) return 0;
  return Math.min(a.right - b.left, b.right - a.left, a.bottom - b.top, b.bottom - a.top);
}

/** Validate random/cursor placement without creating NPCs inside obstacles. */
export function canStand(character, x, y, getObstacles = obstaclesIn) {
  const body = footprint(character, x, y);
  return getObstacles(body.left, body.top, body.right, body.bottom).every(box => !penetration(body, box));
}

/** Substep motion and slide along blocked axes, preventing diagonal tunneling. */
export function resolveObstacleMotion(character, fromX, fromY, toX, toY, getObstacles = obstaclesIn) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY)) / 8));
  const dx = (toX - fromX) / steps, dy = (toY - fromY) / steps;
  let x = fromX, y = fromY;
  const permitted = (nextX, nextY) => {
    const before = footprint(character, x, y);
    const after = footprint(character, nextX, nextY);
    return getObstacles(after.left, after.top, after.right, after.bottom).every(box => {
      const depth = penetration(after, box);
      // Switching maps preserves positions. If already inside a new obstacle,
      // allow escape motions that reduce overlap instead of teleporting the actor.
      const oldDepth = penetration(before, box);
      const centerX = (box.left + box.right) / 2;
      const centerY = (box.top + box.bottom) / 2;
      const distanceBefore = Math.hypot((before.left + before.right) / 2 - centerX,
        (before.top + before.bottom) / 2 - centerY);
      const distanceAfter = Math.hypot((after.left + after.right) / 2 - centerX,
        (after.top + after.bottom) / 2 - centerY);
      return !depth || (oldDepth > 0 && (depth < oldDepth || distanceAfter > distanceBefore));
    });
  };
  for (let step = 0; step < steps; step++) {
    if (permitted(x + dx, y)) x += dx;
    if (permitted(x, y + dy)) y += dy;
  }
  return { x, y };
}

/** Draw only visible seeded tiles; generation allocates no persistent tile cache. */
export function drawTileWorld(context, images, camera, width, height, debug = false) {
  for (let row = Math.floor((camera.y - tileOverlap) / tileStrideY); row <= Math.floor((camera.y + height) / tileStrideY); row++) {
    for (let column = Math.floor((camera.x - tileOverlap) / tileStrideX); column <= Math.floor((camera.x + width) / tileStrideX); column++) {
      const x = Math.round(column * tileStrideX - camera.x);
      const y = Math.round(row * tileStrideY - camera.y);
      const right = Math.round(column * tileStrideX + tileWidth - camera.x);
      const bottom = Math.round(row * tileStrideY + tileHeight - camera.y);
      context.drawImage(images[tileIndex(column, row)].image, x, y, right - x, bottom - y);
    }
  }
  if (debug) {
    context.save();
    context.strokeStyle = '#ffcf60';
    context.lineWidth = 2;
    for (const box of obstaclesIn(camera.x, camera.y, camera.x + width, camera.y + height)) {
      context.strokeRect(box.left - camera.x, box.top - camera.y, box.right - box.left, box.bottom - box.top);
    }
    context.restore();
  }
}
