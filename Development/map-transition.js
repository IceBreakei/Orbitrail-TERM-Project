/** Radial stagger plus checkerboard parity gives each tile its own shrink phase. */
export function shrinkProgress(elapsed, column, row, columns, rows) {
  const radius = Math.hypot(column - (columns - 1) / 2, row - (rows - 1) / 2);
  const delay = radius * 45 + ((column + row) % 2) * 55;
  return Math.max(0, Math.min(1, (elapsed - delay) / 420));
}

/** Capture the old background and shrink its tiles away in a checker ripple. */
export function createMapTransition(canvas) {
  let oldScreen;
  let elapsed = 0;
  let renderOldBackground;
  const columns = 12; // EDIT checkerboard density.
  const rows = 7;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Snapshot a rendered frame once, rather than allocating images every tick. */
  function snapshot() {
    const image = document.createElement('canvas');
    image.width = canvas.width;
    image.height = canvas.height;
    image.getContext('2d').drawImage(canvas, 0, 0);
    return image;
  }

  /** Capture the old background after it is drawn without entities or UI. */
  function begin(renderBackground) {
    if (oldScreen) return false;
    oldScreen = snapshot();
    renderOldBackground = renderBackground;
    elapsed = 0;
    return true;
  }

  /** Shrink old-map squares over the new background; entities/UI are drawn afterward. */
  function draw(context, delta) {
    if (!oldScreen) return;
    elapsed += delta * 1000;
    if (reducedMotion || elapsed >= 900) {
      oldScreen = null;
      renderOldBackground = null;
      return;
    }
    // Reuse one surface, but repaint the outgoing map at the LIVE camera origin.
    // A frozen snapshot would make characters slide over stationary scenery.
    if (renderOldBackground) {
      const layer = oldScreen.getContext('2d');
      layer.clearRect(0, 0, canvas.width, canvas.height);
      renderOldBackground(layer);
    }
    context.save();
    // The new background is already drawn beneath us; leave the gaps transparent.
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const p = shrinkProgress(elapsed, column, row, columns, rows);
        const x = Math.round(column * canvas.width / columns);
        const y = Math.round(row * canvas.height / rows);
        const width = Math.round((column + 1) * canvas.width / columns) - x;
        const height = Math.round((row + 1) * canvas.height / rows) - y;
        const scale = 1 - p * p * (3 - 2 * p); // Smoothly shrink from full size to zero.
        if (scale <= 0) continue;
        context.save();
        context.translate(x + width / 2, y + height / 2);
        context.scale(scale, scale);
        context.drawImage(oldScreen,
          x, y, width, height, -width / 2, -height / 2, width, height);
        context.restore();
      }
    }
    context.restore();
  }

  /** Discard viewport-sized imagery when the screen is resized. */
  function cancel() {
    oldScreen = null;
    renderOldBackground = null;
  }
  return { begin, draw, cancel, get active() { return Boolean(oldScreen); } };
}
