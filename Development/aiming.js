import { normalSpriteSize } from './scene-metrics.js';
/** Convert browser pointer coordinates to internal canvas pixels after CSS scaling. */
export function pointerToCanvas(clientX, clientY, rectangle, width, height) {
  return {
    x: (clientX - rectangle.left) * width / rectangle.width,
    y: (clientY - rectangle.top) * height / rectangle.height
  };
}

/** Load the supplied aiming artwork without changing project image files. */
function loadAimImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${source}.`));
    image.src = source;
  });
}

/** Manage independent arrow visibility and click-to-toggle cursor aiming. */
export function createAiming(canvas) {
  const toggle = document.querySelector('#toggle-arrow');
  const modeLabel = document.querySelector('#aim-mode');
  const state = { visible: true, cursorAim: false, directionalOverride: false, inside: false, pointer: { x: 0, y: 0 } };
  let arrow;
  let crosshair;

  // EDIT these values to tune the aiming sprites in internal canvas pixels.
  const arrowWidth = 24.36; // Another 30% smaller than 34.8 pixels.
  const arrowHeight = 13.02; // Preserve proportions at the reduced size.
  const crosshairSize = 75.712; // 30% larger than the previous 58.24 pixels.
  const arrowDistanceMultiplier = 0.9; // Extra clearance below the player sprite.
  const ready = Promise.all([
    loadAimImage('../sprites/arrow.png'),
    loadAimImage('../sprites/crosshair.png')
  ]).then(images => { [arrow, crosshair] = images; });

  /** Keep UI and native cursor in sync with the selected aiming mode. */
  function updateControls() {
    toggle.setAttribute('aria-pressed', String(state.visible));
    toggle.textContent = state.visible ? 'Arrow: shown' : 'Arrow: hidden';
    modeLabel.textContent = state.cursorAim && !state.directionalOverride ? 'Aim: crosshair' : 'Aim: character facing';
    canvas.style.cursor = state.cursorAim && !state.directionalOverride && state.inside ? 'none' : 'default';
  }

  /** Track the pointer in screen space, so camera scrolling cannot offset aiming. */
  function trackPointer(event) {
    state.pointer = pointerToCanvas(event.clientX, event.clientY,
      canvas.getBoundingClientRect(), canvas.width, canvas.height);
    state.inside = true;
    updateControls();
  }

  toggle.addEventListener('click', () => {
    state.visible = !state.visible;
    updateControls();
  });
  canvas.addEventListener('pointermove', trackPointer);
  canvas.addEventListener('pointerenter', trackPointer);
  canvas.addEventListener('pointerleave', () => {
    state.inside = false;
    updateControls();
  });
  canvas.addEventListener('click', event => {
    if (event.button !== 0) return;
    trackPointer(event);
    state.cursorAim = !state.cursorAim;
    updateControls();
  });

  /** Share the exact arrow angle with attacks, including cursor aiming. */
  function getAngle(character, cameraX, vector, cameraY = 0) {
    const x = character.x - cameraX;
    const y = character.y - cameraY;
    let dx = vector[0];
    let dy = vector[1];
    if (state.cursorAim && !state.directionalOverride) {
      dx = state.pointer.x - x;
      dy = state.pointer.y - y;
      // Preserve facing if the cursor is precisely on the character anchor.
      if (dx === 0 && dy === 0) [dx, dy] = vector;
    }
    return Math.atan2(dy, dx);
  }

  /** Draw an upward-native arrow rotated toward facing or the custom cursor. */
  function draw(context, character, cameraX, vector, cameraY = 0) {
    if (!arrow || !crosshair) return;
    const x = character.x - cameraX;
    const y = character.y - cameraY;
    const angle = getAngle(character, cameraX, vector, cameraY);
    if (state.visible) {
      const distance = ((character.spriteSize || normalSpriteSize) / 2 + 25) * arrowDistanceMultiplier;
      context.save();
      context.translate(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance);
      context.rotate(angle + Math.PI / 2);
      context.drawImage(arrow, -arrowWidth / 2, -arrowHeight / 2, arrowWidth, arrowHeight);
      context.restore();
    }
    if (state.cursorAim && !state.directionalOverride && state.inside) {
      context.drawImage(crosshair,
        state.pointer.x - crosshairSize / 2, state.pointer.y - crosshairSize / 2,
        crosshairSize, crosshairSize);
    }
  }

  /** Return to facing-based aiming without overriding the visibility preference. */
  function reset() {
    state.cursorAim = false;
    updateControls();
  }

  updateControls();
  return { ready, draw, reset, state, getAngle, trackPointer,
    setPointerInside(inside) { state.inside = inside; updateControls(); },
    setDirectionalOverride(enabled) { state.directionalOverride = Boolean(enabled); updateControls(); }
  };
}
