/** Center the reference 1280x720 game area in a dark surround, preserving the session. */
export function setupFullscreenPreview(canvas, releaseControls) {
  const enter = document.querySelector('#enter-fullscreen-preview');
  const exit = document.querySelector('#exit-fullscreen-preview');
  const layout = document.querySelector('.playtest-layout');
  const main = document.querySelector('#development-content');
  const sidebar = document.querySelector('.playtest-sidebar');
  let active = false;
  let previousInert = [];

  /** Resize via CSS/ResizeObserver; never scale actors or reset world positions. */
  function setFullscreen(enabled) {
    if (active === enabled) return;
    active = enabled;
    releaseControls();
    document.body.classList.toggle('fullscreen-preview', active);
    enter.setAttribute('aria-pressed', String(active));
    exit.hidden = !active;
    if (active) {
      // Background admin controls should not receive hidden keyboard focus.
      const controls = [...main.children].filter(element => element !== layout).concat(sidebar);
      previousInert = controls.map(element => [element, element.inert]);
      for (const [element] of previousInert) element.inert = true;
      canvas.focus({ preventScroll: true });
    } else {
      for (const [element, inert] of previousInert) element.inert = inert;
      previousInert = [];
      enter.focus({ preventScroll: true });
    }
  }

  enter.addEventListener('click', () => setFullscreen(true));
  exit.addEventListener('click', () => setFullscreen(false));
}
