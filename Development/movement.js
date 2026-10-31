import { requireAdmin } from './admin-guard.js';
import { spriteLayouts } from './sprite-layouts.js';

const authorized = await requireAdmin();
const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
const status = document.querySelector('#status');
const heldDirections = new Map();
const frameCount = 5;
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
// Playable characters are Plana and Arona. Mob remains an admin-only test avatar.
let selected = 'plana';
let previousTime;

// EDIT rows to change which source row is used for each direction (0 = top).
// Use mirroredDirections when a sheet contains duplicate left-facing poses
// instead of a usable right-facing row. This also avoids malformed source rows.
const characters = {
  plana: {
    label: 'Plana',
    source: '../sprites/Plana Sprite Sheet.png',
    // Plana's stronger down-left stride is row 2; the true side profile is row 3.
    rows: { down: 0, downLeft: 2, left: 3, upLeft: 3, up: 4, upRight: 5, right: 6, downRight: 7 },
    // EDIT these frame indices to tune individual walk cycles. Include frame 0:
    // it provides the neutral leg pose between this sheet's similar stride poses.
    walkFrames: {
      downLeft: [0, 1, 2, 3, 4],
      left: [0, 1, 2, 3, 4]
    },
    layout: spriteLayouts.plana,
    x: 310, y: 260, direction: 'down', elapsed: 0, moving: false
  },
  arona: {
    label: 'Arona',
    source: '../sprites/Arona Sprite Sheet.png',
    // This sheet has its own margin, cell size, and left-facing right-side poses.
    rows: { down: 0, downLeft: 1, left: 2, upLeft: 3, up: 4, upRight: 5, right: 6, downRight: 7 },
    mirroredDirections: ['upRight', 'right', 'downRight'],
    layout: spriteLayouts.arona,
    // EDIT referenceSize for this sheet's display scale without altering crops.
    referenceSize: 190,
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
    character.direction = 'down';
    character.elapsed = 0;
    character.moving = false;
  }
  camera.x = 0;
  camera.y = 0;
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
  next.elapsed = 0;
  next.moving = false;
  previous.elapsed = 0;
  previous.moving = false;
  selected = name;
  releaseControls();
  updateCamera();

  document.querySelectorAll('[data-character]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.character === selected));
  });
}

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
  character.moving = Boolean(direction);
  if (!direction) {
    character.elapsed = 0;
    return;
  }

  if (character.direction !== direction) character.elapsed = 0;
  character.direction = direction;
  character.elapsed += delta * 1000;
  const [x, y] = directionVectors[direction];
  const distance = movementSpeed * delta / Math.hypot(x, y);
  character.x += x * distance;
  character.y += y * distance;
  const margin = spriteSize / 2;
  // X is an unbounded world position, not a canvas position. Never wrap it:
  // future enemy positions must remain stable when background tiles disappear.
  character.y = Math.max(topMovementPadding + margin,
    Math.min(canvas.height - margin - bottomMovementPadding, character.y));
}

/** Return a source rectangle using the sheet's uneven per-column row boundaries. */
function getFrameRectangle(character, frame) {
  const row = character.rows[character.direction];
  const { columnEdges, rowEdges } = character.layout;
  return {
    x: columnEdges[frame],
    y: rowEdges[frame][row],
    width: columnEdges[frame + 1] - columnEdges[frame],
    height: rowEdges[frame][row + 1] - rowEdges[frame][row]
  };
}

/** Select a direction-specific walking cycle, or hold frame zero when idle. */
function getAnimationFrame(character) {
  if (!character.moving) return 0;
  const frames = character.walkFrames?.[character.direction] || [1, 2, 3, 4];
  return frames[Math.floor(character.elapsed / frameDuration) % frames.length];
}

/** Draw the entire measured frame without stretching, with optional crop debugging. */
function drawCharacter(character) {
  const frame = getAnimationFrame(character);
  const crop = getFrameRectangle(character, frame);
  const scale = (spriteSize - spritePadding * 2) / (character.referenceSize || 215);
  const width = crop.width * scale;
  const height = crop.height * scale;

  context.save();
  context.translate(character.x - camera.x, character.y);
  if (character.mirroredDirections?.includes(character.direction)) {
    context.scale(-1, 1);
  }
  context.drawImage(
    character.image,
    crop.x, crop.y, crop.width, crop.height,
    -width / 2, spriteSize / 2 - spritePadding - height, width, height
  );
  if (showSpriteBounds) {
    context.strokeStyle = '#e54b93';
    context.strokeRect(-width / 2, spriteSize / 2 - spritePadding - height, width, height);
  }
  context.restore();

}

/** Update and render only the active avatar; the inactive character stays hidden. */
function animate(time) {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  const direction = getMovementDirection();
  const activeCharacter = characters[selected];
  updateCharacter(activeCharacter, delta, direction);
  updateCamera();
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayarea();
  drawCharacter(activeCharacter);

  const description = `${characters[selected].label} / ${direction || 'idle'} / camera X ${Math.round(camera.x)} / Y locked`;
  if (status.textContent !== description) status.textContent = description;
  requestAnimationFrame(animate);
}

// Start the preview only for the authorized development account.
if (authorized) {
  Promise.all([...Object.values(characters), playarea].map(loadSheet))
    .then(() => {
      backgroundTileWidth = playarea.image.naturalWidth * canvas.height / playarea.image.naturalHeight;
      resetScene();
      requestAnimationFrame(animate);
    })
    .catch(error => { status.textContent = error.message; });
}
