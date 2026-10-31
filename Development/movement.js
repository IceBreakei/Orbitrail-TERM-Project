import { requireAdmin } from './admin-guard.js';
import { spriteLayouts } from './sprite-layouts.js';
import { setupSpriteTester } from './sprite-tester.js';

const authorized = await requireAdmin();
const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const heldDirections = new Map();
// EDIT THESE VALUES to tune animation speed and the rendered sprite area.
const frameDuration = 110; // Milliseconds per walking frame; lower is faster.
const spriteSize = 130; // Display size in canvas pixels, not source crop size.
const movementSpeed = 180; // Canvas pixels per second, including diagonals.
const spritePadding = 8; // Empty display space around the full source frame.
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

// EDIT rows to change which source row is used for each direction (0 = top).
// Use mirroredDirections when a sheet contains duplicate left-facing poses
// instead of a usable right-facing row. This also avoids malformed source rows.
const characters = {
  plana: {
    label: 'Plana',
    movementSpeedMultiplier: 1 / 0.75, // NPC base speed is 75% of player speed (240 px/s).
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
    movementSpeedMultiplier: 1 / 0.75, // NPC base speed is 75% of player speed (240 px/s).
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
  iroha: {
    label: 'Iroha Boss',
    source: '../sprites/Iroha Tank Sprite Animation Sheet.png',
    // Updated 1448 x 1086 sheet: 181-pixel cells; rows 0/1 are movement;
    // rows 2/3 are cannon attacks; rows 4/5 are flag-wave artillery attacks.
    rows: { left: 0, right: 1, down: 0, downLeft: 0, upLeft: 0, up: 0, upRight: 1, downRight: 1 },
    horizontalFacingOnly: true, // Move in eight directions; render only left/right poses.
    facing: 'left', // Vertical movement keeps the last horizontal facing.
    defaultDirection: 'left',
    spriteSize: 260, // EDIT boss display size; normal characters use 130 pixels.
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
const playarea = { source: '../sprites/Playarea.png', image: null };
let backgroundTileWidth = canvas.width;

/** Reset character positions and horizontal camera without changing sprite settings. */
function resetScene() {
  releaseControls();
  for (const character of Object.values(characters)) {
    character.x = canvas.width * 0.4;
    character.y = canvas.height * 0.6;
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
function updateCamera() {
  camera.x = characters[selected].x - canvas.width / 2;
  camera.y = 0;
}

/** Compute only visible tile indices, including negative indices left of origin. */
function getVisibleTileRange(cameraX, viewportWidth, tileWidth) {
  return {
    first: Math.floor(cameraX / tileWidth),
    last: Math.ceil((cameraX + viewportWidth) / tileWidth) - 1
  };
}

/** Render a bounded number of tiles from one shared image, however far we travel. */
function drawPlayarea() {
  const { first, last } = getVisibleTileRange(camera.x, canvas.width, backgroundTileWidth);
  for (let tile = first; tile <= last; tile++) {
    // Round shared edges rather than tile widths to avoid subpixel gaps.
    const left = Math.round(tile * backgroundTileWidth - camera.x);
    const right = Math.round((tile + 1) * backgroundTileWidth - camera.x);
    context.drawImage(playarea.image, left, 0, right - left, canvas.height);
  }
}

// These controls live OUTSIDE the simulated screen, never over gameplay.
document.querySelector('#reset-scene').addEventListener('click', resetScene);
document.querySelector('#toggle-bounds').addEventListener('click', event => {
  showSpriteBounds = !showSpriteBounds;
  event.currentTarget.setAttribute('aria-pressed', String(showSpriteBounds));
});
document.querySelector('#admin-tools').addEventListener('click', event => {
  const panel = document.querySelector('#admin-panel');
  panel.hidden = !panel.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
});

/** Load a sheet before animation begins and report an actionable loading error. */
function loadSheet(character) {
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

/** Move within canvas bounds, keeping diagonal and cardinal movement equally fast. */
function updateCharacter(character, delta, direction) {
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
  const [x, y] = directionVectors[direction];
  const distance = movementSpeed * (character.movementSpeedMultiplier || 1) *
    delta / Math.hypot(x, y);
  character.x += x * distance;
  character.y += y * distance;
  const margin = (character.spriteSize || spriteSize) / 2;
  // X is an unbounded world position, not a canvas position. Never wrap it:
  // future enemy positions must remain stable when background tiles disappear.
  character.y = Math.max(topMovementPadding + margin,
    Math.min(canvas.height - margin - bottomMovementPadding, character.y));
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
  const crop = pose.crop;
  const displaySize = character.spriteSize || spriteSize;
  const scale = (displaySize - spritePadding * 2) / (character.referenceSize || 215);
  const width = crop.width * scale;
  const height = crop.height * scale;
  const drawY = displaySize / 2 - spritePadding - (crop.footY - crop.y) * scale;
  const drawX = crop.anchorX === undefined ? -width / 2 : -(crop.anchorX - crop.x) * scale;
  context.save();
  context.globalAlpha = opacity;
  context.translate(character.x - camera.x, character.y);
  if (pose.mirrored) context.scale(-1, 1);
  context.drawImage(character.image, crop.x, crop.y, crop.width, crop.height,
    drawX, drawY, width, height);
  if (showSpriteBounds) {
    context.strokeStyle = '#e54b93';
    context.strokeRect(drawX, drawY, width, height);
  }
  context.restore();
}

/** Draw animation poses with a short blend when entering/leaving boss actions. */
function drawCharacter(character) {
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
}

/** Update and render only the active avatar; the inactive character stays hidden. */
function animate(time) {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  const direction = getMovementDirection();
  const activeCharacter = characters[selected];
  if (activeCharacter.transition) activeCharacter.transition.elapsed += delta * 1000;
  updateCharacter(activeCharacter, delta, direction);
  updateCamera();
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayarea();
  drawCharacter(activeCharacter);

  const action = activeCharacter.attack
    ? activeCharacter.attacks[activeCharacter.attack.name].label
    : direction || 'idle';
  const description = `${activeCharacter.label} / ${action} / camera X ${Math.round(camera.x)} / Y locked`;
  if (status.textContent !== description) status.textContent = description;
  requestAnimationFrame(animate);
}

// Start the preview only for the authorized development account.
if (authorized) {
  Promise.all([...Object.values(characters), playarea].map(loadSheet))
    .then(() => {
      backgroundTileWidth = playarea.image.naturalWidth * canvas.height / playarea.image.naturalHeight;
      resetScene();
      updateAttackControls();
      setupSpriteTester(characters, switchCharacter);
      requestAnimationFrame(animate);
    })
    .catch(error => { status.textContent = error.message; });
}
