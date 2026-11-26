import { createBitmapText } from './bitmap-font.js';
import { survivalTimerSettings } from './game-config.js';

/** Format active survival time as MM:SS, allowing minutes beyond 59. */
export function formatSurvivalTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Track a run across map/character switches, pausing with gameplay and ending on death. */
export function createSurvivalClock() {
  let seconds = 0, ended = false;
  return {
    get seconds() { return seconds; },
    advance(delta, paused = false, alive = true) {
      if (paused) return;
      if (!alive) ended = true;
      if (!ended && Number.isFinite(delta)) seconds += Math.max(0, delta);
    }
  };
}

/** Draw survival time at the screen's top center, below the EXP bar. */
export function createSurvivalDisplay() {
  const canvas = document.createElement('canvas');
  const text = createBitmapText(canvas, { scale: survivalTimerSettings.fontScale });
  const expBar = document.querySelector('#hud-exp');
  return {
    draw(context, seconds, width, height) {
      text.setText(formatSurvivalTime(seconds));
      const x = Math.max(0, (width - canvas.width) / 2);
      // Read the HUD height so changing the EXP bar also moves the timer.
      const y = Math.max(0, Math.min(height - canvas.height,
        (expBar?.offsetHeight ?? 32) + survivalTimerSettings.offsetBelowExp));
      context.save();
      context.imageSmoothingEnabled = false;
      context.drawImage(canvas, x, y);
      context.restore();
    }
  };
}
