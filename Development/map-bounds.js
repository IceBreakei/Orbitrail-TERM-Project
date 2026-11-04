import { mapSizeMultiplier, officeWindowInsetSource } from './game-config.js';
export { mapSizeMultiplier } from './game-config.js';
// Map zoom is configured independently of actors in game-config.js.


/** Physical playable limits for the enlarged horizontal/vertical strip maps. */
export function stripMapBounds(map, width, height, topPadding = 0, bottomPadding = 0) {
  if (map.axis === 'horizontal') return {
    left: -Infinity, right: Infinity,
    top: map.originY + topPadding + officeWindowInsetSource * height * mapSizeMultiplier / 1086,
    bottom: map.originY + height * mapSizeMultiplier - bottomPadding
  };
  if (map.axis !== 'vertical') return { left: -Infinity, right: Infinity, top: -Infinity, bottom: Infinity };
  return {
    left: map.originX + width * mapSizeMultiplier * (map.leftWallRatio || 0),
    right: map.originX + width * mapSizeMultiplier * (map.rightWallRatio ?? 1),
    top: -Infinity, bottom: Infinity
  };
}

/** Stop the camera at finite edges while leaving the long map axis infinite. */
export function clampStripCamera(map, camera, width, height) {
  if (map.axis === 'horizontal') camera.y = Math.max(map.originY,
    Math.min(map.originY + height * (mapSizeMultiplier - 1), camera.y));
  if (map.axis === 'vertical') camera.x = Math.max(map.originX,
    Math.min(map.originX + width * (mapSizeMultiplier - 1), camera.x));
}

/** Keep enlarged enemy spawns inside physical walls, independent of the camera. */
export function canSpawnInStrip(character, x, y, bounds, defaultSize = 112) {
  const margin = (character.spriteSize || defaultSize) / 2;
  return x >= bounds.left + margin && x <= bounds.right - margin &&
    y >= bounds.top + margin && y <= bounds.bottom - margin;
}
