import { officeTileWeights, officeMonument } from './game-config.js';
export { officeTileWeights, officeMonument } from './game-config.js';
import { worldSeed, canStand, resolveObstacleMotion } from './tile-world.js';
import { mapSizeMultiplier } from './map-bounds.js';
import { normalSpriteSize, spriteDisplayPadding } from './scene-metrics.js';

export const officeTileFiles = [
  'Playarea.png', 'schale-office-single-clear-wall.png',
  'schale-office-single-frosted-wall.png', 'schale-office-single-monitor-desk.png',
  'schale-office-single-paperwork-desk.png', 'schale-office-mixed-three.png',
  'schale-office-variation-a.png', 'schale-office-variation-b.png',
  'schale-office-blue-archive-logo-monument.png'
];


const overlap = 2;

// EDIT obstacle rectangles in source-image pixels [left, top, right, bottom].
// Clear/frosted partitions, desk bodies and monument exclude cast shadows.
export const officeObstacleBoxes = [
  [],
  [[400, 470, 750, 550]],
  [[670, 505, 1070, 585]],
  [[605, 165, 845, 260]],
  [[585, 595, 870, 730]],
  [[265, 295, 455, 425], [895, 470, 1310, 570], [275, 675, 495, 815]],
  [[340, 300, 695, 415], [905, 470, 1140, 610], [475, 715, 865, 835]],
  [[325, 305, 560, 440], [880, 340, 1210, 440], [310, 715, 670, 825], [920, 715, 1160, 850]],
  [[94, 595, 1385, 679]] // Monument pedestal only; the letters are walk-behind artwork.
];

// EDIT the visual outline independently of the solid pedestal above.
export const officeMonumentSilhouette = {
  letters: [[120,612],[180,410],[322,410],[342,432],[347,412],[408,410],[389,474],
    [437,466],[510,468],[585,465],[629,478],[714,399],[752,396],[771,474],
    [843,471],[871,478],[922,469],[945,414],[1008,413],[995,478],[1047,479],
    [1080,433],[1129,432],[1124,475],[1166,475],[1160,520],[1195,479],
    [1258,476],[1248,495],[1282,471],[1332,470],[1362,490],[1363,534],
    [1338,566],[1345,612]],
  holes: [
    [[215,466],[274,466],[265,491],[208,491]],
    [[196,532],[255,532],[247,561],[188,561]],
    [[697,477],[721,477],[725,522],[687,522]],
    [[552,513],[577,513],[575,525],[548,525]],
    [[1283,517],[1316,517],[1313,528],[1279,528]]
  ],
  star: [[602,320],[724,365],[791,245],[802,251],[744,375],[872,435],
    [734,393],[611,596],[593,601],[704,385]]
};

/** Stable coordinate-based random values independent of exploration order. */
function officeRandom(column, salt, seed) {
  let hash = Math.imul(column | 0, 0x1f123bb5) ^ Math.imul(salt, 0x5f356495) ^ seed;
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

/** Build deterministic left/right pity streams, caching only monument indices. */
export function createOfficeTileSelector(seed = worldSeed) {
  if (seed === 0) return column => Math.abs(column) % officeTileFiles.length;
  const streams = { left: [0], right: [0] }; // Zero is a virtual anchor, not a monument.
  return function tileAt(column) {
    if (column === 0) return 0; // Keep the starting office clear.
    const sign = column < 0 ? -1 : 1;
    const distance = Math.abs(column);
    const monuments = sign < 0 ? streams.left : streams.right;
    while (monuments[monuments.length - 1] < distance) {
      const previous = monuments[monuments.length - 1];
      let step = 1;
      for (; step < officeMonument.pityDistance; step++) {
        if (officeRandom(sign * (previous + step), 1, seed) < officeMonument.chance) break;
      }
      monuments.push(previous + step);
    }
    let low = 1, high = monuments.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (monuments[mid] === distance) return officeMonument.index;
      if (monuments[mid] < distance) low = mid + 1;
      else high = mid - 1;
    }
    let weight = officeRandom(column, 2, seed) * officeTileWeights.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < officeTileWeights.length; index++) {
      weight -= officeTileWeights[index];
      if (weight < 0) return index;
    }
    return 0;
  };
}

export const officeTileIndex = createOfficeTileSelector();

/** Match Stage 1's enlarged height while overlapping horizontal seams by 2px. */
export function officeMetrics(viewportHeight) {
  const scale = viewportHeight * mapSizeMultiplier / 1086;
  const width = 1448 * scale;
  return { scale, width, height: 1086 * scale, stride: width - overlap };
}

/** Query only obstacle boxes near a world region; tiles own no enemy records. */
export function officeObstaclesIn(map, viewportHeight, left, top, right, bottom) {
  const metrics = officeMetrics(viewportHeight);
  const boxes = [];
  const first = Math.floor((left - map.originX - overlap) / metrics.stride);
  const last = Math.floor((right - map.originX) / metrics.stride);
  for (let column = first; column <= last; column++) {
    for (const [x1, y1, x2, y2] of officeObstacleBoxes[officeTileIndex(column)]) {
      const box = { left: map.originX + column * metrics.stride + x1 * metrics.scale,
        right: map.originX + column * metrics.stride + x2 * metrics.scale,
        top: map.originY + y1 * metrics.scale, bottom: map.originY + y2 * metrics.scale };
      if (box.bottom >= top && box.top <= bottom) boxes.push(box);
    }
  }
  return boxes;
}

/** Validate spawns against the office obstacle artwork. */
export function canStandInOffice(character, x, y, map, height) {
  return canStand(character, x, y, (...region) => officeObstaclesIn(map, height, ...region));
}

/** Reuse Stage 3 substepped collision and wall sliding for the office. */
export function resolveOfficeMotion(character, fromX, fromY, toX, toY, map, height) {
  return resolveObstacleMotion(character, fromX, fromY, toX, toY,
    (...region) => officeObstaclesIn(map, height, ...region));
}

/** Render only visible columns; horizontal position alone determines their layout. */
export function drawOfficeWorld(context, map, camera, width, height) {
  const metrics = officeMetrics(height);
  const first = Math.floor((camera.x - map.originX - overlap) / metrics.stride);
  const last = Math.floor((camera.x + width - map.originX) / metrics.stride);
  for (let column = first; column <= last; column++) {
    const x = Math.round(map.originX + column * metrics.stride - camera.x);
    const right = Math.round(map.originX + column * metrics.stride + metrics.width - camera.x);
    const y = Math.round(map.originY - camera.y);
    context.drawImage(map.tiles[officeTileIndex(column)].image, x, y, right - x, Math.round(metrics.height));
  }
}

/** Draw letters and halo over actors behind the monument, without blocking movement. */
export function drawOfficeMonumentOcclusion(context, character, map, camera, height, opacity = 1) {
  const metrics = officeMetrics(height), size = character.spriteSize || normalSpriteSize;
  const footY = character.y + size / 2 - spriteDisplayPadding;
  if (footY >= map.originY + officeObstacleBoxes[8][0][3] * metrics.scale) return;
  const first = Math.floor((character.x - size - map.originX) / metrics.stride);
  const last = Math.floor((character.x + size - map.originX) / metrics.stride);
  for (let column = first; column <= last; column++) {
    if (officeTileIndex(column) !== officeMonument.index) continue;
    context.save();
    context.globalAlpha *= opacity;
    context.beginPath();
    context.rect(character.x - camera.x - size / 2, character.y - camera.y - size / 2, size, size);
    context.clip();
    context.translate(map.originX + column * metrics.stride - camera.x, map.originY - camera.y);
    context.scale(metrics.scale, metrics.scale);
    const polygon = points => {
      points.forEach(([x,y], i) => { if (i === 0) context.moveTo(x,y); else context.lineTo(x,y); });
      context.closePath();
    };
    const drawRegion = buildPath => {
      context.save();
      context.beginPath();
      buildPath();
      context.clip('evenodd');
      context.drawImage(map.tiles[officeMonument.index].image, 0, 0);
      context.restore();
    };
    drawRegion(() => {
      polygon(officeMonumentSilhouette.letters);
      officeMonumentSilhouette.holes.forEach(polygon);
    });
    drawRegion(() => {
      for (const [rx, ry] of [[231,62],[214,44]]) {
        context.moveTo(712 + rx * Math.cos(0.3), 378 + rx * Math.sin(0.3));
        context.ellipse(712,378,rx,ry,0.3,0,Math.PI*2);
        context.closePath();
      }
    });
    drawRegion(() => polygon(officeMonumentSilhouette.star));
    context.restore();
  }
}
