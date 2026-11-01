/** Keep one world/canvas pixel equal to one displayed CSS pixel on any screen. */
export function observeViewport(canvas, onResize = () => {}) {
  function resize() {
    const rectangle = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rectangle.width));
    const height = Math.max(1, Math.round(rectangle.height));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    onResize();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  return observer;
}
