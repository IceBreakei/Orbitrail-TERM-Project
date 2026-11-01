import { ensurePlayerStats, createPlayerStatsTools } from './player-stats.js';
import { createExpPickups } from './exp-drops.js';
import { createHud } from './hud.js';
import { shirokoFrames } from './shiroko-animation.js';
import { loadGifAnimation, gifFrameAt } from './gif-animation.js';
import { normalSpriteSize, bossSpriteSize, spriteDisplayPadding } from './scene-metrics.js';
import { observeViewport } from './viewport.js';
import { createMapAudio } from './map-audio.js';
import { islandScale, islandWidth, islandHeight, canStandOnIsland, resolveIslandMotion, drawIsland, drawTowerOcclusion } from './island-world.js';
import { drawTileWorld, resolveObstacleMotion, canStand, obstaclesIn } from './tile-world.js';
import { getDamageFlashOpacity, getWhiteSprite, advanceDamageFlash } from './damage-feedback.js';
import { requireAdmin } from './admin-guard.js';
import { spriteLayouts } from './sprite-layouts.js';
import { setupSpriteTester } from './sprite-tester.js';
import { createAiming } from './aiming.js';
import { createNpcTools } from './npc-tools.js';
import { createMapTransition } from './map-transition.js';

const authorized = await requireAdmin();
const expPickups = authorized ? createExpPickups(() => characters[selected]) : null;
const canvas = document.querySelector('#arena');
// Reserve right-click for future gameplay, suppressing browser actions in the arena.
canvas.addEventListener('contextmenu', event => event.preventDefault());
canvas.addEventListener('pointerdown', event => {
  if (event.button === 2) event.preventDefault();
});
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const aiming = authorized ? createAiming(canvas) : null;
const heldDirections = new Map();
// EDIT THESE VALUES to tune animation speed and the rendered sprite area.
const frameDuration = 110; // Milliseconds per walking frame; lower is faster.
const spriteSize = normalSpriteSize; // Fixed display size, independent of viewport.
const movementSpeed = 180; // Canvas pixels per second, including diagonals.
const spritePadding = spriteDisplayPadding; // Fixed display padding shared with collision.
let showSpriteBounds = false; // Set true to see the rendered frame rectangle.

// Source crop boundaries are editable in sprite-layouts.js. Do not enlarge the
// canvas to fix source clipping: adjust that frame's row/column edges instead.
const directionVectors = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
  upLeft: [-1, -1], upRight: [1, -1],
  downLeft: [-1, 1], downRight: [1, 1]
};
// Playable characters are Plana and Arona. Mob and Iroha remain admin-only test avatars.
let selected = 'plana';
let previousTime;
let npcTools;
let mapAudio;
let hud;
let playerStatsTools;

// EDIT rows to change which source row is used for each direction (0 = top).
// Use mirroredDirections when a sheet contains duplicate left-facing poses
// instead of a usable right-facing row. This also avoids malformed source rows.
const characters = {
  plana: {
    label: 'Plana',
    movementSpeedMultiplier: 1 / 0.75, // Player travel speed is 240 px/s; NPCs use their own multiplier.
    source: '../sprites/Plana Sprite Sheet.png',
    // Original sheet, top to bottom (row indices are zero-based):
    // 0 down, 1 down-left, 2 left, 3 up-left,
    // 4 up, 5 up-right, 6 right, 7 down-right.
    // Each direction uses its OWN row, unmirrored, and all five frame columns.
    rows: {
      down: 0,
      downLeft: 1,
      left: 2,
      upLeft: 3,
      up: 4,
      upRight: 5,
      right: 6,
      downRight: 7
    },
    mirroredDirections: [],
    frameSequence: [0, 1, 2, 3, 4],
    layout: spriteLayouts.plana,
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  arona: {
    label: 'Arona',
    movementSpeedMultiplier: 1 / 0.75, // Player travel speed is 240 px/s; NPCs use their own multiplier.
    preserveWalkPhase: true, // Keep stride timing continuous when turning.
    source: '../sprites/Arona Sprite Sheet.png',
    // Corrected original sheet: use all eight source rows directly, top to
    // bottom: down, down-left, left, up-left, up, up-right, right, down-right.
    rows: { down: 0, downLeft: 1, left: 2, upLeft: 3, up: 4, upRight: 5, right: 6, downRight: 7 },
    mirroredDirections: [],
    frameSequence: [0, 1, 2, 3, 4],
    layout: spriteLayouts.arona,
    referenceSize: 190,
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  shiroko: {
    label: 'Shiroko Boss',
    contactRecoveryDelay: false, // Boss AI keeps pursuing while contact recoil plays.
    source: '../sprites/Shiroko Boss.gif',
    gifFrames: shirokoFrames,
    gifElapsed: 0,
    spriteSize: bossSpriteSize,
    referenceSize: 374, // Fit the entire portrait GIF in the fixed boss sprite area.
    horizontalFacingOnly: true,
    defaultDirection: 'left',
    facing: 'left',
    movementSpeedMultiplier: 2 / 3, // Boss/NPC travel speed: 120 px/s.
    x: 310, y: 260, direction: 'left', elapsed: 0, moving: false
  },
  iroha: {
    label: 'Iroha Boss',
    contactRecoveryDelay: false, // Boss AI keeps pursuing while contact recoil plays.
    chaseOffsetY: -25, // EDIT barrel alignment; negative values move the chase target higher.
    movementSpeedMultiplier: 2 / 3, // NPC travel speed: 120 pixels per second.
    source: '../sprites/Iroha Tank Sprite Animation Sheet.png?v=d3496c7b721c',
    // Updated 1448 x 1086 sheet: 181-pixel cells; rows 0/1 are movement;
    // rows 2/3 are cannon attacks; rows 4/5 are flag-wave artillery attacks.
    rows: { left: 0, right: 1, down: 0, downLeft: 0, upLeft: 0, up: 0, upRight: 1, downRight: 1 },
    horizontalFacingOnly: true, // Move in eight directions; render only left/right poses.
    facing: 'left', // Vertical movement keeps the last horizontal facing.
    defaultDirection: 'left',
    spriteSize: bossSpriteSize, // Fixed 224 px boss size; normal actors use 112 px.
    frameSequence: [0, 1, 2, 3, 4, 5, 6, 7],
    frameDuration: 110,
    preserveWalkPhase: true,
    layout: spriteLayouts.iroha,
    referenceSize: 165, // Keep the tank visually larger than normal characters.
    transitionDuration: 100, // EDIT blend duration in ms between attacks/movement/facings.
    attacks: {
      cannon: { label: 'Main cannon', rows: { left: 2, right: 3 }, frameDuration: 110 },
      artillery: { label: 'Flag-wave artillery', rows: { left: 4, right: 5 }, frameDuration: 140 }
    },
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  mob: {
    label: 'Mob',
    movementSpeedMultiplier: 2 / 3, // NPC travel speed: 120 pixels per second.
    source: '../sprites/Mob Sprite Sheet.png',
    // Mob rows 6/7 still face left and overlap nearby artwork. Reuse the
    // clean left/down-left rows and mirror them for correct rightward poses.
    rows: { down: 0, downLeft: 1, left: 2, upRight: 3, up: 4, upLeft: 5, right: 2, downRight: 1 },
    mirroredDirections: ['right', 'downRight'],
    layout: spriteLayouts.mob,
    x: 590, y: 260, direction: 'down', elapsed: 0, moving: false
  }
};


// PLAYAREA SETTINGS: background height matches the internal screen height.
// The level is infinite horizontally. Only intersecting tiles are drawn each frame;
// no tile objects or off-screen canvases are retained. Camera Y stays 0.
// EDIT topMovementPadding to restrict the top edge if needed (canvas pixels).
// Zero allows walking into the window area; the sprite stays inside the screen.
const topMovementPadding = 0;
// EDIT bottomMovementPadding to reserve space below the sprite (canvas pixels).
// Names are no longer drawn, so no extra label space is needed at the bottom.
const bottomMovementPadding = 0;
const camera = { x: 0, y: 0 };
const maps = {
  first: { originX: 0, originY: 0, label: 'Playarea', axis: 'horizontal', source: '../sprites/Playarea.png', image: null },
  second: { originX: 0, originY: 0, label: 'Playarea 2', axis: 'vertical', source: '../sprites/Playarea 2.png', image: null,
    leftWallRatio: 0.12, rightWallRatio: 0.88 },
  third: { label: 'Playarea 3', axis: 'both',
    tiles: Array.from({ length: 6 }, (_, index) => ({ source: `../sprites/playarea 3/playarea 3-${index + 1}.png` })) },
  fourth: { label: 'Playarea 4', axis: 'island', source: '../sprites/play area 4.png', image: null,
    originX: 0, originY: 0, placed: false } // EDIT inner wall edges as image-width ratios.
};
let currentMap = 'first';
const cameraAnchor = { x: canvas.width / 2, y: canvas.height / 2 };
const cameraRecenterSpeed = 2.5; // EDIT catch-up rate: lower gives gentler, slower centering.
const mapTransition = authorized ? createMapTransition(canvas) : null;

/** Switch only the background/scrolling axis; entities keep their world positions. */
function switchMap() {
  if (!mapTransition || mapTransition.active || !maps.second.image) return;
  // Snapshot BACKGROUND ONLY. Characters, NPCs, and aim graphics are drawn later.
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayarea();
  const outgoingMap = currentMap;
  mapTransition.begin(layer => drawPlayarea(layer, outgoingMap));
  const player = characters[selected];
  // Retain the current camera origin and player screen position on the new axis.
  cameraAnchor.x = player.x - camera.x;
  cameraAnchor.y = player.y - camera.y;
  const mapOrder = ['first', 'second', 'third', 'fourth'];
  currentMap = mapOrder[(mapOrder.indexOf(currentMap) + 1) % mapOrder.length];
  if (currentMap === 'fourth' && !maps.fourth.placed) {
    // Anchor the island's open central plaza under the player on first entry.
    // This positions the MAP, preserving existing player/NPC world coordinates.
    maps.fourth.originX = player.x - 740 * islandScale;
    maps.fourth.originY = player.y + (player.spriteSize || spriteSize) / 2 - spritePadding - 620 * islandScale;
    maps.fourth.placed = true;
  }
  // Align the new map on its locked axis at the retained camera origin.
  if (maps[currentMap].axis === 'vertical') maps[currentMap].originX = camera.x;
  else if (maps[currentMap].axis === 'horizontal') maps[currentMap].originY = camera.y;
  mapAudio?.setMap(currentMap);
  // Keep held inputs, attack timers, AI and aiming live throughout the transition.
  document.querySelector('#switch-map').textContent = `Switch map (current: ${maps[currentMap].label})`;
}

document.querySelector('#switch-map').addEventListener('click', switchMap);

/** Reset character positions and horizontal camera without changing sprite settings. */
function resetScene() {
  aiming?.reset();
  releaseControls();
  for (const character of Object.values(characters)) {
    character.x = canvas.width * 0.4;
    character.y = canvas.height * 0.6;
    if (currentMap === 'fourth') {
      character.x = maps.fourth.originX + 740 * islandScale;
      character.y = maps.fourth.originY + 620 * islandScale - (character.spriteSize || spriteSize) / 2 + spritePadding;
    }
    character.direction = character.defaultDirection || 'down';
    if (character.horizontalFacingOnly) character.facing = character.direction;
    character.elapsed = 0;
    character.moving = false;
    character.attack = null;
    character.transition = null;
  }
  camera.x = 0;
  camera.y = 0;
  updateAttackControls();
}

/** Follow the active character through positive and negative world coordinates. */
function updateCamera(delta = 0) {
  // Ease the retained screen anchor toward center after changing map axes.
  // World coordinates never change; the entire scene follows the same camera.
  const blend = 1 - Math.exp(-cameraRecenterSpeed * delta);
  if (maps[currentMap].axis !== 'vertical') {
    cameraAnchor.x += (canvas.width / 2 - cameraAnchor.x) * blend;
  }
  if (maps[currentMap].axis !== 'horizontal') {
    cameraAnchor.y += (canvas.height / 2 - cameraAnchor.y) * blend;
  }
  if (maps[currentMap].axis !== 'vertical') camera.x = characters[selected].x - cameraAnchor.x;
  if (maps[currentMap].axis !== 'horizontal') camera.y = characters[selected].y - cameraAnchor.y;
  if (currentMap === 'fourth') {
    const map = maps.fourth;
    camera.x = Math.max(map.originX, Math.min(map.originX + islandWidth - canvas.width, camera.x));
    camera.y = Math.max(map.originY, Math.min(map.originY + islandHeight - canvas.height, camera.y));
  }
}

/** Compute only visible tile indices, including negative indices left of origin. */
function getVisibleTileRange(cameraX, viewportWidth, tileWidth) {
  return {
    first: Math.floor(cameraX / tileWidth),
    last: Math.ceil((cameraX + viewportWidth) / tileWidth) - 1
  };
}

/** Render a bounded number of tiles from one shared image, however far we travel. */
function drawPlayarea(target = context, mapId = currentMap) {
  const map = maps[mapId];
  if (map.axis === 'island') {
    target.fillStyle = '#087fb9';
    target.fillRect(0, 0, canvas.width, canvas.height);
    drawIsland(target, map, camera);
    return;
  }
  if (map.axis === 'both') {
    drawTileWorld(target, map.tiles, camera, canvas.width, canvas.height);
    return;
  }
  const scale = map.axis === 'horizontal'
    ? canvas.height / map.image.naturalHeight
    : canvas.width / map.image.naturalWidth;
  const tileWidth = map.image.naturalWidth * scale;
  const tileHeight = map.image.naturalHeight * scale;
  const offsetX = camera.x - map.originX;
  const offsetY = camera.y - map.originY;
  const columns = getVisibleTileRange(offsetX, canvas.width, tileWidth);
  const rows = getVisibleTileRange(offsetY, canvas.height, tileHeight);
  // Normally only the map's scrolling axis changes. During a transition the
  // outgoing map also follows the new camera axis; visible repeats avoid gaps.
  for (let row = rows.first; row <= rows.last; row++) {
    for (let column = columns.first; column <= columns.last; column++) {
      const left = Math.round(column * tileWidth - offsetX);
      const top = Math.round(row * tileHeight - offsetY);
      const right = Math.round((column + 1) * tileWidth - offsetX);
      const bottom = Math.round((row + 1) * tileHeight - offsetY);
      target.drawImage(map.image, left, top, right - left, bottom - top);
    }
  }
}

// These controls live OUTSIDE the simulated screen, never over gameplay.
document.querySelector('#reset-scene').addEventListener('click', resetScene);
document.querySelector('#toggle-bounds').addEventListener('click', event => {
  showSpriteBounds = !showSpriteBounds;
  event.currentTarget.setAttribute('aria-pressed', String(showSpriteBounds));
});
// Keep frequently used progression controls separate from the general admin panel.
document.querySelector('#toggle-player-stats').addEventListener('click', event => {
  const panel = document.querySelector('#player-stats-panel');
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});

document.querySelector('#admin-tools').addEventListener('click', event => {
  const panel = document.querySelector('#admin-panel');
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});

/** Load a sheet before animation begins and report an actionable loading error. */
function loadSheet(character) {
  if (character.gifFrames) return loadGifAnimation(character);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      character.image = image;
      resolve();
    };
    image.onerror = () => reject(new Error(`Could not load ${character.source}.`));
    image.src = character.source;
  });
}

/** Resolve keyboard input to one of the four supported movement directions. */
function directionForKey(key) {
  return {
    ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
    ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right'
  }[key.length === 1 ? key.toLowerCase() : key];
}

/** Clear held input when focus is lost so characters cannot get stuck moving. */
function releaseControls() {
  heldDirections.clear();
}

window.addEventListener('keydown', event => {
  // Let admin form fields use their own arrow keys and text input.
  if (event.target?.closest('input, select, textarea')) return;
  const direction = directionForKey(event.key);
  if (!direction) return;
  event.preventDefault();
  if (!event.repeat) heldDirections.set(event.code, direction);
});

window.addEventListener('keyup', event => {
  heldDirections.delete(event.code);
});

window.addEventListener('blur', releaseControls);
document.addEventListener('visibilitychange', releaseControls);

/** Swap the development avatar in place, keeping one visible camera target. */
function switchCharacter(name) {
  if (!characters[name] || name === selected) return;
  const previous = characters[selected];
  const next = characters[name];

  // Carry the player position across so swapping does not jump the camera.
  next.x = previous.x;
  next.y = previous.y;
  next.direction = previous.direction;
  if (next.horizontalFacingOnly) {
    const horizontal = directionVectors[previous.direction][0];
    if (horizontal) next.facing = horizontal > 0 ? 'right' : 'left';
  }
  next.elapsed = 0;
  next.moving = false;
  previous.elapsed = 0;
  previous.moving = false;
  previous.attack = null;
  previous.transition = null;
  next.attack = null;
  next.transition = null;
  selected = name;
  releaseControls();
  updateCamera();
  updateAttackControls();

  document.querySelectorAll('[data-character]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.character === selected));
  });
}

/** Reveal boss-only attack buttons and prevent overlapping attack cycles. */
function updateAttackControls() {
  const character = characters[selected];
  document.querySelector('#boss-attacks').hidden = !character.attacks;
  document.querySelectorAll('[data-attack]').forEach(button => {
    button.disabled = Boolean(character.attack) || !character.attacks?.[button.dataset.attack];
  });
}

/** Play one complete facing-specific attack animation, holding the boss in place. */
function startBossAttack(name) {
  const character = characters[selected];
  if (!character.attacks?.[name] || character.attack) return;
  beginPoseTransition(character);
  character.attack = { name, facing: character.facing, elapsed: 0, walkElapsed: character.elapsed };
  character.moving = false;
  updateAttackControls();
}

document.querySelectorAll('[data-attack]').forEach(button => {
  button.addEventListener('click', () => startBossAttack(button.dataset.attack));
});

document.querySelectorAll('[data-character]').forEach(button => {
  // Development-only selection; the future game character picker is not built yet.
  button.addEventListener('click', () => switchCharacter(button.dataset.character));
});

document.querySelectorAll('[data-direction]').forEach(button => {
  // Pointer capture lets touch and mouse controls release outside the button.
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    heldDirections.set(`pointer-${event.pointerId}`, button.dataset.direction);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(type, event => {
      heldDirections.delete(`pointer-${event.pointerId}`);
    });
  }
});

/** Combine held inputs into eight directions; opposite inputs cancel each other. */
function getMovementDirection() {
  let x = 0;
  let y = 0;
  // A held W and ArrowUp count as one direction rather than double speed.
  for (const direction of new Set(heldDirections.values())) {
    const vector = directionVectors[direction];
    x += vector[0];
    y += vector[1];
  }
  x = Math.sign(x);
  y = Math.sign(y);
  return Object.keys(directionVectors).find(direction => {
    const vector = directionVectors[direction];
    return vector[0] === x && vector[1] === y;
  });
}

/** Stop at walls without relocating a player already outside after switching maps. */
function constrainWithoutTeleport(previous, next, minimum, maximum) {
  if (previous < minimum) return Math.min(minimum, Math.max(previous, next));
  if (previous > maximum) return Math.max(maximum, Math.min(previous, next));
  return Math.max(minimum, Math.min(maximum, next));
}

/** Move within canvas bounds, keeping diagonal and cardinal movement equally fast. */
function updateCharacter(character, delta, direction, chaseTarget) {
  if (character.attack) {
    character.attack.elapsed += delta * 1000;
    const attack = character.attacks[character.attack.name];
    const frames = character.layout.columnEdges.length - 1;
    if (character.attack.elapsed >= frames * attack.frameDuration) {
      const walkElapsed = character.attack.walkElapsed;
      beginPoseTransition(character);
      character.attack = null;
      character.elapsed = walkElapsed;
      updateAttackControls();
    } else {
      return;
    }
  }
  character.moving = Boolean(direction);
  if (!direction) {
    character.elapsed = 0;
    return;
  }

  // Arona turns at the current stride phase rather than snapping to frame zero.
  if (character.direction !== direction && !character.preserveWalkPhase) {
    character.elapsed = 0;
  }
  character.direction = direction;
  if (character.horizontalFacingOnly) {
    const horizontal = directionVectors[direction][0];
    if (horizontal) {
      const facing = horizontal > 0 ? 'right' : 'left';
      if (facing !== character.facing) beginPoseTransition(character);
      character.facing = facing;
    }
  }
  character.elapsed += delta * 1000;
  // Chase uses the precise center-to-center vector; facing stays eight-way.
  const [x, y] = chaseTarget
    ? [chaseTarget.x - character.x, chaseTarget.y - character.y]
    : directionVectors[direction];
  const length = Math.hypot(x, y);
  const step = movementSpeed * (character.movementSpeedMultiplier || 1) * delta;
  const distance = (chaseTarget ? Math.min(step, length) : step) / (length || 1);
  const previousX = character.x;
  const previousY = character.y;
  character.x += x * distance;
  character.y += y * distance;
  if (chaseTarget && step >= length) {
    character.x = chaseTarget.x;
    character.y = chaseTarget.y;
  }
  if (currentMap === 'fourth') {
    const resolved = resolveIslandMotion(character, previousX, previousY, character.x, character.y, maps.fourth);
    character.x = resolved.x;
    character.y = resolved.y;
    return;
  }
  if (maps[currentMap].axis === 'both') {
    const resolved = resolveObstacleMotion(character, previousX, previousY, character.x, character.y);
    character.x = resolved.x;
    character.y = resolved.y;
    return;
  }
  // Test enemies can reach the player's center even when their larger sprite
  // would hit a viewport edge first. Player movement retains map wall limits.
  if (chaseTarget && character !== characters[selected]) return;
  // Neither map's locked-axis limits should interrupt diagonal input while the
  // backgrounds are changing. Apply destination walls only after the ripple.
  // Existing outside positions are preserved by constrainWithoutTeleport below.
  if (mapTransition?.active) return;
  const margin = (character.spriteSize || spriteSize) / 2;
  // X is an unbounded world position, not a canvas position. Never wrap it:
  // future enemy positions must remain stable when background tiles disappear.
  if (maps[currentMap].axis === 'horizontal') {
    const top = camera.y + topMovementPadding + margin;
    const bottom = camera.y + canvas.height - margin - bottomMovementPadding;
    // Off-screen NPCs must not teleport into the new viewport after a map switch.
    if (previousY >= top && previousY <= bottom) {
      character.y = Math.max(top, Math.min(bottom, character.y));
    }
  } else {
    const map = maps[currentMap];
    const player = character === characters[selected];
    const left = camera.x + canvas.width * (player ? map.leftWallRatio : 0) + margin;
    const right = camera.x + canvas.width * (player ? map.rightWallRatio : 1) - margin;
    if (player) {
      // Preserve position on map switch even if already outside the corridor.
      // Permit movement back inside, but never farther into/through the walls.
      character.x = constrainWithoutTeleport(previousX, character.x, left, right);
    } else if (previousX >= left && previousX <= right) {
      character.x = Math.max(left, Math.min(right, character.x));
    }
  }
}

/** Apply contact displacement through the same solid map collision as walking. */
function moveNpcBy(character, dx, dy) {
  const targetX = character.x + dx, targetY = character.y + dy;
  let result = { x: targetX, y: targetY };
  if (currentMap === 'fourth') {
    result = resolveIslandMotion(character, character.x, character.y, targetX, targetY, maps.fourth);
  } else if (currentMap === 'third') {
    result = resolveObstacleMotion(character, character.x, character.y, targetX, targetY);
  }
  character.x = result.x;
  character.y = result.y;
}

/** Return a source rectangle using the sheet's uneven per-column row boundaries. */
function getFrameRectangle(character, frame) {
  const facing = character.horizontalFacingOnly ? character.facing : character.direction;
  const row = character.attack
    ? character.attacks[character.attack.name].rows[character.attack.facing]
    : !character.moving && character.idleRows?.[facing] !== undefined
    ? character.idleRows[facing]
    : character.rows[facing];
  // Attack artwork can exceed the grid cell. Custom rectangles keep the tank's
  // anchor fixed even when a muzzle flash needs a wider crop.
  const custom = character.layout.frames?.[row]?.[frame];
  if (custom) return custom;
  const { columnEdges, rowEdges } = character.layout;
  return {
    x: columnEdges[frame],
    y: rowEdges[frame][row],
    width: columnEdges[frame + 1] - columnEdges[frame],
    height: rowEdges[frame][row + 1] - rowEdges[frame][row],
    footY: character.layout.footY?.[frame]?.[row] ?? rowEdges[frame][row + 1]
  };
}

/** Select a direction-specific walking cycle, or hold frame zero when idle. */
function getAnimationFrame(character) {
  if (character.attack) {
    const attack = character.attacks[character.attack.name];
    return Math.min(character.layout.columnEdges.length - 2,
      Math.floor(character.attack.elapsed / attack.frameDuration));
  }
  if (!character.moving) return 0;
  const frames = character.walkFrames?.[character.direction] ||
    character.frameSequence || [1, 2, 3, 4];
  const duration = character.frameDuration || frameDuration;
  return frames[Math.floor(character.elapsed / duration) % frames.length];
}

/** Blend from the last visible pose without moving the character's world anchor. */
function beginPoseTransition(character) {
  if (character.transitionDuration && character.lastPose) {
    character.transition = { from: character.lastPose, elapsed: 0 };
  }
}

/** Render one pose with shared scale and measured foot anchors, including effects. */
function drawPose(character, pose, opacity) {
  opacity *= character.death?.opacity ?? 1;
  const crop = pose.crop;
  const displaySize = character.spriteSize || spriteSize;
  const scale = (displaySize - spritePadding * 2) / (character.referenceSize || 215);
  const width = crop.width * scale;
  const height = crop.height * scale;
  const drawY = displaySize / 2 - spritePadding - (crop.footY - crop.y) * scale;
  const drawX = crop.anchorX === undefined ? -width / 2 : -(crop.anchorX - crop.x) * scale;
  context.save();
  context.globalAlpha = opacity;
  context.translate(character.x - camera.x, character.y - camera.y);
  if (pose.mirrored) context.scale(-1, 1);
  context.drawImage(character.image, crop.x, crop.y, crop.width, crop.height,
    drawX, drawY, width, height);
  const flash = character.death
    ? 0.95 * Math.min(1, character.death.elapsed / 0.035)
    : getDamageFlashOpacity(character);
  if (flash > 0) {
    context.globalAlpha = opacity * flash;
    context.drawImage(getWhiteSprite(character.image), crop.x, crop.y, crop.width, crop.height,
      drawX, drawY, width, height);
    context.globalAlpha = opacity;
  }
  if (showSpriteBounds) {
    context.strokeStyle = '#e54b93';
    context.strokeRect(drawX, drawY, width, height);
  }
  context.restore();
}

/** Draw animation poses with a short blend when entering/leaving boss actions. */
function drawCharacter(character) {
  if (character.death && character.lastPose && !character.animationFrames) {
    drawPose(character, character.lastPose, 1);
    return;
  }
  if (character.animationFrames) {
    const frame = character.animationFrames[gifFrameAt(character.animationFrames, character.gifElapsed || 0)];
    const image = frame.image;
    drawPose({ ...character, image }, {
      crop: { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight, footY: image.naturalHeight },
      mirrored: character.facing === 'right'
    }, 1);
    if (currentMap === 'fourth') drawTowerOcclusion(context, character, maps.fourth, camera);
    return;
  }
  const pose = {
    crop: getFrameRectangle(character, getAnimationFrame(character)),
    mirrored: character.mirroredDirections?.includes(character.direction)
  };
  const transition = character.transition;
  if (transition) {
    const progress = Math.min(1, transition.elapsed / character.transitionDuration);
    drawPose(character, transition.from, 1 - progress);
    drawPose(character, pose, progress);
    if (progress === 1) character.transition = null;
  } else {
    drawPose(character, pose, 1);
  }
  character.lastPose = pose;
  if (currentMap === 'fourth') drawTowerOcclusion(context, character, maps.fourth, camera);
}

/** Update and render only the active avatar; the inactive character stays hidden. */
function animate(time) {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  mapAudio?.update(delta);
  playerStatsTools?.update();
  advanceDamageFlash(characters[selected], delta);
  hud?.update(characters[selected]);
  const direction = getMovementDirection();
  const activeCharacter = characters[selected];
  if (activeCharacter.animationFrames) activeCharacter.gifElapsed = (activeCharacter.gifElapsed || 0) + delta * 1000;
  if (activeCharacter.transition) activeCharacter.transition.elapsed += delta * 1000;
  const playerBefore = { x: activeCharacter.x, y: activeCharacter.y };
  updateCharacter(activeCharacter, delta, direction);
  const playerMotion = { x: activeCharacter.x - playerBefore.x, y: activeCharacter.y - playerBefore.y };
  updateCamera(delta);
  npcTools?.update(delta, playerMotion);
  expPickups?.update(activeCharacter, playerBefore);
  hud?.update(activeCharacter);
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayarea();
  mapTransition?.draw(context, delta);
  if (currentMap === 'fourth' && showSpriteBounds) drawIsland(context, maps.fourth, camera, true);
  if (currentMap === 'third' && showSpriteBounds) {
    context.save();
    context.strokeStyle = '#ffcf60';
    for (const box of obstaclesIn(camera.x, camera.y, camera.x + canvas.width, camera.y + canvas.height)) {
      context.strokeRect(box.left - camera.x, box.top - camera.y, box.right - box.left, box.bottom - box.top);
    }
    context.restore();
  }
  expPickups?.draw(context, camera, canvas.width, canvas.height);
  npcTools?.draw(context);
  drawCharacter(activeCharacter);
  const facing = activeCharacter.horizontalFacingOnly
    ? activeCharacter.facing : activeCharacter.direction;
  aiming?.draw(context, activeCharacter, camera.x, directionVectors[facing], camera.y);
  document.querySelector('#switch-map').disabled = Boolean(mapTransition?.active);

  const action = activeCharacter.attack
    ? activeCharacter.attacks[activeCharacter.attack.name].label
    : direction || 'idle';
  const description = `${activeCharacter.label} / ${action} / camera X ${Math.round(camera.x)} / Y ${Math.round(camera.y)} / ${maps[currentMap].label}`;
  if (status.textContent !== description) status.textContent = description;
  requestAnimationFrame(animate);
}

// Start the preview only for the authorized development account.
if (authorized) {
  Promise.all([...Object.values(characters), ...Object.values(maps).filter(map => map.source), ...maps.third.tiles].map(loadSheet).concat(aiming.ready, expPickups.ready))
    .then(() => {
      observeViewport(canvas, () => {
        mapTransition?.cancel();
        // Resize the view, never entity coordinates, sprite sizes, or map 3/4 scale.
        updateCamera();
      });
      resetScene();
      updateAttackControls();
      setupSpriteTester(characters, switchCharacter);
      mapAudio = createMapAudio(currentMap);
      Object.values(characters).forEach(ensurePlayerStats);
      hud = createHud(getFrameRectangle);
      playerStatsTools = createPlayerStatsTools(() => characters[selected], character => hud.update(character));
      hud.update(characters[selected]);
      npcTools = createNpcTools({ canvas, characters, camera,
        getPlayer: () => characters[selected],
        isVertical: () => maps[currentMap].axis === 'vertical',
        isFreeScroll: () => currentMap === 'third' || currentMap === 'fourth',
        isPlacementClear: (character, x, y) => currentMap === 'fourth'
          ? canStandOnIsland(character, x, y, maps.fourth)
          : currentMap !== 'third' || canStand(character, x, y),
        updateCharacter, drawCharacter, moveNpcBy });
      requestAnimationFrame(animate);
    })
    .catch(error => { status.textContent = error.message; });
}
