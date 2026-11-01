import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';
// EDIT seed/weights to change generation. Coordinates, not visit order, select tiles.
export const worldSeed = 20261101;
export const tileWeights = [35, 23, 16, 11, 10, 5];
export const tileWidth = 960;
export const tileHeight = 720;
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
  [[735, 95, 1055, 300], [185, 270, 400, 455], [1040, 515, 1315, 770], [260, 715, 495, 895]]
];

/** Produce a stable weighted tile index for positive or negative grid coordinates. */
export function tileIndex(column, row, seed = worldSeed) {
  let hash = Math.imul(column | 0, 0x1f123bb5) ^ Math.imul(row | 0, 0x5f356495) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  let value = hash / 4294967296 * tileWeights.reduce((sum, weight) => sum + weight, 0);
  for (let i = 0; i < tileWeights.length; i++) {
    value -= tileWeights[i];
    if (value < 0) return i;
  }
  return tileWeights.length - 1;
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
export function canStand(character, x, y) {
  const body = footprint(character, x, y);
  return obstaclesIn(body.left, body.top, body.right, body.bottom).every(box => !penetration(body, box));
}

/** Substep motion and slide along blocked axes, preventing diagonal tunneling. */
export function resolveObstacleMotion(character, fromX, fromY, toX, toY) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(toX - fromX), Math.abs(toY - fromY)) / 8));
  const dx = (toX - fromX) / steps, dy = (toY - fromY) / steps;
  let x = fromX, y = fromY;
  const permitted = (nextX, nextY) => {
    const before = footprint(character, x, y);
    const after = footprint(character, nextX, nextY);
    return obstaclesIn(after.left, after.top, after.right, after.bottom).every(box => {
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
