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
const showSpriteBounds = false; // Set true to see the rendered frame rectangle.

// Source crop boundaries are editable in sprite-layouts.js. Do not enlarge the
// canvas to fix source clipping: adjust that frame's row/column edges instead.
const directionVectors = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
  upLeft: [-1, -1], upRight: [1, -1],
  downLeft: [-1, 1], downRight: [1, 1]
};
let selected = 'plana';
let previousTime;

// EDIT rows to change which source row is used for each direction (0 = top).
// Use mirroredDirections when a sheet contains duplicate left-facing poses
// instead of a usable right-facing row. This also avoids malformed source rows.
const characters = {
  plana: {
    label: 'Plana',
    source: '../sprites/Plana Sprite Sheet.png',
    rows: { down: 0, downLeft: 1, left: 2, upLeft: 3, up: 4, upRight: 5, right: 6, downRight: 7 },
    layout: spriteLayouts.plana,
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

document.querySelectorAll('[data-character]').forEach(button => {
  // Switch only the controlled character; both characters stay visible.
  button.addEventListener('click', () => {
    selected = button.dataset.character;
    releaseControls();
    document.querySelectorAll('[data-character]').forEach(option => {
      option.setAttribute('aria-pressed', String(option === button));
    });
  });
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
  character.x = Math.max(margin, Math.min(canvas.width - margin, character.x));
  character.y = Math.max(margin, Math.min(canvas.height - margin - 25, character.y));
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

/** Draw the entire measured frame without stretching, with optional crop debugging. */
function drawCharacter(character) {
  const frame = character.moving
    ? 1 + Math.floor(character.elapsed / frameDuration) % (frameCount - 1)
    : 0;
  const crop = getFrameRectangle(character, frame);
  const scale = (spriteSize - spritePadding * 2) / 215;
  const width = crop.width * scale;
  const height = crop.height * scale;

  context.save();
  context.translate(character.x, character.y);
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

  context.font = '14px system-ui';
  context.textAlign = 'center';
  context.fillStyle = character === characters[selected] ? '#087fba' : '#526f87';
  context.fillText(character.label, character.x, character.y + spriteSize / 2 + 18);
}

/** Render both characters every frame using the combined held movement inputs. */
function animate(time) {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time;
  const direction = getMovementDirection();
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const [name, character] of Object.entries(characters)) {
    updateCharacter(character, delta, name === selected ? direction : undefined);
    drawCharacter(character);
  }

  const description = `${characters[selected].label} / ${direction || 'idle'}`;
  if (status.textContent !== description) status.textContent = description;
  requestAnimationFrame(animate);
}

// Start the preview only for the authorized development account.
if (authorized) {
  Promise.all(Object.values(characters).map(loadSheet))
    .then(() => requestAnimationFrame(animate))
    .catch(error => { status.textContent = error.message; });
}
